import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Store, STORE_EVENTS } from './Store'
import { InvalidParamError, NotFoundError } from '../controllers/application.controller'

let store: Store

// Global buttons (program_id null) are created for a program, then detached from it
const createGlobalButton = () => {
    const button = store.createButton({ program_id: 1 })
    return store.updateButton(button.id, { program_id: null })
}

beforeEach(() => {
    store = new (Store as any)()
})

describe('programs', () => {
    it('allocates ids as max + 1, starting at 1', () => {
        expect(store.createProgram({ name: 'A' }).id).toBe(1)
        expect(store.createProgram({ name: 'B' }).id).toBe(2)
        store.updateProgram(2, { id: 31 })
        expect(store.createProgram({ name: 'C' }).id).toBe(32)
    })

    it('creates with defaults and lists by id', () => {
        store.createProgram({ name: 'A', bpm: 120 })
        store.createProgram({ name: 'B' })
        store.updateProgram(1, { id: 10 })
        expect(store.listPrograms()).toEqual([
            { id: 2, name: 'B', bpm: 85, audio_filename: null },
            { id: 10, name: 'A', bpm: 120, audio_filename: null },
        ])
    })

    it('updates name and bpm', () => {
        store.createProgram({ name: 'A' })
        store.updateProgram(1, { name: 'B', bpm: 100 })
        expect(store.getProgram(1)).toMatchObject({ name: 'B', bpm: 100 })
    })

    it('throws NotFoundError on unknown ids', () => {
        expect(() => store.getProgram(1)).toThrow(NotFoundError)
        expect(() => store.updateProgram(1, {})).toThrow(NotFoundError)
        expect(() => store.destroyProgram(1)).toThrow(NotFoundError)
        expect(() => store.getOrInitDmxMidi(1)).toThrow(NotFoundError)
        expect(store.findProgram(1)).toBeUndefined()
    })

    it('renaming an id moves its buttons and midi, and emits programRenamed', () => {
        store.createProgram({ name: 'A' })
        store.createButton({ program_id: 1 })
        store.updateDmxMidi(1, [{ ticks: 0, midi_notes: [], durationTicks: 10 }])
        const renamed = vi.fn()
        store.on(STORE_EVENTS.PROGRAM_RENAMED, renamed)

        store.updateProgram(1, { id: 31 })

        expect(renamed).toHaveBeenCalledWith(1, 31)
        expect(store.listButtons(31)).toHaveLength(1)
        expect(store.listButtons(1)).toHaveLength(0)
        expect(store.getOrInitDmxMidi(31).midi_patterns).toHaveLength(1)
    })

    it('rejects renaming to an id already in use', () => {
        store.createProgram({ name: 'A' })
        store.createProgram({ name: 'B' })
        expect(() => store.updateProgram(1, { id: 2 })).toThrow(InvalidParamError)
        expect(store.getProgram(1).name).toBe('A')
    })

    it('destroying a program deletes its buttons and midi but keeps global buttons', () => {
        store.createProgram({ name: 'A' })
        store.createButton({ program_id: 1 })
        createGlobalButton()
        store.destroyProgram(1)

        expect(store.listPrograms()).toEqual([])
        expect(store.listButtons(1).map(b => b.program_id)).toEqual([null])

        store.createProgram({ name: 'B' })
        expect(store.getOrInitDmxMidi(1).midi_patterns).toEqual([])
    })
})

describe('dmx buttons', () => {
    beforeEach(() => {
        store.createProgram({ name: 'A' })
        store.createProgram({ name: 'B' })
    })

    it('lists the program buttons first, then global ones, in creation order', () => {
        const g1 = createGlobalButton()
        const a1 = store.createButton({ program_id: 1 })
        store.createButton({ program_id: 2 })
        const g2 = createGlobalButton()
        const a2 = store.createButton({ program_id: 1 })

        expect(store.listButtons(1).map(b => b.id)).toEqual([a1.id, a2.id, g1.id, g2.id])
        expect(store.listButtons(undefined).map(b => b.id)).toEqual([g1.id, g2.id])
    })

    it('creates with the former defaults', () => {
        expect(store.createButton({ program_id: 1 })).toMatchObject({
            program_id: 1,
            color: '#fffff',
            duration_ms: 100,
            red_channels: [],
            nature: 'Boom',
            triggering_midi_key: null,
        })
    })

    it('update only overrides given keys, and can clear nullable ones', () => {
        const button = store.createButton({ program_id: 1, triggering_midi_key: 36, color: '#ff0000' })

        store.updateButton(button.id, { duration_ms: 300 })
        expect(store.getButton(button.id)).toMatchObject({ duration_ms: 300, triggering_midi_key: 36, color: '#ff0000' })

        store.updateButton(button.id, { triggering_midi_key: null, program_id: null })
        expect(store.getButton(button.id)).toMatchObject({ triggering_midi_key: null, program_id: null })
    })

    it('destroys buttons and throws NotFoundError on unknown ids', () => {
        const button = store.createButton({ program_id: 1 })
        store.destroyButton(button.id)
        expect(() => store.getButton(button.id)).toThrow(NotFoundError)
        expect(() => store.destroyButton(button.id)).toThrow(NotFoundError)
        expect(() => store.updateButton(button.id, {})).toThrow(NotFoundError)
    })
})

describe('load and toData', () => {
    it('replaces the whole data set and emits loaded', () => {
        store.createProgram({ name: 'Old' })
        const loaded = vi.fn()
        store.on(STORE_EVENTS.LOADED, loaded)

        const data: ShowData = {
            programs: [{ id: 31, name: 'INTRO', bpm: 70, audio_filename: null }],
            dmx_buttons: [],
            dmx_midis: [{ program_id: 31, midi_patterns: [] }],
            dmx_scene: { led_bars: [{ channel: 97, rgb_dots_count: 16 }] },
        }
        store.load(data)

        expect(loaded).toHaveBeenCalledTimes(1)
        expect(store.toData()).toEqual(data)
        expect(store.getDmxScene()).toEqual(data.dmx_scene)
        expect(store.createProgram({ name: 'Next' }).id).toBe(32)

        // The store does not keep references to the loaded object
        data.programs[0].name = 'changed'
        expect(store.getProgram(31).name).toBe('INTRO')
    })
})

describe('events and isolation', () => {
    it('emits changed on mutations but not on lazy midi init', () => {
        const changed = vi.fn()
        store.on(STORE_EVENTS.CHANGED, changed)

        store.createProgram({ name: 'A' })
        expect(changed).toHaveBeenCalledTimes(1)

        store.getOrInitDmxMidi(1)
        store.listPrograms()
        expect(changed).toHaveBeenCalledTimes(1)

        store.updateDmxMidi(1, [])
        expect(changed).toHaveBeenCalledTimes(2)
    })

    it('returns copies that cannot mutate the store', () => {
        store.createProgram({ name: 'A' })
        const button = store.createButton({ program_id: 1, red_channels: [1] })

        store.getProgram(1).name = 'changed'
        store.listButtons(1)[0].red_channels.push(99)
        button.color = '#000000'

        expect(store.getProgram(1).name).toBe('A')
        expect(store.getButton(button.id)).toMatchObject({ red_channels: [1], color: '#fffff' })
    })
})
