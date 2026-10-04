import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import { audioDir, readShow } from './show_file'
import { BUILT_IN_FIXTURES } from '../../shared/fixtures'

// The example show bundled with the app (see openExampleShow)
const dir = path.join(__dirname, '../../../assets/Example.strobe')

describe('example show', () => {
    const show = readShow(dir)

    it('has the audio of each track', () => {
        const files = fs.readdirSync(audioDir(dir))
        for (const track of show.tracks) {
            expect(track.audio_filename).not.toBeNull()
            expect(files.some(f => f.startsWith(`track_${track.audio_id ?? track.id}.`))).toBe(true)
        }
    })

    it('only uses built-in fixtures', () => {
        const ids = BUILT_IN_FIXTURES.map(f => f.id)
        for (const element of show.dmx_scene.elements) expect(ids).toContain(element.fixture)
    })

    it('plays buttons that exist', () => {
        const keys = new Set(show.dmx_buttons.map(b => b.triggering_midi_key))
        const played = show.dmx_midis.flatMap(m => m.midi_patterns.flatMap(p => p.midi_notes.map(n => n.midi)))
        expect(played.length).toBeGreaterThan(0)
        for (const midi of played) expect(keys).toContain(midi)
    })
})
