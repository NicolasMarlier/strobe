import { randomUUID } from "crypto"
import { cellChannels, centerPosition, LED_BAR } from "../../shared/fixtures"

const LED_BAR_ELEMENT: SceneElement = {
    fixture: LED_BAR.id,
    channel: 1,
    cells: LED_BAR.cells,
    position: centerPosition(LED_BAR),
    rotation: [0, 0, 0],
}

// What a new show starts with: one track, one 8-dot LED bar, and a white Boom button lighting the whole bar
export const newShowData = (): ShowData => ({
    tracks: [{ id: 1, name: 'My track', bpm: 85, audio_filename: null }],
    dmx_buttons: [{
        id: randomUUID(),
        track_id: 1,
        color: '#ffffff',
        duration_ms: 500,
        red_channels: cellChannels(LED_BAR_ELEMENT, LED_BAR),
        nature: 'Boom',
        triggering_midi_key: 36,
    }],
    dmx_midis: [{ track_id: 1, midi_patterns: [] }],
    dmx_scene: { elements: [LED_BAR_ELEMENT] },
})
