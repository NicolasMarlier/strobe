export const midiNoteEqual = (a: MidiNote, b: MidiNote) => a.midi == b.midi && a.ticks == b.ticks


export const midiNotesArrayEqual = (a: MidiNote[], b: MidiNote[]) => {
    if(a.length != b.length) return false
    const sortedA = a.toSorted((mp1, mp2) => mp2.ticks - mp1.ticks)
    const sortedB = b.toSorted((mp1, mp2) => mp2.ticks - mp1.ticks)
    return sortedA.every((mn, i) => midiNoteEqual(mn, sortedB[i]))
}

export const PPQ = 480


export const buildRowKeys = (rawKeys: MidiKey[], minRows = 6): MidiKey[] => {
    const valid = [...new Set(rawKeys.filter((k): k is number => typeof k === 'number' && !isNaN(k)))]
    if (valid.length === 0) return [48, 45, 43, 39, 38, 36]
    const sorted = valid.sort((a, b) => a - b)
    const result = [...sorted]
    while (result.length < minRows) {
        const lo = result[0]
        const hi = result[result.length - 1]
        if (lo > 0) result.unshift(lo - 1)
        if (result.length >= minRows) break
        if (hi < 127) result.push(hi + 1)
    }
    return result.sort((a, b) => b - a)
}
export const midiNotesIncludes = (a: MidiNote[], midiNote: MidiNote) => a.some(mn => midiNoteEqual(mn, midiNote))
const subtract = (a: MidiNote[], b: MidiNote[]) => a.filter((mn) => !midiNotesIncludes(b, mn))
const union = (a: MidiNote[], b: MidiNote[]) => [...subtract(a, b), ...b]
const outer_join = (a: MidiNote[], b: MidiNote[]) => union(subtract(a,b), subtract(b, a))


export const magnettedTick = (tick: number, beatMagnet: number=0.25) => PPQ * Math.floor((tick / PPQ) / beatMagnet) * beatMagnet

interface InsertNotesAtTickProps {
    tick: number
    midiNotesToInsert: MidiNote[]
    midiNotes: MidiNote[]
    ppq: number
    options?: {
        remove_if_exist?: boolean
    }
}
export const insertNotesAtTick = (props: InsertNotesAtTickProps) => {
    const { midiNotes, midiNotesToInsert, tick, options } = props
    if(midiNotesToInsert.length == 0) return midiNotes
    const initialTick = midiNotesToInsert.reduce((minTick, {ticks}) => Math.min(ticks, minTick), midiNotesToInsert[0].ticks)


    const newMidiNotes = midiNotesToInsert.map(n => ({
        ticks: n.ticks + tick - initialTick,
        midi: n.midi,
        durationTicks: n.durationTicks
    }))

    if(options?.remove_if_exist) {
        return outer_join(midiNotes, newMidiNotes)
    }
    return union(midiNotes, newMidiNotes)
}


type AddNoteAtTickProps = {
    midiKey: MidiKey
    tick: number
    midiNotes: MidiNote[]
    ppq: number
    options?: {
        remove_if_exist?: boolean
    }
}
export const addNoteAtTick = (props: AddNoteAtTickProps) => insertNotesAtTick(
    {
        ...props,
        ...{
            midiNotesToInsert: [{
                ticks: 0,
                durationTicks: props.ppq / 4,
                midi: props.midiKey
            }]
        }
    })



interface InsertPatternsAtTickProps {
    tick: number
    midiPatternsToInsert: MidiPattern[]
    midiPatterns: MidiPattern[]
    ppq: number
}
export const insertPatternsAtTick = (props: InsertPatternsAtTickProps) => {
    const { midiPatterns, midiPatternsToInsert, tick } = props
    if(midiPatternsToInsert.length == 0) return midiPatterns
    const initialTick = midiPatternsToInsert.reduce((minTick, {ticks}) => Math.min(ticks, minTick), midiPatternsToInsert[0].ticks)


    const newMidiPatterns = midiPatternsToInsert.map(p => ({
        ticks: p.ticks + tick - initialTick,
        durationTicks: p.durationTicks,
        midi_notes: p.midi_notes.map(n => ({
            ticks: n.ticks + tick - initialTick,
            durationTicks: n.durationTicks,
            midi: n.midi
        }))
    }))

    
    return [...midiPatterns, ...newMidiPatterns].toSorted((a, b) => a.ticks - b.ticks)
}

const MAX_TICK = 5 * 60 * 120 * 480
export const nextFreeTick = (midiPatterns: MidiPattern[], tick: number) => midiPatterns
    .filter(p => p.ticks + p.durationTicks > tick)
    .reduce(
        (freeTick, pattern) => Math.max(tick, Math.min(pattern.ticks, freeTick)),
        MAX_TICK
    )

export const toggleLoopForPatterns = (midiPatterns: MidiPattern[], selectedMidiPatterns: MidiPattern[]) => {
    const shouldToggleOn = !selectedMidiPatterns.some(p => p.loop_until_tick)
    return midiPatterns.map(p => {
        const isSelected = selectedMidiPatterns.some(({ticks}) => p.ticks == ticks)
        if(isSelected) {
            return {
                ...p,
                ...{
                    loop_until_tick: shouldToggleOn ? nextFreeTick(midiPatterns, p.ticks + p.durationTicks) : undefined
                }
            }
        }
        else {
            return p
        }
    })
}