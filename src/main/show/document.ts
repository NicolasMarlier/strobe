import { app, BrowserWindow, dialog } from "electron"
import path from "path"
import { Store, STORE_EVENTS } from "../store/Store"
import fs from "fs"
import { audioDir, readShow, SHOW_EXTENSION, writeShow } from "./show_file"
import { addRecentShow, describeRecentShow, listRecentShows, removeRecentShow } from "./recent_shows"

const APP_NAME = 'DMX CONTROL'

// Folder of the show currently open, null until the show is opened or saved
let currentShowDir: string | null = null

// Whether the store has changes that are not saved in currentShowDir
let dirty = false

export const currentAudioDir = () => currentShowDir && audioDir(currentShowDir)

const showName = () => currentShowDir ? path.basename(currentShowDir, SHOW_EXTENSION) : 'Untitled'

export const updateWindowTitle = (win: BrowserWindow) => {
    win.setTitle(`${showName()}${dirty ? ' •' : ''} — ${APP_NAME}`)
    win.setRepresentedFilename(currentShowDir ?? '')
    win.setDocumentEdited(dirty)
}

const setDirty = (value: boolean) => {
    dirty = value
    BrowserWindow.getAllWindows().forEach(updateWindowTitle)
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

const loadShow = (win: BrowserWindow, dir: string) =>
    withErrorBox('Could not open show', () => {
        Store.getInstance().load(readShow(dir))
        currentShowDir = dir
        addRecentShow(dir)
        setDirty(false)
        // Start the UI from a clean state on the new show's data
        win.webContents.reload()
    })

export const showState = (): ShowState => ({
    isOpen: currentShowDir != null,
    recentShows: listRecentShows().map(describeRecentShow),
})

const showDialogFilters = [{ name: 'DMX Show', extensions: [SHOW_EXTENSION.slice(1)] }]

const askShowDir = async(win: BrowserWindow, title: string, defaultName: string) => {
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title,
        defaultPath: `${defaultName}${SHOW_EXTENSION}`,
        filters: showDialogFilters,
    })
    if (canceled || !filePath) return null
    return filePath.endsWith(SHOW_EXTENSION) ? filePath : `${filePath}${SHOW_EXTENSION}`
}

// Creates an empty show where the user chooses, then opens it
export const newShow = async(win: BrowserWindow) => {
    if (!await confirmDiscardChanges(win)) return

    const dir = await askShowDir(win, 'New Show', 'Untitled')
    if (!dir) return

    const created = withErrorBox('Could not create show', () =>
        writeShow(dir, { programs: [], dmx_buttons: [], dmx_midis: [] }, null)
    )
    if (created) loadShow(win, dir)
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
export const saveShow = async(_win: BrowserWindow): Promise<boolean> => {
    if (!currentShowDir) return false

    const dir = currentShowDir
    return withErrorBox('Could not save show', () => {
        writeShow(dir, Store.getInstance().toData(), dir)
        setDirty(false)
    })
}

export const saveShowAs = async(win: BrowserWindow): Promise<boolean> => {
    if (!currentShowDir) return false

    const dir = await askShowDir(win, 'Save Show As', showName())
    if (!dir) return false

    return withErrorBox('Could not save show', () => {
        writeShow(dir, Store.getInstance().toData(), currentShowDir)
        currentShowDir = dir
        addRecentShow(dir)
        setDirty(false)
    })
}
