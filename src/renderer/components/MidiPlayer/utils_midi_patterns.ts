import { midiNotesArrayEqual } from "./utils_midi_notes"

export const splitPatternsAtTick = (midiPatterns: MidiPattern[], tick: number) => {
    let newPatterns = [] as MidiPattern[]
    midiPatterns.forEach((pattern) => {
        if(
            pattern.ticks < tick
            && (pattern.ticks + pattern.durationTicks) > tick) {
            newPatterns = [...newPatterns, ...[
                {
                    ticks: pattern.ticks,
                    durationTicks: tick - pattern.ticks,
                    midi_notes: pattern.midi_notes.filter((n) => n.ticks < tick)
                },
                {
                    ticks: tick,
                    durationTicks: pattern.ticks + pattern.durationTicks - tick,
                    midi_notes: pattern.midi_notes.filter((n) => n.ticks >= tick)
                }
            ]]
        }
        else {
            newPatterns = [...newPatterns, ...[pattern]]
        }
    })
    return newPatterns
}

export const midiPatternsInclude = (midiPatterns: MidiPattern[], midiPattern: MidiPattern) => midiPatterns.some(p => p.ticks == midiPattern.ticks)

export const isSelected = (midiPattern: MidiPattern, selectedMidiPatterns: MidiPattern[]) => midiPatternsInclude(
    selectedMidiPatterns, midiPattern
)

export const midiPatternEqual = (a: MidiPattern, b: MidiPattern) => {
    if(a.ticks != b.ticks) return false
    if(a.durationTicks != b.durationTicks) return false
    if(a.loop_until_tick != b.loop_until_tick) return false
    return midiNotesArrayEqual(a.midi_notes, b.midi_notes)
}

export const midiPatternArrayEqual = (a: MidiPattern[], b: MidiPattern[]) => {
    if(a.length != b.length) return false
    const sortedA = a.toSorted((mp1, mp2) => mp2.ticks - mp1.ticks)
    const sortedB = b.toSorted((mp1, mp2) => mp2.ticks - mp1.ticks)
    return sortedA.every((mp, i) => midiPatternEqual(mp, sortedB[i]))
}

export const sum: (midiPatterns: MidiPattern[]) => MidiPattern = (midiPatterns) => {
    const ticks = midiPatterns.reduce((min, p) => Math.min(p.ticks, min), midiPatterns[0].ticks)
    const untilTick = midiPatterns.reduce((max, p) => Math.max(p.ticks + p.durationTicks, max), 0)
    return {
        ticks: ticks,
        durationTicks: untilTick - ticks,
        midi_notes: midiPatterns.flatMap(p => p.midi_notes)
    }
}