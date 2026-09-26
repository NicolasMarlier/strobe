export const PPQ = 480

export const setupCanvasDPR = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    heightAdjust = 0
): { width: number; height: number } => {
    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight + heightAdjust
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    ctx.scale(dpr, dpr)
    return { width, height }
}

export const ticksDurationToPixels = (ticksDuration: number, pixelsPerBeat: number) =>
    ticksDuration * pixelsPerBeat / PPQ

export const ticksOffsetToPixels = (tick: number, ticksScroll: number, pixelsPerBeat: number, baseOffset=0) =>
    ticksDurationToPixels(tick -  ticksScroll, pixelsPerBeat) + baseOffset

export const xToTicks = (props: {x: number, ticksScroll: number, pixelsPerBeat: number, x0?: number, magnet?: boolean, magnetBeats?: number, magnetMode?: 'line'}) => {
    const { x, ticksScroll, pixelsPerBeat, x0, magnet, magnetMode, magnetBeats=0.25 } = props
    const aimedTick = ((x - (x0 || 0)) / pixelsPerBeat * PPQ + ticksScroll)
    if(magnet) {
        if(magnetMode == 'line') {
            return PPQ * Math.round((aimedTick / PPQ) / magnetBeats) * magnetBeats
        }
        return PPQ * Math.floor((aimedTick / PPQ) / magnetBeats) * magnetBeats
    }
    return aimedTick
}


export const midiKeyToPixelsOffset = (midiKey: MidiKey, height: number, midiKeys: MidiKey[]) => {    
    return midiKeys.toSorted().indexOf(midiKey) * midiKeyToPixelsHeight(height)
        + height * 1 / 5
}

export const midiKeyToPixelsHeight = (height: number) => {
    return height * 2 / (5 * 6)
}

export const pixelsOffsetToMidiKeyIndex = (y: number, height: number) => (
    Math.floor(
        (
            y
            - height * 1 / 5
        ) / midiKeyToPixelsHeight(height)
    )
)

export const pixelsOffsetToMidiKey = (y: number, height: number, midiKeys: MidiKey[]) => (
    midiKeys.toSorted()[
        pixelsOffsetToMidiKeyIndex(y, height)
    ]
)

const sortSegment: (segment: [number, number]) => [number, number] = ([a, b]) => (
    a > b ? [b, a] : [a, b]
)

export const doSegmentsIntersect:
    (segmentA: [number, number], segmentB: [number, number]) => boolean
    = (segmentA, segmentB) => {
    if(sortSegment(segmentB)[0] < sortSegment(segmentA)[0]) {
        return doSegmentsIntersect(segmentB, segmentA)
    }
    return sortSegment(segmentA)[0] < sortSegment(segmentB)[1] &&
        sortSegment(segmentA)[1] > sortSegment(segmentB)[0]
}

interface Rectangle {
    x0: number
    y0: number
    x1: number
    y1: number
}

export const midiNoteToRectangle = (midiNote: MidiNote, height: number, midiKeys: MidiKey[], ticksScroll: number, pixelsPerBeat: number) => ({
    x0: ticksOffsetToPixels(midiNote.ticks, ticksScroll, pixelsPerBeat),
    y0: midiKeyToPixelsOffset(midiNote.midi, height, midiKeys),
    x1: ticksOffsetToPixels(midiNote.ticks + midiNote.durationTicks, ticksScroll, pixelsPerBeat),
    y1: midiKeyToPixelsOffset(midiNote.midi, height, midiKeys) + midiKeyToPixelsHeight(height),
})

export const midiPatternToRectangle = (midiPattern: MidiPattern, height: number, ticksScroll: number, pixelsPerBeat: number) => ({
    x0: ticksOffsetToPixels(midiPattern.ticks, ticksScroll, pixelsPerBeat),
    y0: height * 1 / 5 ,
    x1: ticksOffsetToPixels(midiPattern.ticks + midiPattern.durationTicks, ticksScroll, pixelsPerBeat) - 1,
    y1: height * 3 / 5
})

export const doRectanglesIntersect = (rectangleA: Rectangle, rectangleB: Rectangle) => (
    doSegmentsIntersect([rectangleA.x0, rectangleA.x1], [rectangleB.x0, rectangleB.x1]) &&
    doSegmentsIntersect([rectangleA.y0, rectangleA.y1], [rectangleB.y0, rectangleB.y1])
)

export const isMidiNoteInRectangle = (selection: Rectangle, midiNote: MidiNote, height: number, midiKeys: MidiKey[], ticksScroll: number, pixelsPerBeat: number) => (
    doRectanglesIntersect(selection, midiNoteToRectangle(midiNote, height, midiKeys, ticksScroll, pixelsPerBeat))
)
export const computedSelectedNotes = (selection: Rectangle, midiNotes: MidiNote[], height: number, midiKeys: MidiKey[], ticksScroll: number, pixelsPerBeat: number) => (
    midiNotes.filter(midiNote => isMidiNoteInRectangle(selection, midiNote, height, midiKeys, ticksScroll, pixelsPerBeat))
)


export const timeToTick = (timeInSeconds: number, bpm: number) => Math.round((timeInSeconds * bpm * PPQ) / 60)
export const tickToTime = (tick: number, bpm: number) => (60.0 * tick) / (bpm * PPQ)
