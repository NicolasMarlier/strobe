import { describe, expect, it } from 'vitest'
import { newShowData } from './new_show'

describe('new show', () => {
    it('has one track, one 8-dot LED bar and a white Boom button lighting the whole bar', () => {
        const show = newShowData()

        expect(show.tracks).toEqual([{ id: 1, name: 'My track', bpm: 85, audio_filename: null }])
        expect(show.dmx_midis).toEqual([{ track_id: 1, midi_patterns: [] }])
        expect(show.dmx_scene).toEqual({ led_bars: [{ channel: 1, rgb_dots_count: 8, position: [0, 1.5, -1], rotation: [0, 0, 0] }] })

        expect(show.dmx_buttons).toHaveLength(1)
        expect(show.dmx_buttons[0]).toMatchObject({
            track_id: 1,
            color: '#ffffff',
            nature: 'Boom',
            red_channels: [1, 4, 7, 10, 13, 16, 19, 22],
        })
    })

    it('gives each new show its own button id', () => {
        expect(newShowData().dmx_buttons[0].id).not.toEqual(newShowData().dmx_buttons[0].id)
    })
})
