import { describe, it, expect } from 'vitest'
import { nextFreeTick } from './utils_midi_notes'

const MAX_TICK = 5 * 60 * 120 * 480

const pattern = (ticks: number, durationTicks = 50): MidiPattern => ({ ticks, durationTicks, midi_notes: [] })

describe('nextFreeTick', () => {
    it('returns MAX_TICK when patterns array is empty', () => {
        expect(nextFreeTick([], 100)).toBe(MAX_TICK)
    })

    it('returns MAX_TICK when all patterns start at or before tick', () => {
        expect(nextFreeTick([pattern(0), pattern(100), pattern(200)], 300)).toBe(MAX_TICK)
    })

    it('returns the tick of the single pattern after tick', () => {
        expect(nextFreeTick([pattern(200)], 100)).toBe(200)
    })

    it('returns the nearest pattern tick when multiple patterns follow', () => {
        expect(nextFreeTick([pattern(300), pattern(150), pattern(200)], 100)).toBe(150)
    })

    it('handles patterns both before and after tick', () => {
        expect(nextFreeTick([pattern(100), pattern(200), pattern(300)], 150)).toBe(200)
    })

    it('handles tick in the middle of a pattern', () => {
        expect(nextFreeTick([pattern(50)], 75)).toBe(75)
    })
})
