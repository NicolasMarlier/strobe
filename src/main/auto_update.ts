import { app, autoUpdater, BrowserWindow, dialog } from "electron"
import { confirmQuit } from "./show/document"

// Updates, from the GitHub releases: update.electronjs.org (free, for public repos) tells which is the latest,
// and Squirrel.Mac, built into Electron, downloads its ZIP (bin/publish uploads it) in the background.
// Never installed in the middle of a show: the downloaded version replaces this one when Strobe quits, or right away
// from Strobe › Restart to Install Update. Only the released app updates, signed like the update it gets

const FEED = `https://update.electronjs.org/NicolasMarlier/strobe/darwin-${process.arch}/${app.getVersion()}`
// After the launch, out of its way; then a few times a day, for a Strobe left open
const FIRST_CHECK_DELAY = 10 * 1000
const CHECK_INTERVAL = 4 * 60 * 60 * 1000

export type UpdateState =
    | { status: 'idle' }
    | { status: 'checking' }
    | { status: 'downloading' }
    // The version downloaded, installed when Strobe quits
    | { status: 'ready', version: string }

let state: UpdateState = { status: 'idle' }
const listeners: (() => void)[] = []
// Checked from the menu: the user waits for an answer, even "up to date"
let checkedByUser = false

export const updateState = () => state

// The menu shows it (see menu.ts)
export const onUpdateStateChange = (listener: () => void) => listeners.push(listener)

const setState = (value: UpdateState) => {
    state = value
    listeners.forEach(listener => listener())
}

const tellUser = (message: string, detail?: string) => {
    const win = BrowserWindow.getAllWindows()[0]
    const options = { message, detail, buttons: ['OK'] }
    if (win) dialog.showMessageBox(win, options)
    else dialog.showMessageBox(options)
}

// Run from source (yarn start), the stock Electron binary has nothing to update. STROBE_UPDATE_FEED: another feed,
// to try an update on a local build
const canUpdate = () => app.isPackaged || !!process.env.STROBE_UPDATE_FEED

const check = (byUser: boolean) => {
    if (state.status != 'idle') {
        if (byUser && state.status == 'downloading') tellUser('A new version of Strobe is downloading.')
        return
    }
    checkedByUser = byUser
    setState({ status: 'checking' })
    autoUpdater.checkForUpdates()
}

export const checkForUpdatesByUser = () => {
    if (!canUpdate()) return tellUser('Updates only work in the released app.', 'Strobe is running from source.')
    check(true)
}

// From the menu, once a version is downloaded. The unsaved changes, if any, are asked about first
export const restartToInstallUpdate = async() => {
    const win = BrowserWindow.getAllWindows()[0]
    if (state.status != 'ready' || (win && !await confirmQuit(win))) return
    autoUpdater.quitAndInstall()
}

export const initAutoUpdate = () => {
    if (!canUpdate()) return

    autoUpdater.setFeedURL({ url: process.env.STROBE_UPDATE_FEED || FEED })

    autoUpdater.on('update-available', () => {
        setState({ status: 'downloading' })
        if (checkedByUser) {
            tellUser('A new version of Strobe is downloading.', 'It will be installed the next time Strobe starts.')
        }
    })
    autoUpdater.on('update-not-available', () => {
        setState({ status: 'idle' })
        if (checkedByUser) tellUser('Strobe is up to date.', `Version ${app.getVersion()} is the latest.`)
    })
    autoUpdater.on('update-downloaded', (_event, _notes, releaseName) => {
        // The release's name, e.g. "Strobe 0.6.0"
        setState({ status: 'ready', version: releaseName?.replace(/^Strobe\s*/, '') || 'new version' })
    })
    // Offline, the service down, Strobe run from the disk image: a silent check stays silent, and tries again later
    autoUpdater.on('error', (e) => {
        console.error('Update failed', e)
        const failedForUser = checkedByUser && state.status == 'checking'
        setState({ status: 'idle' })
        if (failedForUser) tellUser('Could not check for updates.', e.message)
    })

    setTimeout(() => check(false), FIRST_CHECK_DELAY)
    setInterval(() => check(false), CHECK_INTERVAL)
}
