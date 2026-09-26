import './NoteEditor.scss'
import { useEffect, useRef } from 'react'
import { NOTE_ROW_HEIGHT, PIANO_KEY_WIDTH, TIMELINE_HEIGHT, midiNoteToRectangle, redrawNoteEditor } from './NoteEditorCanvasDrawer'
import { doRectanglesIntersect, PPQ, xToTicks } from './utils'
import { buildRowKeys, midiNotesArrayEqual, midiNotesIncludes } from './utils_midi_notes'
import { useDmxMidiContext } from '../../contexts/DmxMidiContext'
import { useRealTimeContext } from '../../contexts/RealTimeContext'
import CanvasMouseHandler from './CanvasMouseHandler'

const DEFAULT_PIXELS_PER_BEAT = 80

interface Props {
    pattern: MidiPattern
}
const NoteEditor = (props: Props) => {
    const { pattern } = props
    const {
        updateSelectedMidiPatternNotes, allMidiKeys, activeEditor,
    } = useDmxMidiContext()

    const { midiCurrentTickRef } = useRealTimeContext()

    const isFocused = activeEditor == 'PatternEditor'
    
    const canvasRef = useRef<HTMLCanvasElement>(null)
    
    const ghostNoteRef = useRef<MidiNote | undefined>(undefined)

    // Mirror all values accessed in event handlers into refs so they stay fresh
    const patternRef = useRef(pattern)
    patternRef.current = pattern
    
    const selectedNotesRef = useRef<MidiNote[]>([])
    
    const ticksScrollRef = useRef(0)
    const pixelsPerBeatRef = useRef(DEFAULT_PIXELS_PER_BEAT)

    const onUpdateNotesRef = useRef(updateSelectedMidiPatternNotes)
    onUpdateNotesRef.current = updateSelectedMidiPatternNotes

    // Mirror controlled prop into a ref so keyboard handler (registered once) stays fresh
    const isFocusedRef = useRef(isFocused)
    isFocusedRef.current = isFocused

    const sortedMidiKeys = buildRowKeys(allMidiKeys)
    const sortedMidiKeysRef = useRef(sortedMidiKeys)
    sortedMidiKeysRef.current = sortedMidiKeys

    const mouseSelectionRef = useRef<{mode: 'drag' | 'select', rect: Rectangle} | null>(null)

    const canvasHeight = TIMELINE_HEIGHT + NOTE_ROW_HEIGHT * sortedMidiKeys.length

    // Drag state stored in refs — no re-registration needed
    const selectionRectRef = useRef<Rectangle | null>(null)
    const dragDeltaRef = useRef<{ ticks: number; row: number }>({ ticks: 0, row: 0 })

    useEffect(() => {
        selectedNotesRef.current = []
        ticksScrollRef.current = pattern.ticks
        dragDeltaRef.current = { ticks: 0, row: 0 }
        selectionRectRef.current = null
    }, [pattern.ticks])

    // ── Coordinate helpers ────────────────────────────────────────────────────────

    const yToRowIndex = (y: number) => Math.floor((y - TIMELINE_HEIGHT) / NOTE_ROW_HEIGHT)

    const yToMidiKey = (y: number): MidiKey | undefined => sortedMidiKeysRef.current[yToRowIndex(y)]


    // ── Event handlers ────────────────────────────────────────────────────────────

    const midiNotesInRect = (rect: Rectangle) => patternRef.current.midi_notes
        .filter(n =>
            doRectanglesIntersect(
                rect,
                midiNoteToRectangle(
                    n,
                    ticksScrollRef.current,
                    pixelsPerBeatRef.current,
                    sortedMidiKeysRef.current
                )
            )
        )

    const transformMidiNote = (midiNote: MidiNote, x: number, y: number) => {
        const draggedTicks = xToTicks({
            x: x,
            ticksScroll: 0, // We want ticks offset
            pixelsPerBeat: pixelsPerBeatRef.current,
            magnet: true,
            magnetMode: 'line'
        })

        const dragDeltaRow = Math.round(y / NOTE_ROW_HEIGHT)
        return {
            ticks: midiNote.ticks + draggedTicks,
            midi: sortedMidiKeysRef.current[sortedMidiKeysRef.current.indexOf(midiNote.midi) + dragDeltaRow],
            durationTicks: midiNote.durationTicks,
        }
    }

    const onKeyDown = (e: KeyboardEvent) => {
        if (!isFocusedRef.current) return
        if((e.target as any).localName == 'input') return
        
        if (e.key === 'Backspace' && selectedNotesRef.current.length > 0) {
            e.preventDefault()
            const toRemove = new Set(selectedNotesRef.current.map(n => `${n.ticks}:${n.midi}`))
            onUpdateNotesRef.current(patternRef.current.midi_notes.filter(n => !toRemove.has(`${n.ticks}:${n.midi}`)))
            selectedNotesRef.current = []
        }
        if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            selectedNotesRef.current = [...patternRef.current.midi_notes]
        }
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [])

    const mainLoop = () => {
        if (!canvasRef.current) return
        redrawNoteEditor({
            canvas: canvasRef.current,
            pattern: patternRef.current,
            sortedMidiKeys: sortedMidiKeysRef.current,
            ticksScroll: ticksScrollRef.current,
            pixelsPerBeat: pixelsPerBeatRef.current,
            selectedNotes: selectedNotesRef.current,
            ghostNote: ghostNoteRef.current,
            currentMidiTick: midiCurrentTickRef.current,
            mouseSelection: mouseSelectionRef.current,
            dragDeltaTicks: dragDeltaRef.current.ticks,
            dragDeltaRow: dragDeltaRef.current.row,
            transformMidiNote, 
        })
    }

    useEffect(() => {
        const interval = setInterval(mainLoop, 20)
        return () => clearInterval(interval)   
    }, [])

    const updateSelectedMidiNote = (updatedMidiNotes: MidiNote[]) => {
        if(midiNotesArrayEqual(selectedNotesRef.current, updatedMidiNotes)) return
        const newNotes = [
            ...patternRef.current.midi_notes.filter(n => 
                !midiNotesIncludes(selectedNotesRef.current, n)
            ),
            ...updatedMidiNotes
        ]
        selectedNotesRef.current = updatedMidiNotes
        patternRef.current.midi_notes = newNotes
        updateSelectedMidiPatternNotes(newNotes)
    }

    const midiNoteFromXY: (x: number, y: number) => MidiNote | undefined = (x,y) => {
        const midiKey = yToMidiKey(y)
        const tick = xToTicks({
            x,
            ticksScroll: ticksScrollRef.current,
            pixelsPerBeat: pixelsPerBeatRef.current,
            magnet: true,
            x0: PIANO_KEY_WIDTH
        })
        if(!midiKey) return undefined
        if(tick < patternRef.current.ticks) return undefined
        if(tick >= patternRef.current.ticks + patternRef.current.durationTicks) return undefined

        return {
            ticks: tick,
            durationTicks: PPQ / 4,
            midi: midiKey,
        }
    }


    return (
        <div
            className={`note-editor${isFocused ? ' note-editor--focused' : ''}`}>
            <div className="note-editor-header">
                <span className="note-editor-title">Editor</span>
                <span className="note-editor-hint">
                    click to add · drag to select · drag note to move · ⌫ delete
                </span>
            </div>
            <div className="note-editor-canvas-scroll">
                <canvas
                    ref={canvasRef}
                    className="note-editor-canvas"
                    style={{ height: `${canvasHeight}px` }}
                />
                <CanvasMouseHandler
                    canvasRef={canvasRef}
                    ticksScrollRef={ticksScrollRef}
                    pixelsPerBeatRef={pixelsPerBeatRef}
                    selectionRef={mouseSelectionRef}
                    timelineHeight={TIMELINE_HEIGHT}
                    itemsInRect={midiNotesInRect}
                    x0={PIANO_KEY_WIDTH}
                    selectedItemsRef={selectedNotesRef}
                    transformItem={transformMidiNote}
                    updateSelectedItems={updateSelectedMidiNote}
                    itemFromXY={midiNoteFromXY}
                    ghostItemRef={ghostNoteRef}
                    editorMode='PatternEditor'
                />
            </div>
        </div>
    )
}
export default NoteEditor