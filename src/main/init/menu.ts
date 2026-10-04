import { BaseWindow, BrowserWindow, Menu, MenuItemConstructorOptions, shell } from "electron"
import { FixtureLibrary } from "../fixture_library"
import { newShow, openRecentShow, openShow, saveShow, saveShowAs } from "../show/document"
import { clearRecentShows, describeRecentShow, listRecentShows, onRecentShowsChange } from "../show/recent_shows"
import { sendToAllWindows } from "./ipc-router"
import { isTelemetryEnabled, setTelemetryEnabled } from "../telemetry"

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

// Space and Return stay the renderer's: registered by the menu, they would also fire while typing in a
// text field. The menu only shows them
const PLAYBACK_ITEM_IDS = ['playback-toggle', 'playback-rewind']
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
        // The standard app menu, plus whether to share the anonymous usage statistics (see telemetry.ts)
        ...(process.platform == 'darwin' ? [{
            role: 'appMenu',
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                {
                    label: 'Share Anonymous Usage Statistics',
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
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' },
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
            ],
        },
        { role: 'viewMenu' },
        { role: 'windowMenu' },
    ]
    Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

export const initMenu = () => {
    buildMenu()
    onRecentShowsChange(buildMenu)
}
