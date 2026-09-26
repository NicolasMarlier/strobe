import { DmxLoop } from "../dmx_loop"
import { MidiRouter } from "../midi_router"
import { sendToAllWindows } from "./ipc-router"

export const initMidiRouter = () => {
    const midi_router = new MidiRouter() 
    
    midi_router.on('programchange', (e) => {
        const programId = e.data1 + 1
        DmxLoop.getInstance().switchProgram(programId)
    })
    midi_router.on('noteon', (e) => {
        const midiKey = e.data1
        const data: WSMidiNoteOnMessage = {
            midi: midiKey
        }
        DmxLoop.getInstance().triggerDmxButtonsByMidiKey(midiKey)
        
        sendToAllWindows('midi:note_on', {
            midi: midiKey
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