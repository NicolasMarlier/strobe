import EventEmitter from "events"
import { emptyDmxHexString } from "./utils"
import DmxEffect from "./dmx/effects/DmxEffect"
import { getDmxSignalAt } from "./dmx/effects/utils"
import DmxSet from "./dmx/effects/DmxSet"
import DmxBoom from "./dmx/effects/DmxBoom"
import DmxRun from "./dmx/effects/DmxRun"
import DmxToggle from "./dmx/effects/DmxToggle"
import { DmxMidiHandler } from "./dmx_midi_handler"
import DmxInverseRun from "./dmx/effects/DmxInverseRun"
import { Store, STORE_EVENTS } from "./store/Store"

const LOOP_INTERVAL_MS = 20

const DMX_EFFECTS = {
    'Set': DmxSet,
    'Boom': DmxBoom,
    'Run': DmxRun,
    'InverseRun': DmxInverseRun,
    'Toggle': DmxToggle,
}

export const DMX_LOOP_EVENTS = {
    TICK: 'tick',
    TRACK_CHANGE: 'trackchange',
    MIDI_NOTES_UPDATED: 'midinotesupdated',
    MOCK_MIDI_INPUT: 'mockmidiinput'
}
export class DmxLoop extends EventEmitter {
    private static instance: DmxLoop;

    interval: NodeJS.Timeout | undefined
    onLoop: ((now: number) => void) | undefined
    dmxButtons: DmxButton[]
    dmx_buttons_triggered: { [dmx_button_id: string]: DmxButtonTrigger}
    current_track_id: number | undefined
    dmx_hex_signal = emptyDmxHexString()
    dmxMidiHandler: DmxMidiHandler

  
    private constructor(current_track_id: number | undefined, dmxButtons: DmxButton[]) {
        super()
        this.dmxButtons = dmxButtons
        this.dmx_buttons_triggered = {}
        this.current_track_id = current_track_id
        this.dmxMidiHandler = new DmxMidiHandler({
            onMidiKey: (midiKey) => {
                this.triggerDmxButtonsByMidiKey(midiKey, {mock_midi_signal: true}) 
            }
                
        })

        Store.getInstance().on(STORE_EVENTS.CHANGED, () => {
            this.resyncDmxButtons()
            this.reloadMidi()
        })
        Store.getInstance().on(STORE_EVENTS.LOADED, () => {
            this.dmx_buttons_triggered = {}
            this.dmxMidiHandler.stop({reset: true})
            this.current_track_id = undefined
            this.resyncDmxButtons()
            this.reloadMidi()
            this.switchToFirstTrack()
        })
        Store.getInstance().on(STORE_EVENTS.TRACK_RENAMED, (oldId: number, newId: number) => {
            if(this.current_track_id == oldId) this.switchTrack(newId)
        })

        this.switchToFirstTrack()
    }

    switchToFirstTrack = async() => {
        const track = Store.getInstance().listTracks()[0]

        track && this.switchTrack(track.id)
    }

    static getInstance(): DmxLoop {
        if (!DmxLoop.instance) {
            DmxLoop.instance = new DmxLoop(undefined, []);
        }
        return DmxLoop.instance;
    }

    resyncDmxButtons = async() => {
        this.dmxButtons = Store.getInstance().listButtons(this.current_track_id)
    }    

    areDmxButtonChannelsBlack = (dmxButton: DmxButton) => dmxButton.red_channels.every((redChannel) => (
        getDmxSignalAt(this.dmx_hex_signal, redChannel + 0) == 0 &&
        getDmxSignalAt(this.dmx_hex_signal, redChannel + 1) == 0 &&
        getDmxSignalAt(this.dmx_hex_signal, redChannel + 2) == 0
    ))

    nextDmxButtonTrigger = (dmxButton: DmxButton | undefined): DmxButtonTrigger => {
        // Only toggles ever go down, all the other effects always run forward
        if(dmxButton?.nature != 'Toggle') return { at: Date.now(), state: 'up' }

        const previousTrigger = this.dmx_buttons_triggered[dmxButton.id]
        if(!previousTrigger) return {
            at: Date.now(),
            state: this.areDmxButtonChannelsBlack(dmxButton) ? 'up' : 'down'
        }

        // Triggered again while still fading: reverse it, back-dating the trigger so it resumes
        // from the current brightness instead of jumping back to the start
        const previousCompleteness = DmxEffect.computeCompleteness(dmxButton.duration_ms, previousTrigger.at)
        return {
            at: Date.now() - (1 - previousCompleteness) * dmxButton.duration_ms,
            state: previousTrigger.state == 'up' ? 'down' : 'up'
        }
    }

    triggerDmxButton = (dmxButtonId: string, options?: {mock_midi_signal?: boolean}) => {
        const dmxButton = this.dmxButtons.find((dmxButton) => dmxButton.id == dmxButtonId)
        this.dmx_buttons_triggered[dmxButtonId] = this.nextDmxButtonTrigger(dmxButton)
        if(dmxButton?.triggering_midi_key && options?.mock_midi_signal) {
            this.emit(DMX_LOOP_EVENTS.MOCK_MIDI_INPUT, dmxButton.triggering_midi_key)
        }
    }

    triggerDmxButtonsByMidiKey = (midiKey: MidiKey, options?: {mock_midi_signal?: boolean}) => {
        this.dmxButtons.filter((dmxButton) =>
            dmxButton.triggering_midi_key == midiKey
        ).forEach((dmxButton) => {
            this.triggerDmxButton(dmxButton.id, options)
        })
    }

    // Buttons of the current track whose effect is running: they're changing the DMX signal right now.
    // Only the current track's buttons are applied (and detriggered), so the others are left out
    activeDmxButtonIds = () => this.dmxButtons
        .filter((dmxButton) => this.dmx_buttons_triggered[dmxButton.id])
        .map((dmxButton) => dmxButton.id)

    detriggerDmxButton = (dmxButtonId: string) => {
        delete this.dmx_buttons_triggered[dmxButtonId]
    }

    switchTrack = async(track_id: number) => {
        const track = Store.getInstance().findTrack(track_id)
        this.current_track_id = track?.id
        this.resyncDmxButtons()
        this.reloadMidi()
        this.emit(DMX_LOOP_EVENTS.TRACK_CHANGE, this.current_track_id)
    }

    reloadMidi = async() => {
        const dmxMidi = this.current_track_id
            ? Store.getInstance().getOrInitDmxMidi(this.current_track_id)
            : undefined
        this.dmxMidiHandler.setMidiPatterns(dmxMidi?.midi_patterns || [])
    }

    applyDmxButtonToDmxSignal = (dmxButton: DmxButton, dmxHexSignal: string) => {
        const trigger = this.dmx_buttons_triggered[dmxButton.id]
        if(!trigger) return dmxHexSignal

        const dmxEffect = DMX_EFFECTS[dmxButton.nature]

        const completeness = dmxEffect.computeCompleteness(dmxButton.duration_ms, trigger.at)

        const newDmxHexSignal = dmxEffect.transformDmxHexSignal(
            dmxHexSignal,
            completeness,
            dmxButton,
            trigger
        )
        if(completeness >= 1) {
            this.detriggerDmxButton(dmxButton.id)
        }

        return newDmxHexSignal
    }

    applyAllDmxButtonsToDmxSignal = () => {
        return this.dmxButtons.reduce(
            (currentDmxHexSignal, dmxButton) => this.applyDmxButtonToDmxSignal(
                dmxButton,
                currentDmxHexSignal
            ),
            this.dmx_hex_signal
        )
    }


    start = () => {
        this.interval = setInterval(() => {            
            this.dmx_hex_signal = this.applyAllDmxButtonsToDmxSignal()
            this.emit(DMX_LOOP_EVENTS.TICK, this.dmx_hex_signal)
        }, LOOP_INTERVAL_MS);
    }
    
    stop = () => clearInterval(this.interval)
}

