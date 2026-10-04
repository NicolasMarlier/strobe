import { DmxLoop } from "../dmx_loop"
import { MIDI_MODES, MidiRouter } from "../midi_router"
import { handle, sendToAllWindows } from "./ipc-router"
import { signal } from "../telemetry"

// macOS' virtual MIDI buses, named after the IAC driver in the system's language: how MainStage talks to Strobe
const IAC_PREFIX = /^(Gestionnaire IAC|IAC Driver)\s+/

let midi_router: MidiRouter | undefined

// The Interfaces section shows a device's MIDI signal at most this often: a tempo clock alone
// sends dozens of messages per second, which would saturate it
const MIDI_ACTIVITY_INTERVAL_MS = 400

// Shown in the Interfaces section. Registered right away: the window can ask before the router starts
const midiInputNames = () => midi_router?.inputNames() ?? []
handle('interfaces:midi_inputs', async () => midiInputNames())

export const initMidiRouter = () => {
    midi_router = new MidiRouter()

    // Plugged or unplugged devices (the router scans every second)
    const sendMidiInputs = () => sendToAllWindows('interfaces:midi_inputs_changed', midiInputNames())
    midi_router.on('connected', sendMidiInputs)
    midi_router.on('connected', (name: string) => { if (IAC_PREFIX.test(name)) signal('Strobe.mainStageConnected') })
    midi_router.on('disconnected', sendMidiInputs)

    // Which device is sending, for the Interfaces section to light it up (at most every MIDI_ACTIVITY_INTERVAL_MS)
    const lastActivityAt = new Map<string, number>()
    midi_router.onMessage(({ device, status }) => {
        // Sent all the time by some devices to say they're alive: not a signal
        if (status == MIDI_MODES.MIDI_ACTIVE_SENSING) return
        const now = Date.now()
        if (now - (lastActivityAt.get(device) ?? 0) < MIDI_ACTIVITY_INTERVAL_MS) return
        lastActivityAt.set(device, now)
        sendToAllWindows('interfaces:midi_activity', device)
    })
    
    // MIDI Program Change messages select the track
    midi_router.on('programchange', (e) => {
        const trackId = e.data1 + 1
        DmxLoop.getInstance().switchTrack(trackId)
    })
    midi_router.on('noteon', (e) => {
        const midiKey = e.data1
        DmxLoop.getInstance().triggerDmxButtonsByMidiKey(midiKey)

        sendToAllWindows('midi:note_on', {
            midi: midiKey,
            mock: false
        })
    })
    
    midi_router.on('clock', () => {
        DmxLoop.getInstance().dmxMidiHandler.receiveClock()
    })
    midi_router.on('midistart', () => {
        DmxLoop.getInstance().dmxMidiHandler.play()
        signal('Strobe.playbackStarted')
    })
    midi_router.on('midistop', () => {
        DmxLoop.getInstance().dmxMidiHandler.stop()
    })
    midi_router.startListenning()
}