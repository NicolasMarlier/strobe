import { randomUUID } from "crypto"

const LED_BAR: LedBarConfig = { channel: 1, rgb_dots_count: 8 }

// Red channel of each RGB dot of a LED bar
const redChannels = ({ channel, rgb_dots_count }: LedBarConfig) =>
    Array.from({ length: rgb_dots_count }, (_, i) => channel + i * 3)

// What a new show starts with: one track, one 8-dot LED bar, and a white Boom button lighting the whole bar
export const newShowData = (): ShowData => ({
    tracks: [{ id: 1, name: 'My track', bpm: 85, audio_filename: null }],
    dmx_buttons: [{
        id: randomUUID(),
        track_id: 1,
        color: '#ffffff',
        duration_ms: 500,
        red_channels: redChannels(LED_BAR),
        nature: 'Boom',
        triggering_midi_key: 36,
    }],
    dmx_midis: [{ track_id: 1, midi_patterns: [] }],
    dmx_scene: { led_bars: [LED_BAR] },
})
