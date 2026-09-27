import { DmxLoop } from "../dmx_loop"
import { MidiRouter } from "../midi_router"
import { sendToAllWindows } from "./ipc-router"

export const initMidiRouter = () => {
    const midi_router = new MidiRouter() 
    
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
    midi_router.on('midistart', () => DmxLoop.getInstance().dmxMidiHandler.play())
    midi_router.on('midistop', () => {
        DmxLoop.getInstance().dmxMidiHandler.stop()
    })
    midi_router.startListenning()
}