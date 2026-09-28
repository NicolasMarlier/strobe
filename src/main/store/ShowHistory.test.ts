import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Store, STORE_EVENTS } from './Store'
import { ShowHistory } from './ShowHistory'

let store: Store
let history: ShowHistory

// Changes further apart than the merge delay are separate steps
const later = () => vi.advanceTimersByTime(1000)

const trackNames = () => store.listTracks().map(({ name }) => name)

beforeEach(() => {
    vi.useFakeTimers()
    store = new (Store as any)()
    history = new ShowHistory(store)
})

afterEach(() => vi.useRealTimers())

describe('show history', () => {
    it('undoes and redoes changes one step at a time', () => {
        store.createTrack({ name: 'A' })
        later()
        store.updateTrack(1, { name: 'B' })

        expect(history.undo()).toBe(true)
        expect(trackNames()).toEqual(['A'])
        expect(history.undo()).toBe(true)
        expect(trackNames()).toEqual([])
        expect(history.undo()).toBe(false)

        expect(history.redo()).toBe(true)
        expect(trackNames()).toEqual(['A'])
        expect(history.redo()).toBe(true)
        expect(trackNames()).toEqual(['B'])
        expect(history.redo()).toBe(false)
    })

    it('makes changes close together a single step', () => {
        store.createTrack({ name: 'A' })
        later()
        store.updateTrack(1, { name: 'AB' })
        store.updateTrack(1, { name: 'ABC' })

        history.undo()
        expect(trackNames()).toEqual(['A'])
    })

    it('forgets what was undone once something else changes', () => {
        store.createTrack({ name: 'A' })
        later()
        store.updateTrack(1, { name: 'B' })
        history.undo()
        store.updateTrack(1, { name: 'C' })

        expect(history.canRedo()).toBe(false)
        history.undo()
        expect(trackNames()).toEqual(['A'])
    })

    it('marks a restored state as a change, and tells the UI', () => {
        store.createTrack({ name: 'A' })
        const changed = vi.fn()
        const restored = vi.fn()
        store.on(STORE_EVENTS.CHANGED, changed)
        store.on(STORE_EVENTS.RESTORED, restored)

        history.undo()
        expect(changed).toHaveBeenCalledTimes(1)
        expect(restored).toHaveBeenCalledTimes(1)
    })

    it("doesn't undo the display options, nor keep them as steps", () => {
        store.updateDmxScene({ led_bars: [{ channel: 1, rgb_dots_count: 8 }] })
        later()
        store.updateDmxScene({ ...store.getDmxScene(), display: { show_grid: false, show_beams: true, zoom: 7 } })
        later()
        store.updateDmxScene({ ...store.getDmxScene(), led_bars: [] })

        history.undo()
        expect(store.getDmxScene().led_bars).toHaveLength(1)
        expect(store.getDmxScene().display).toEqual({ show_grid: false, show_beams: true, zoom: 7 })

        // The display change wasn't a step: the next undo goes back before the bar
        history.undo()
        expect(store.getDmxScene().led_bars).toHaveLength(0)
        expect(history.canUndo()).toBe(false)
    })

    it('starts over when a show is opened', () => {
        store.createTrack({ name: 'A' })
        store.load({ tracks: [], dmx_buttons: [], dmx_midis: [], dmx_scene: { led_bars: [] } })

        expect(history.canUndo()).toBe(false)
        expect(history.undo()).toBe(false)
    })

    it('keeps the last 100 steps', () => {
        store.createTrack({ name: '0' })
        for (let i = 1; i <= 150; i++) {
            later()
            store.updateTrack(1, { name: String(i) })
        }
        while (history.undo()) { /* back to the oldest step kept */ }
        expect(trackNames()).toEqual(['50'])
    })
})
