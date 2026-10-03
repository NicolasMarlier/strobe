import { DMX_LOOP_EVENTS, DmxLoop } from "../dmx_loop";
import { EnttecOpenDMXUSB } from "../enttec_open_dmx_usb";
import { sendToAllWindows } from "./ipc-router";
import { signal } from "../telemetry";

export const initDmxLoop = () => {
    DmxLoop.getInstance().on(DMX_LOOP_EVENTS.TICK, (dmx_hex_signal) => {
        EnttecOpenDMXUSB.getInstance().setDmxHex(dmx_hex_signal)
        if (EnttecOpenDMXUSB.getInstance().state() == 'Connected') signal('Strobe.dmxInterfaceConnected')

        sendToAllWindows('dmx', {
            enttecOpenDMXUSB: {
                state: EnttecOpenDMXUSB.getInstance().state()
            },
            dmxHexSignal: EnttecOpenDMXUSB.getInstance().dmxHexString,
            midiCurrentTick: DmxLoop.getInstance().dmxMidiHandler.currentTick,
            activeDmxButtonIds: DmxLoop.getInstance().activeDmxButtonIds(),
        })
    })

    DmxLoop.getInstance().on(DMX_LOOP_EVENTS.TRACK_CHANGE, (track_id: number) => {
        sendToAllWindows('track:change', track_id)
        DmxLoop.getInstance().dmxMidiHandler.stop({reset: true})
    });

    DmxLoop.getInstance().on(DMX_LOOP_EVENTS.MOCK_MIDI_INPUT, (midi_note_midi: MidiKey) => {
        sendToAllWindows('midi:note_on', {
            midi: midi_note_midi,
            mock: true
        })
    })

    DmxLoop.getInstance().start()
}
