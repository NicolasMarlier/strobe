import { app, BrowserWindow, dialog } from "electron"
import path from "path"
import { Store, STORE_EVENTS } from "../store/Store"
import fs from "fs"
import os from "os"
import { audioDir, readShow, SHOW_EXTENSION, writeShow } from "./show_file"
import { newShowData } from "./new_show"
import { addRecentShow, describeRecentShow, listRecentShows, removeRecentShow } from "./recent_shows"
import { signal } from "../telemetry"
import { devWorktree } from "../init/dev_worktree"

const APP_NAME = 'STROBE'

// Whether a show is open. A new show is open but lives in memory until it's saved
let isShowOpen = false

// Folder of the show currently open, null while a new show hasn't been saved yet
let currentShowDir: string | null = null

// The show an unsaved show was opened from (the example show), where its audio stays until it's saved
let templateDir: string | null = null

// Whether the store has changes that are not saved in currentShowDir
let dirty = false

// The audio files imported since the last save, and those the last save left out (an undo may bring them back).
// Saving moves them into the show: until then, a show that isn't saved keeps its audio as it was
let pendingDir: string | null = null

export const pendingAudioDir = () => {
    pendingDir ??= fs.mkdtempSync(path.join(os.tmpdir(), 'strobe-audio-'))
    return pendingDir
}

const discardPendingAudio = () => {
    if (pendingDir) fs.rmSync(pendingDir, { recursive: true, force: true })
    pendingDir = null
}
app.on('will-quit', discardPendingAudio)

// Where the open show's audio is read from, first one first
export const audioDirs = () => {
    const dir = currentShowDir ?? templateDir
    return [pendingDir, dir && audioDir(dir)]
}

const showName = () => {
    const dir = currentShowDir ?? templateDir
    return dir ? path.basename(dir, SHOW_EXTENSION) : 'Untitled'
}

export const updateWindowTitle = (win: BrowserWindow) => {
    // Run from source, the branch too: which worktree's window it is
    const branch = devWorktree ? ` [${devWorktree.branch}]` : ''
    // On the Welcome screen, before any show is open, no "Untitled": just the app's name
    const show = isShowOpen ? `${showName()}${dirty ? ' •' : ''} — ` : ''
    win.setTitle(`${show}${APP_NAME}${branch}`)
    win.setRepresentedFilename(currentShowDir ?? '')
    win.setDocumentEdited(dirty)
}

const setDirty = (value: boolean) => {
    const changed = dirty != value
    dirty = value
    BrowserWindow.getAllWindows().forEach(win => {
        updateWindowTitle(win)
        // The store changes many times per edit: only tell the UI when it flips
        if (changed) win.webContents.send('show:dirty', dirty)
    })
}

Store.getInstance().on(STORE_EVENTS.CHANGED, () => setDirty(true))

// Set when the user quits, so a window close we interrupt can resume the quit
let isQuitting = false
app.on('before-quit', () => { isQuitting = true })

// Returns whether the action succeeded
const withErrorBox = (title: string, action: () => void) => {
    try {
        action()
        return true
    } catch (e) {
        dialog.showErrorBox(title, (e as Error).message)
        return false
    }
}

// Asks what to do with unsaved changes. Returns whether the caller may go on and discard the current show.
const confirmDiscardChanges = async(win: BrowserWindow) => {
    if (!dirty) return true

    const { response } = await dialog.showMessageBox(win, {
        type: 'warning',
        message: `Do you want to save the changes made to "${showName()}"?`,
        detail: "Your changes will be lost if you don't save them.",
        buttons: ['Save', "Don't Save", 'Cancel'],
        defaultId: 0,
        cancelId: 2,
    })
    if (response == 0) return saveShow(win)
    return response == 1
}

// Before the app quits by itself (to install an update): what to do with unsaved changes, asked once.
// Returns whether it may quit
export const confirmQuit = async(win: BrowserWindow) => {
    if (!await confirmDiscardChanges(win)) return false
    // Saved or discarded: closing the window won't ask again
    dirty = false
    return true
}

// Asks before closing the window (or quitting the app) with unsaved changes
export const guardWindowClose = (win: BrowserWindow) => {
    let allowClose = false

    win.on('close', async(e) => {
        if (allowClose || !dirty) return

        e.preventDefault()
        const quitting = isQuitting
        isQuitting = false

        if (await confirmDiscardChanges(win)) {
            allowClose = true
            // Preventing the close also cancelled the quit, so resume it
            quitting ? app.quit() : win.close()
        }
    })
}

// Without a window (the show to start with), the window is yet to load the show.
// A show opened from a template (the example) is unsaved: its first save asks where, and copies its audio along
const startShow = (win: BrowserWindow | null, data: ShowData, dir: string | null, template: string | null = null) => {
    Store.getInstance().load(data)
    discardPendingAudio()
    isShowOpen = true
    currentShowDir = dir
    templateDir = template
    if (dir) addRecentShow(dir)
    setDirty(false)
    // Start the UI from a clean state on the new show's data
    win?.webContents.reload()
}

const loadShow = (win: BrowserWindow | null, dir: string) =>
    withErrorBox('Could not open show', () => {
        startShow(win, readShow(dir), dir)
        signal('Strobe.showOpened')
    })

// The show opened from the Finder that launched the app: loaded before the window is created
export const loadShowAtLaunch = (dir: string) => loadShow(null, dir)

// A show opened from the Finder (double-clicked, dropped on the Dock icon) while the app runs
export const openShowFromFinder = async(win: BrowserWindow, dir: string) => {
    // Still hidden behind the splash, it shows once loaded
    if (win.isVisible()) win.focus()
    if (currentShowDir && path.resolve(dir) == path.resolve(currentShowDir)) return
    if (!await confirmDiscardChanges(win)) return

    loadShow(win, dir)
}

export const showState = (): ShowState => ({
    isOpen: isShowOpen,
    isDirty: dirty,
    recentShows: listRecentShows().map(describeRecentShow),
})

const showDialogFilters = [{ name: 'Strobe Show', extensions: [SHOW_EXTENSION.slice(1)] }]

const askShowDir = async(win: BrowserWindow, title: string, defaultName: string) => {
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title,
        defaultPath: `${defaultName}${SHOW_EXTENSION}`,
        filters: showDialogFilters,
    })
    if (canceled || !filePath) return null
    return filePath.endsWith(SHOW_EXTENSION) ? filePath : `${filePath}${SHOW_EXTENSION}`
}

// Opens a new show, kept in memory until it's saved
export const newShow = async(win: BrowserWindow) => {
    if (!await confirmDiscardChanges(win)) return

    startShow(win, newShowData(), null)
}

// The example show, bundled with the app: a track of maad avenue with its buttons, MIDI and scene
const exampleShowDir = () => app.isPackaged
    ? path.join(process.resourcesPath, 'Example.strobe')
    : path.join(app.getAppPath(), 'assets', 'Example.strobe')

// Opens a copy of the example show, so the bundled one stays untouched: saving it asks where
export const openExampleShow = async(win: BrowserWindow) => {
    if (!await confirmDiscardChanges(win)) return

    const dir = exampleShowDir()
    withErrorBox('Could not open the example show', () => {
        startShow(win, readShow(dir), null, dir)
        signal('Strobe.exampleShowOpened')
    })
}

export const openShow = async(win: BrowserWindow) => {
    if (!await confirmDiscardChanges(win)) return

    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        title: 'Open Show',
        properties: ['openFile', 'openDirectory'],
        filters: showDialogFilters,
    })
    if (canceled || !filePaths[0]) return

    loadShow(win, filePaths[0])
}

// Removes a show from the recent shows (the show itself is left untouched)
export const forgetRecentShow = (dir: string): RecentShow[] => {
    removeRecentShow(dir)
    return listRecentShows().map(describeRecentShow)
}

export const openRecentShow = async(win: BrowserWindow, dir: string) => {
    if (!fs.existsSync(dir)) {
        dialog.showErrorBox('Could not open show', `${dir} no longer exists.`)
        removeRecentShow(dir)
        return
    }
    if (!await confirmDiscardChanges(win)) return

    loadShow(win, dir)
}

// Save and Save As only apply to an open show: without one there is nothing to edit
export const saveShow = async(win: BrowserWindow): Promise<boolean> => {
    if (!isShowOpen) return false
    // A new show is saved for the first time: ask where
    if (!currentShowDir) return saveShowAs(win)

    const dir = currentShowDir
    return withErrorBox('Could not save show', () => {
        writeShow(dir, Store.getInstance().toData(), dir, pendingDir)
        setDirty(false)
    })
}

export const saveShowAs = async(win: BrowserWindow): Promise<boolean> => {
    if (!isShowOpen) return false

    const dir = await askShowDir(win, 'Save Show As', showName())
    if (!dir) return false

    return withErrorBox('Could not save show', () => {
        writeShow(dir, Store.getInstance().toData(), currentShowDir ?? templateDir, pendingDir)
        currentShowDir = dir
        templateDir = null
        addRecentShow(dir)
        setDirty(false)
    })
}
