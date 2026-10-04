import { BaseWindow, BrowserWindow, Menu, MenuItemConstructorOptions, shell } from "electron"
import { FixtureLibrary } from "../fixture_library"
import { newShow, openExampleShow, openRecentShow, openShow, saveShow, saveShowAs } from "../show/document"
import { clearRecentShows, describeRecentShow, listRecentShows, onRecentShowsChange } from "../show/recent_shows"
import { sendToAllWindows } from "./ipc-router"
import { isTelemetryEnabled, setTelemetryEnabled } from "../telemetry"
import { checkForUpdatesByUser, onUpdateStateChange, restartToInstallUpdate, updateState } from "../auto_update"

// Menu callbacks receive the focused window, which is always our BrowserWindow
const onWindow = (action: (win: BrowserWindow) => void) =>
    (_item: unknown, win: BaseWindow | undefined) => {
        if (win instanceof BrowserWindow) action(win)
    }

const openFixturesFolder = () => {
    const dir = FixtureLibrary.getInstance().folder()
    if (dir) shell.openPath(dir)
}

const openRecentSubmenu = (): MenuItemConstructorOptions[] => {
    const dirs = listRecentShows()
    if (dirs.length == 0) return [{ label: 'No Recent Shows', enabled: false }]

    return [
        ...dirs.map(describeRecentShow).map(({ dir, name, folder }): MenuItemConstructorOptions => ({
            label: name,
            sublabel: folder,
            click: onWindow((win) => openRecentShow(win, dir)),
        })),
        { type: 'separator' },
        { label: 'Clear Menu', click: clearRecentShows },
    ]
}

// Strobe › Check for Updates…, or once a version is downloaded, the way to install it now (see auto_update.ts)
const updateItem = (): MenuItemConstructorOptions => {
    const state = updateState()
    switch (state.status) {
        case 'checking': return { label: 'Checking for Updates…', enabled: false }
        case 'downloading': return { label: 'Downloading Update…', enabled: false }
        case 'ready': return { label: `Restart to Install Strobe ${state.version}`, click: restartToInstallUpdate }
        default: return { label: 'Check for Updates…', click: checkForUpdatesByUser }
    }
}

// Every keyboard shortcut of the app is in this menu, to be found. The window handles the keys without a
// modifier first (Space, Return, the arrows, T, J, L, Backspace), and takes them; on macOS, those it leaves
// come here (registerAccelerator only works on Linux and Windows), so a key typed in a text field lands here too,
// and the window ignores it. The keys with Cmd come straight here
const PLAYBACK_ITEM_IDS = ['playback-toggle', 'playback-rewind', 'playback-back', 'playback-forward']
let playbackDrivenByMidi = false

// While MainStage drives playback, the Playback menu is greyed out, like the transport's buttons
export const setPlaybackDrivenByMidi = (driven: boolean) => {
    if (driven == playbackDrivenByMidi) return
    playbackDrivenByMidi = driven
    for (const id of PLAYBACK_ITEM_IDS) {
        const item = Menu.getApplicationMenu()?.getMenuItemById(id)
        if (item) item.enabled = !driven
    }
}

const buildMenu = () => {
    const template: MenuItemConstructorOptions[] = [
        // The standard app menu, plus the updates, and whether to share the anonymous usage statistics and the
        // crash reports (see telemetry.ts and crash_reports.ts)
        ...(process.platform == 'darwin' ? [{
            role: 'appMenu',
            submenu: [
                { role: 'about' },
                updateItem(),
                { type: 'separator' },
                {
                    label: 'Share Anonymous Usage Statistics and Crash Reports',
                    type: 'checkbox',
                    checked: isTelemetryEnabled(),
                    click: (item) => setTelemetryEnabled(item.checked),
                },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' },
            ],
        } as MenuItemConstructorOptions] : []),
        {
            label: 'File',
            submenu: [
                { label: 'New Show', accelerator: 'CmdOrCtrl+N', click: onWindow(newShow) },
                { label: 'Open Show…', accelerator: 'CmdOrCtrl+O', click: onWindow(openShow) },
                { label: 'Open Recent', submenu: openRecentSubmenu() },
                { label: 'Open Example Show', click: onWindow(openExampleShow) },
                { type: 'separator' },
                { label: 'Save', accelerator: 'CmdOrCtrl+S', click: onWindow(saveShow) },
                { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: onWindow(saveShowAs) },
                { type: 'separator' },
                // Where to add fixtures, as JSON files: they show up in the scene's elements right away
                { label: 'Open Fixtures Folder', click: openFixturesFolder },
                { type: 'separator' },
                { role: 'close' },
            ],
        },
        {
            // The standard Edit menu, but Undo and Redo go to the renderer: they undo a text field's typing,
            // or else the show's last change (see useEditMenu)
            label: 'Edit',
            submenu: [
                { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => sendToAllWindows('edit:undo', null) },
                { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', click: () => sendToAllWindows('edit:redo', null) },
                { type: 'separator' },
                { role: 'cut' },
                // A text field's, or else the selected patterns or notes (see useEditMenu)
                { label: 'Copy', accelerator: 'CmdOrCtrl+C', click: () => sendToAllWindows('edit:copy', null) },
                { label: 'Paste', accelerator: 'CmdOrCtrl+V', click: () => sendToAllWindows('edit:paste', null) },
                {
                    label: 'Delete', accelerator: 'Backspace', registerAccelerator: false,
                    click: () => sendToAllWindows('edit:delete', null),
                },
                { label: 'Select All', accelerator: 'CmdOrCtrl+A', click: () => sendToAllWindows('edit:selectAll', null) },
            ],
        },
        {
            // The timeline's patterns (TrackEditor)
            label: 'Pattern',
            submenu: [
                {
                    label: 'Split at Cursor', accelerator: 'T', registerAccelerator: false,
                    click: () => sendToAllWindows('pattern:split', null),
                },
                {
                    label: 'Join Selected Patterns', accelerator: 'J', registerAccelerator: false,
                    click: () => sendToAllWindows('pattern:join', null),
                },
                {
                    label: 'Loop / Unloop Selected Patterns', accelerator: 'L', registerAccelerator: false,
                    click: () => sendToAllWindows('pattern:loop', null),
                },
            ],
        },
        {
            label: 'Playback',
            submenu: [
                {
                    id: 'playback-toggle', label: 'Play / Pause', accelerator: 'Space', registerAccelerator: false,
                    enabled: !playbackDrivenByMidi, click: () => sendToAllWindows('playback:toggle', null),
                },
                {
                    id: 'playback-rewind', label: 'Back to Start', accelerator: 'Return', registerAccelerator: false,
                    enabled: !playbackDrivenByMidi, click: () => sendToAllWindows('playback:rewind', null),
                },
                {
                    id: 'playback-back', label: 'Back One Beat', accelerator: 'Left', registerAccelerator: false,
                    enabled: !playbackDrivenByMidi, click: () => sendToAllWindows('playback:back', null),
                },
                {
                    id: 'playback-forward', label: 'Forward One Beat', accelerator: 'Right', registerAccelerator: false,
                    enabled: !playbackDrivenByMidi, click: () => sendToAllWindows('playback:forward', null),
                },
                { type: 'separator' },
                {
                    label: 'Previous Track', accelerator: 'Up', registerAccelerator: false,
                    click: () => sendToAllWindows('tracks:previous', null),
                },
                {
                    label: 'Next Track', accelerator: 'Down', registerAccelerator: false,
                    click: () => sendToAllWindows('tracks:next', null),
                },
            ],
        },
        {
            // The standard View menu, plus the setlist
            label: 'View',
            submenu: [
                { label: 'Show / Hide Setlist', accelerator: 'CmdOrCtrl+\\', click: () => sendToAllWindows('view:toggleSetlist', null) },
                { type: 'separator' },
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
            ],
        },
        { role: 'windowMenu' },
    ]
    Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

export const initMenu = () => {
    buildMenu()
    onRecentShowsChange(buildMenu)
    onUpdateStateChange(buildMenu)
}
