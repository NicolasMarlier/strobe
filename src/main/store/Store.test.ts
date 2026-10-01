import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Store, STORE_EVENTS } from './Store'
import { InvalidParamError, NotFoundError } from '../controllers/application.controller'

let store: Store

// Global buttons (track_id null) are created for a track, then detached from it
const createGlobalButton = () => {
    const button = store.createButton({ track_id: 1 })
    return store.updateButton(button.id, { track_id: null })
}

beforeEach(() => {
    store = new (Store as any)()
})

describe('tracks', () => {
    it('allocates ids as max + 1, starting at 1', () => {
        expect(store.createTrack({ name: 'A' }).id).toBe(1)
        expect(store.createTrack({ name: 'B' }).id).toBe(2)
        store.updateTrack(2, { id: 31 })
        expect(store.createTrack({ name: 'C' }).id).toBe(32)
    })

    it('creates with defaults and lists by id', () => {
        store.createTrack({ name: 'A', bpm: 120 })
        store.createTrack({ name: 'B' })
        store.updateTrack(1, { id: 10 })
        expect(store.listTracks()).toEqual([
            { id: 2, name: 'B', bpm: 85, audio_filename: null },
            { id: 10, name: 'A', bpm: 120, audio_filename: null },
        ])
    })

    it('updates name and bpm', () => {
        store.createTrack({ name: 'A' })
        store.updateTrack(1, { name: 'B', bpm: 100 })
        expect(store.getTrack(1)).toMatchObject({ name: 'B', bpm: 100 })
    })

    it('throws NotFoundError on unknown ids', () => {
        expect(() => store.getTrack(1)).toThrow(NotFoundError)
        expect(() => store.updateTrack(1, {})).toThrow(NotFoundError)
        expect(() => store.destroyTrack(1)).toThrow(NotFoundError)
        expect(() => store.getOrInitDmxMidi(1)).toThrow(NotFoundError)
        expect(store.findTrack(1)).toBeUndefined()
    })

    it('renaming an id moves its buttons and midi, and emits trackRenamed', () => {
        store.createTrack({ name: 'A' })
        store.createButton({ track_id: 1 })
        store.updateDmxMidi(1, [{ ticks: 0, midi_notes: [], durationTicks: 10 }])
        const renamed = vi.fn()
        store.on(STORE_EVENTS.TRACK_RENAMED, renamed)

        store.updateTrack(1, { id: 31 })

        expect(renamed).toHaveBeenCalledWith(1, 31)
        expect(store.listButtons(31)).toHaveLength(1)
        expect(store.listButtons(1)).toHaveLength(0)
        expect(store.getOrInitDmxMidi(31).midi_patterns).toHaveLength(1)
    })

    it('rejects renaming to an id already in use', () => {
        store.createTrack({ name: 'A' })
        store.createTrack({ name: 'B' })
        expect(() => store.updateTrack(1, { id: 2 })).toThrow(InvalidParamError)
        expect(store.getTrack(1).name).toBe('A')
    })

    it('destroying a track deletes its buttons and midi but keeps global buttons', () => {
        store.createTrack({ name: 'A' })
        store.createButton({ track_id: 1 })
        createGlobalButton()
        store.destroyTrack(1)

        expect(store.listTracks()).toEqual([])
        expect(store.listButtons(1).map(b => b.track_id)).toEqual([null])

        store.createTrack({ name: 'B' })
        expect(store.getOrInitDmxMidi(1).midi_patterns).toEqual([])
    })
})

describe('dmx buttons', () => {
    beforeEach(() => {
        store.createTrack({ name: 'A' })
        store.createTrack({ name: 'B' })
    })

    it('lists the track buttons first, then global ones, in creation order', () => {
        const g1 = createGlobalButton()
        const a1 = store.createButton({ track_id: 1 })
        store.createButton({ track_id: 2 })
        const g2 = createGlobalButton()
        const a2 = store.createButton({ track_id: 1 })

        expect(store.listButtons(1).map(b => b.id)).toEqual([a1.id, a2.id, g1.id, g2.id])
        expect(store.listButtons(undefined).map(b => b.id)).toEqual([g1.id, g2.id])
    })

    it('creates with the former defaults', () => {
        expect(store.createButton({ track_id: 1 })).toMatchObject({
            track_id: 1,
            color: '#fffff',
            duration_ms: 100,
            red_channels: [],
            nature: 'Boom',
            triggering_midi_key: null,
        })
    })

    it('update only overrides given keys, and can clear nullable ones', () => {
        const button = store.createButton({ track_id: 1, triggering_midi_key: 36, color: '#ff0000' })

        store.updateButton(button.id, { duration_ms: 300 })
        expect(store.getButton(button.id)).toMatchObject({ duration_ms: 300, triggering_midi_key: 36, color: '#ff0000' })

        store.updateButton(button.id, { triggering_midi_key: null, track_id: null })
        expect(store.getButton(button.id)).toMatchObject({ triggering_midi_key: null, track_id: null })
    })

    it('destroys buttons and throws NotFoundError on unknown ids', () => {
        const button = store.createButton({ track_id: 1 })
        store.destroyButton(button.id)
        expect(() => store.getButton(button.id)).toThrow(NotFoundError)
        expect(() => store.destroyButton(button.id)).toThrow(NotFoundError)
        expect(() => store.updateButton(button.id, {})).toThrow(NotFoundError)
    })
})

describe('load and toData', () => {
    it('replaces the whole data set and emits loaded', () => {
        store.createTrack({ name: 'Old' })
        const loaded = vi.fn()
        store.on(STORE_EVENTS.LOADED, loaded)

        const data: ShowData = {
            tracks: [{ id: 31, name: 'INTRO', bpm: 70, audio_filename: null }],
            dmx_buttons: [],
            dmx_midis: [{ track_id: 31, midi_patterns: [] }],
            dmx_scene: {
                elements: [{ fixture: 'led-bar', channel: 97, cells: 16, position: [2, 0.5, -3], rotation: [0, 45, 0] }],
                display: { show_grid: true, show_beams: false, zoom: 12 },
            },
        }
        store.load(data)

        expect(loaded).toHaveBeenCalledTimes(1)
        expect(store.toData()).toEqual(data)
        expect(store.getDmxScene()).toEqual(data.dmx_scene)
        expect(store.createTrack({ name: 'Next' }).id).toBe(32)

        // The store does not keep references to the loaded object
        data.tracks[0].name = 'changed'
        expect(store.getTrack(31).name).toBe('INTRO')
    })
})

describe('dmx scene', () => {
    it('replaces the scene and emits changed', () => {
        const changed = vi.fn()
        store.on(STORE_EVENTS.CHANGED, changed)
        const scene: DmxScene = { elements: [{ fixture: 'led-bar', channel: 1, cells: 8, position: [0, 0.05, 0], rotation: [0, 0, 0] }] }

        store.updateDmxScene(scene)
        scene.elements[0].channel = 99

        expect(changed).toHaveBeenCalledTimes(1)
        expect(store.getDmxScene().elements[0].channel).toBe(1)
    })
})

describe('events and isolation', () => {
    it('emits changed on mutations but not on lazy midi init', () => {
        const changed = vi.fn()
        store.on(STORE_EVENTS.CHANGED, changed)

        store.createTrack({ name: 'A' })
        expect(changed).toHaveBeenCalledTimes(1)

        store.getOrInitDmxMidi(1)
        store.listTracks()
        expect(changed).toHaveBeenCalledTimes(1)

        store.updateDmxMidi(1, [])
        expect(changed).toHaveBeenCalledTimes(2)
    })

    it('returns copies that cannot mutate the store', () => {
        store.createTrack({ name: 'A' })
        const button = store.createButton({ track_id: 1, red_channels: [1] })

        store.getTrack(1).name = 'changed'
        store.listButtons(1)[0].red_channels.push(99)
        button.color = '#000000'

        expect(store.getTrack(1).name).toBe('A')
        expect(store.getButton(button.id)).toMatchObject({ red_channels: [1], color: '#fffff' })
    })
})
