import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DmxMidiHandler } from './dmx_midi_handler'

describe('DmxMidiHandler.isDrivenByMidi', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('is false until MIDI starts playback', () => {
        expect(new DmxMidiHandler({}).isDrivenByMidi()).toBe(false)
    })

    it('is true while the clock ticks, false once stopped', () => {
        const handler = new DmxMidiHandler({})
        handler.play()
        vi.advanceTimersByTime(500)
        handler.receiveClock()
        vi.advanceTimersByTime(500)
        expect(handler.isDrivenByMidi()).toBe(true)
        handler.stop()
        expect(handler.isDrivenByMidi()).toBe(false)
    })

    it('ends when the clock goes silent without a Stop (MainStage quit or crashed)', () => {
        const handler = new DmxMidiHandler({})
        handler.play()
        vi.advanceTimersByTime(1500)
        expect(handler.isDrivenByMidi()).toBe(false)
    })

    it('is not set by the app moving the tick itself', () => {
        const handler = new DmxMidiHandler({})
        handler.updateCurrentTickManually(960)
        expect(handler.isDrivenByMidi()).toBe(false)
    })
})
