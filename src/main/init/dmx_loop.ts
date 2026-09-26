import { DMX_LOOP_EVENTS, DmxLoop } from "../dmx_loop";
import { EnttecOpenDMXUSB } from "../enttec_open_dmx_usb";
import { sendToAllWindows } from "./ipc-router";

export const initDmxLoop = () => {
    DmxLoop.getInstance().on(DMX_LOOP_EVENTS.TICK, (dmx_hex_signal) => {
        EnttecOpenDMXUSB.getInstance().setDmxHex(dmx_hex_signal)

        sendToAllWindows('dmx', {
            enttecOpenDMXUSB: {
                state: EnttecOpenDMXUSB.getInstance().state()
            },
            dmxHexSignal: EnttecOpenDMXUSB.getInstance().dmxHexString,
            midiCurrentTick: DmxLoop.getInstance().dmxMidiHandler.currentTick
        })
    })

    DmxLoop.getInstance().on(DMX_LOOP_EVENTS.PROGRAM_CHANGE, (program_id: number) => {
        console.log("YOYYO")
        sendToAllWindows('program:change', program_id)
        DmxLoop.getInstance().dmxMidiHandler.stop({reset: true})
    });

    DmxLoop.getInstance().on(DMX_LOOP_EVENTS.MOCK_MIDI_INPUT, (midi_note_midi: MidiKey) => {
        sendToAllWindows('midi:note_on', {
            midi: midi_note_midi
        })
    })

    DmxLoop.getInstance().start()
}
