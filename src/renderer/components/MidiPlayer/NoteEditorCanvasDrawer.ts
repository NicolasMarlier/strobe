import { humanizeMidiKey } from '../../utils'
import { drawBeatsGrid, drawCurrentSelection, drawCurrentTick, drawTimeline, ITEM_COLOR, PRIMARY_GRID_COLOR, SELECTED_COLOR, type DrawerFunctionProps } from './GenericCanvasDrawer'
import { PPQ, setupCanvasDPR, ticksDurationToPixels, ticksOffsetToPixels, xToTicks } from './utils'
import { midiNotesIncludes } from './utils_midi_notes'

export const TIMELINE_HEIGHT = 24
export const PIANO_KEY_WIDTH = 52
export const NOTE_ROW_HEIGHT = 28

interface Props {
    canvas: HTMLCanvasElement
    pattern: MidiPattern
    sortedMidiKeys: MidiKey[]
    ticksScroll: number
    pixelsPerBeat: number
    selectedNotes: MidiNote[]
    ghostNote: MidiNote | undefined
    mouseSelection: MouseSelection | null
    dragDeltaTicks: number
    dragDeltaRow: number
    currentMidiTick: number
    transformMidiNote: (midiNote: MidiNote, x: number, y: number) => MidiNote
}

const rowToY = (row: number) => TIMELINE_HEIGHT + row * NOTE_ROW_HEIGHT

const drawMidiKeysGrid = (props: DrawerFunctionProps) => {
    const {ctx, allMidiKeys, width} = props
    allMidiKeys.forEach((_midiKey, rowIndex) => {
        const y = rowToY(rowIndex)
        ctx.fillStyle = PRIMARY_GRID_COLOR
        ctx.fillRect(PIANO_KEY_WIDTH, y, width, 1)
    })
}

interface DrawMidiNotesArgs {
    midiNotes: MidiNote[]
    selectedMidiNotes: MidiNote[]
    mouseSelection: MouseSelection | null
    transformMidiNote: (midiNote: MidiNote, x: number, y: number) => MidiNote
}

const drawMidiNotes = (props: DrawerFunctionProps, args: DrawMidiNotesArgs) => {
    const { midiNotes, selectedMidiNotes, mouseSelection, transformMidiNote } = args

    midiNotes.forEach(note => {
        const isSelected = midiNotesIncludes(selectedMidiNotes, note)

        const draggableNote = mouseSelection?.mode == 'drag' && isSelected ? transformMidiNote(
            note,
            mouseSelection.rect.x1 - mouseSelection.rect.x0,
            mouseSelection.rect.y1 - mouseSelection.rect.y0
        ) : note

        drawMidiNote(props, {note: draggableNote, fillColor: isSelected ? SELECTED_COLOR : ITEM_COLOR})
    })
}

interface DrawNoteArgs {
    note: MidiNote
    fillColor: string
    strokeColor?: string
}

export const midiNoteToRectangle = (midiNote: MidiNote, ticksScroll: number, pixelsPerBeat: number, allMidiKeys: MidiKey[]) => {
    const rowIndex = (allMidiKeys || []).indexOf(midiNote.midi)
    

    const x = ticksOffsetToPixels(midiNote.ticks, ticksScroll, pixelsPerBeat, PIANO_KEY_WIDTH)
    const y = rowToY(rowIndex)
    const w = ticksDurationToPixels(midiNote.durationTicks, pixelsPerBeat) - 1
    const h = NOTE_ROW_HEIGHT - 1
    return {
        x0: x,
        y0: y,
        x1: x + w,
        y1: y + h
    }
}
const drawMidiNote = (props: DrawerFunctionProps, args: DrawNoteArgs) => {
    const {ctx, allMidiKeys, pixelsPerBeat, ticksScroll} = props
    const { note, fillColor, strokeColor } = args

    const rowIndex = allMidiKeys.indexOf(note.midi)

    const x = ticksOffsetToPixels(note.ticks, ticksScroll, pixelsPerBeat, PIANO_KEY_WIDTH)
    const y = rowToY(rowIndex)
    const w = ticksDurationToPixels(note.durationTicks, pixelsPerBeat) - 1
    const h = NOTE_ROW_HEIGHT - 1
    ctx.fillStyle = fillColor
    ctx.beginPath(); ctx.roundRect(x, y + 1, w, h, 3); ctx.fill()
    ctx.strokeStyle = strokeColor || '#00000000'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.roundRect(x, y + 1, w, h, 3); ctx.stroke()
}

const drawGhostNote = (props: DrawerFunctionProps, note: MidiNote) => drawMidiNote(
    props,
    {
        note,
        fillColor: 'rgba(58, 212, 0, 0.2)',
        strokeColor: 'rgba(58, 212, 0, 0.5)'
    }
)

const drawPianoKeyboard = (props: DrawerFunctionProps) => {
    const { ctx, height, allMidiKeys } = props

    ctx.fillStyle = '#111'
    ctx.fillRect(0, TIMELINE_HEIGHT, PIANO_KEY_WIDTH, height - TIMELINE_HEIGHT)

    allMidiKeys.forEach((midiKey, rowIndex) => {
        const y = rowToY(rowIndex)
        ctx.fillStyle = '#d8d8d8'
        ctx.beginPath()
        ctx.roundRect(3, y + 2, PIANO_KEY_WIDTH - 7, NOTE_ROW_HEIGHT - 4, 2)
        ctx.fill()

        ctx.fillStyle = '#555'
        ctx.font = `bold ${Math.min(10, NOTE_ROW_HEIGHT - 10)}px monospace`
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        ctx.fillText(humanizeMidiKey(midiKey), PIANO_KEY_WIDTH - 8, y + NOTE_ROW_HEIGHT / 2)
    })
}

export const redrawNoteEditor = (props: Props) => {
    const {
        canvas, pattern, sortedMidiKeys,
        selectedNotes, ghostNote, mouseSelection,
        currentMidiTick,
        transformMidiNote,
        ticksScroll,
        pixelsPerBeat
    } = props

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width: cssWidth, height: cssHeight } = setupCanvasDPR(canvas, ctx)

    const drawerFunctionProps: DrawerFunctionProps = {
        ...props,
        ...{
            width: cssWidth,
            height: cssHeight,
            ctx,
            ppq: PPQ,
            allMidiKeys: sortedMidiKeys,
            baseXOffset: PIANO_KEY_WIDTH,
            baseYOffset: TIMELINE_HEIGHT
        }
    }

    // Background
    ctx.fillStyle = '#222'
    ctx.fillRect(
        ticksOffsetToPixels(pattern.ticks, ticksScroll, pixelsPerBeat, PIANO_KEY_WIDTH),
        0,
        ticksDurationToPixels(pattern.durationTicks, pixelsPerBeat),
        cssHeight
    )
    

    drawMidiKeysGrid(drawerFunctionProps)
    drawBeatsGrid(drawerFunctionProps)

    drawTimeline(drawerFunctionProps)
    
    drawMidiNotes(drawerFunctionProps, {
        midiNotes: pattern.midi_notes,
        selectedMidiNotes: selectedNotes,
        mouseSelection,
        transformMidiNote
    })  
    if (ghostNote) drawGhostNote(drawerFunctionProps, ghostNote)

    drawCurrentTick(drawerFunctionProps, currentMidiTick)
    if (mouseSelection?.mode == 'select') { drawCurrentSelection(drawerFunctionProps, mouseSelection.rect) }
    drawPianoKeyboard(drawerFunctionProps)
}
