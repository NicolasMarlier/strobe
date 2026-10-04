import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { readShow, ShowFileError, writeShow } from './show_file'

let tmp: string

const data: ShowData = {
    tracks: [{ id: 31, name: 'INTRO', bpm: 70, audio_filename: 'intro.mp3' }],
    dmx_buttons: [{
        id: 'b1', track_id: null, color: '#ff0000', duration_ms: 500,
        red_channels: [1, 4], nature: 'Boom', triggering_midi_key: 36,
    }],
    dmx_midis: [{ track_id: 31, midi_patterns: [{ ticks: 0, midi_notes: [], durationTicks: 960 }] }],
    dmx_scene: {
        elements: [
            { fixture: 'led-bar', channel: 1, cells: 8, position: [-1, 1.5, -2], rotation: [0, 90, 15] },
            { fixture: 'fog-machine', channel: 25, cells: 1, position: [2, 0.11, -3], rotation: [0, 0, 0] },
        ],
        display: { show_grid: false, show_beams: true, zoom: 6.5 },
    },
}

const writeAudio = (dir: string, name: string, content: string) => {
    fs.mkdirSync(path.join(dir, 'audio'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'audio', name), content)
}

beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'strobe-')) })
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }))

describe('show files', () => {
    it('round-trips the data', () => {
        const dir = path.join(tmp, 'A.strobe')
        writeShow(dir, data, null)
        expect(readShow(dir)).toEqual(data)
        expect(fs.existsSync(path.join(dir, 'audio'))).toBe(true)
        expect(fs.existsSync(path.join(dir, 'show.json.tmp'))).toBe(false)
    })

    it('gives shows made before the scene existed an empty scene', () => {
        const dir = path.join(tmp, 'Old.strobe')
        fs.mkdirSync(dir)
        const { dmx_scene, ...withoutScene } = data
        fs.writeFileSync(path.join(dir, 'show.json'), JSON.stringify({ format: 'strobe-show', version: 2, ...withoutScene }))
        expect(dmx_scene.elements).not.toEqual([])
        expect(readShow(dir).dmx_scene).toEqual({ elements: [] })

        fs.writeFileSync(path.join(dir, 'show.json'), JSON.stringify({ format: 'strobe-show', version: 3, ...withoutScene, dmx_scene: {} }))
        expect(() => readShow(dir)).toThrow(/elements/)
    })

    it('turns the LED bars of version 2 shows into elements, laying out those placed with CSS', () => {
        const dir = path.join(tmp, 'V2.strobe')
        fs.mkdirSync(dir)
        const { dmx_scene, ...withoutScene } = data
        const legacyBar = { channel: 1, rgb_dots_count: 8, style: { transform: 'rotateY(110deg)', left: '-30%' } }
        fs.writeFileSync(path.join(dir, 'show.json'), JSON.stringify({
            format: 'strobe-show',
            version: 2,
            ...withoutScene,
            dmx_scene: {
                led_bars: [legacyBar, { channel: 25, rgb_dots_count: 16, position: [3, 2, -4], rotation: [0, 90, 0] }],
                display: dmx_scene.display,
            },
        }))

        expect(readShow(dir).dmx_scene).toEqual({
            elements: [
                { fixture: 'led-bar', channel: 1, cells: 8, position: [-2.5, 0.05, -1], rotation: [0, 0, 0] },
                { fixture: 'led-bar', channel: 25, cells: 16, position: [3, 2, -4], rotation: [0, 90, 0] },
            ],
            display: dmx_scene.display,
        })

        fs.writeFileSync(path.join(dir, 'show.json'), JSON.stringify({ format: 'strobe-show', version: 2, ...withoutScene, dmx_scene: {} }))
        expect(() => readShow(dir)).toThrow(/led_bars/)
    })

    it('saving in place keeps the audio', () => {
        const dir = path.join(tmp, 'A.strobe')
        writeShow(dir, data, null)
        writeAudio(dir, 'track_31.mp3', 'intro')
        writeShow(dir, data, dir)
        expect(fs.readFileSync(path.join(dir, 'audio', 'track_31.mp3'), 'utf8')).toBe('intro')
    })

    it('save as copies the audio and replaces the audio of an overwritten show', () => {
        const from = path.join(tmp, 'A.strobe')
        writeShow(from, data, null)
        writeAudio(from, 'track_31.mp3', 'intro')

        const to = path.join(tmp, 'B.strobe')
        writeShow(to, data, null)
        writeAudio(to, 'track_2.wav', 'old show audio')

        writeShow(to, data, from)
        expect(fs.readdirSync(path.join(to, 'audio'))).toEqual(['track_31.mp3'])
        expect(fs.readdirSync(path.join(from, 'audio'))).toEqual(['track_31.mp3'])
    })

    it('refuses to write into a folder that is not a show', () => {
        const dir = path.join(tmp, 'Documents')
        fs.mkdirSync(dir)
        fs.writeFileSync(path.join(dir, 'notes.txt'), 'keep me')
        expect(() => writeShow(dir, data, null)).toThrow(ShowFileError)
        expect(fs.readdirSync(dir)).toEqual(['notes.txt'])
    })

    it('rejects folders and files that are not shows', () => {
        expect(() => readShow(tmp)).toThrow(ShowFileError)

        fs.writeFileSync(path.join(tmp, 'show.json'), '{ nope')
        expect(() => readShow(tmp)).toThrow(/not valid JSON/)

        fs.writeFileSync(path.join(tmp, 'show.json'), JSON.stringify({ ...data, format: 'strobe-show', version: 4 }))
        expect(() => readShow(tmp)).toThrow(/newer version/)

        fs.writeFileSync(path.join(tmp, 'show.json'), JSON.stringify({ programs: [], dmx_buttons: [], dmx_midis: [], format: 'strobe-show', version: 1 }))
        expect(() => readShow(tmp)).toThrow(/older format/)

        fs.writeFileSync(path.join(tmp, 'show.json'), JSON.stringify({ format: 'strobe-show', version: 3 }))
        expect(() => readShow(tmp)).toThrow(/missing/)
    })
})
