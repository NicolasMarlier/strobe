import { app } from "electron"
import crypto from "crypto"
import fs from "fs"
import path from "path"
import TelemetryDeck from "@telemetrydeck/sdk"

// Anonymous usage statistics, sent to TelemetryDeck: how many installs, how many people use Strobe, and which of
// its features. Never a show's or a track's name, nor any of its content (the README's Privacy section lists
// what is sent). Turned off in Strobe › Share Anonymous Usage Statistics and Crash Reports

const TELEMETRYDECK_APP_ID = '4891B7D2-EECB-4F7E-B001-F2DE2A466C5E'

// What happens in a session, sent the first time only: a session says whether a feature is used, not how often
export type UsageSignal =
    | 'Strobe.showOpened'
    | 'Strobe.exampleShowOpened'
    | 'Strobe.playbackStarted'
    | 'Strobe.mainStageConnected'
    | 'Strobe.dmxInterfaceConnected'
    | 'Strobe.narrowWindowUsed'

// The ones the window sends (see telemetry:signal)
export const RENDERER_SIGNALS: UsageSignal[] = ['Strobe.playbackStarted', 'Strobe.narrowWindowUsed']

interface Settings {
    // Random, made on the first launch: tells installs apart, and nothing else (TelemetryDeck hashes it again)
    installId: string
    enabled: boolean
}

const settingsPath = () => path.join(app.getPath('userData'), 'telemetry.json')

let settings: Settings | undefined
let firstLaunch = false
let client: TelemetryDeck | undefined
const sentThisSession = new Set<UsageSignal>()

const writeSettings = () => {
    try {
        // Before the app is ready (see loadSettings), its folder may not be there yet
        fs.mkdirSync(path.dirname(settingsPath()), { recursive: true })
        fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2))
    } catch (e) {
        console.error('Could not save the telemetry settings', e)
    }
}

// The settings, made on the first launch: then, whether it is the first one
const readSettings = (): { settings: Settings, firstLaunch: boolean } => {
    try {
        const saved = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'))
        if (typeof saved.installId == 'string') {
            return { settings: { installId: saved.installId, enabled: saved.enabled !== false }, firstLaunch: false }
        }
    } catch {
        // None yet: the first launch
    }
    return { settings: { installId: crypto.randomUUID(), enabled: true }, firstLaunch: true }
}

// Read on first use, and saved on the first launch: the crash reports need it before the app is ready
const loadSettings = (): Settings => {
    if (!settings) {
        const read = readSettings()
        settings = read.settings
        firstLaunch = read.firstLaunch
        if (firstLaunch) writeSettings()
    }
    return settings
}

// Sent in the background: a failure (offline, the service down) never shows to the user, nor stops the app
const send = (type: string, payload?: Record<string, string | boolean>) => {
    if (!client || !settings?.enabled) return
    client.signal(type, payload)
        // Run from source: what was sent, to check it (packaged, nothing shows)
        .then(response => { if (!app.isPackaged) console.log(`Telemetry: ${type} → ${response.status}`) })
        .catch(e => { if (!app.isPackaged) console.log(`Telemetry: ${type} not sent`, e) })
}

// The crash reports follow it too (see crash_reports.ts)
export const isTelemetryEnabled = () => loadSettings().enabled

export const setTelemetryEnabled = (enabled: boolean) => {
    loadSettings().enabled = enabled
    writeSettings()
}

export const signal = (type: UsageSignal) => {
    if (sentThisSession.has(type)) return
    sentThisSession.add(type)
    send(type)
}

export const initTelemetry = () => {
    const { installId } = loadSettings()

    client = new TelemetryDeck({
        appID: TELEMETRYDECK_APP_ID,
        clientUser: installId,
        sessionID: crypto.randomUUID(),
        // Runs from source (yarn start): only in the dashboard's Test Mode, out of the real numbers
        testMode: !app.isPackaged,
    })

    // TelemetryDeck's own signal names and parameters, which its dashboard reads
    const about = {
        'TelemetryDeck.AppInfo.version': app.getVersion(),
        'TelemetryDeck.Device.operatingSystem': 'macOS',
        'TelemetryDeck.Device.systemVersion': process.getSystemVersion(),
        'TelemetryDeck.Device.architecture': process.arch,
    }
    if (firstLaunch) send('TelemetryDeck.Acquisition.newInstallDetected', about)
    send('TelemetryDeck.Session.started', { ...about, 'Strobe.firstLaunch': firstLaunch })
}
