import { describe, it, expect } from 'vitest'
import { MAX_TICK, nextFreeTick, setLoopEnd, toggleLoopForPatterns } from './utils_midi_notes'

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

describe('nextFreeTick with the track\'s end', () => {
    it('stops at the end when no pattern follows', () => {
        expect(nextFreeTick([pattern(0)], 100, 1000)).toBe(1000)
    })

    it('stops at the next pattern before the end', () => {
        expect(nextFreeTick([pattern(500)], 100, 1000)).toBe(500)
    })

    it('has no room past the end', () => {
        expect(nextFreeTick([], 1200, 1000)).toBe(1200)
    })
})

describe('toggleLoopForPatterns', () => {
    it('loops until the track\'s end', () => {
        const [looped] = toggleLoopForPatterns([pattern(0, 100)], [pattern(0, 100)], 1000)
        expect(looped.loop_until_tick).toBe(1000)
    })

    it('loops until the next pattern', () => {
        const [looped] = toggleLoopForPatterns([pattern(0, 100), pattern(400)], [pattern(0, 100)], 1000)
        expect(looped.loop_until_tick).toBe(400)
    })
})

describe('setLoopEnd', () => {
    const looped = { ...pattern(0, 100), loop_until_tick: 400 }

    it('moves the loop\'s end', () => {
        expect(setLoopEnd([looped], looped, 300, 1000)[0].loop_until_tick).toBe(300)
    })

    it('stops at the next pattern', () => {
        expect(setLoopEnd([looped, pattern(600)], looped, 800, 1000)[0].loop_until_tick).toBe(600)
    })

    it('stops at the track\'s end', () => {
        expect(setLoopEnd([looped], looped, 1500, 1000)[0].loop_until_tick).toBe(1000)
    })

    it('removes the loop back to the pattern\'s end', () => {
        expect(setLoopEnd([looped], looped, 50, 1000)[0].loop_until_tick).toBeUndefined()
    })

    it('leaves the other patterns alone', () => {
        const other = { ...pattern(600), loop_until_tick: 900 }
        expect(setLoopEnd([looped, other], looped, 300, 1000)[1]).toBe(other)
    })

    it('has no end without one', () => {
        expect(setLoopEnd([looped], looped, 5000)[0].loop_until_tick).toBe(5000)
        expect(MAX_TICK).toBeGreaterThan(5000)
    })
})
