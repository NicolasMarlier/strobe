import './TrackEditor.scss'

import { useEffect, useRef, useState } from 'react';
import { useRealTimeContext } from '../../contexts/RealTimeContext';
import { getWave } from './waves';
import { endTabRect, redrawFullCanvas } from './TrackEditorCanvasDrawer';
import { addNoteAtTick, insertPatternsAtTick, magnettedTick, nextFreeTick, setLoopEnd, toggleLoopForPatterns } from './utils_midi_notes';
import { doRectanglesIntersect, midiPatternToRectangle, parseTrackLength, PPQ, tickToTime, ticksDurationToPixels, ticksOffsetToPixels, xToTicks } from './utils';
import CanvasMouseHandler from './CanvasMouseHandler';
import { useDmxMidiContext } from '../../contexts/DmxMidiContext';
import { useDmxButtonsContext } from '../../contexts/DmxButtonsContext';
import { isSelected, midiPatternArrayEqual, midiPatternsInclude, splitPatternsAtTick, sum } from './utils_midi_patterns';
import { isPageEdit, useMenuMessage } from '../../useEditMenu';
import ContextMenu from '../DesignSystem/ContextMenu/ContextMenu';
import { audioMenuItems } from '../../audioMenu';
import { trackEndTick } from './useTrackEndTick';
import { updateTrack } from '../../ApiClient';
import InlineInput from '../DesignSystem/InlineInput/InlineInput';

const BEATS_OFFSET = 2
// Following the cursor, the view turns its page once the cursor passes this share of its width
const FOLLOW_PAGE_EDGE = 0.9
const FOLLOW_GLIDE_MS = 150
// How close to a loop's or the track's end, in pixels, the mouse grabs it
const END_GRAB_PX = 5
// The view goes on this far past the track's end, to drag it further
const PAST_END_TICKS = 8 * 4 * PPQ
// Dragging an end this close to the view's sides scrolls the view, the faster the closer, up to this speed
const EDGE_SCROLL_ZONE_PX = 40
const EDGE_SCROLL_MAX_PX_PER_S = 150

// What the mouse drags in the timeline, rather than seeking or selecting: an end, at fromTick when the
// mouse grabbed it at grabTick
type Edge = ({ kind: 'trackEnd' } | { kind: 'loopEnd', loopOf: MidiPattern }) & { fromTick: number, grabTick: number }

// 185 s: "3:05"
const formatDuration = (seconds: number) => {
    const rounded = Math.round(seconds)
    return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`
}

interface Props {
    track: Track
}

const BASE_PIXELS_PER_BEAT = 40

// Where the waveform goes, the bottom 2/5 of the track (see drawAudioWave): the only place an audio file can be
// dropped, and where a right-click is about the track's audio
const isInAudioLane = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return e.clientY >= rect.top + rect.height * 3 / 5
}

// Over the waveform's lane: says to drop a file there while the track has none (or can't find it),
// and what a drop does while a file is dragged over it
const AudioDropHint = ({ track, isDraggedOver }: { track: Track, isDraggedOver: boolean }) => {
    const idle = !track.audio_filename ? 'Drop an audio file here'
        : track.audio_missing ? `Audio file not found: ${track.audio_filename}. Drop it here again`
        : null
    return <div className={`audio-drop-hint ${idle ? '' : 'has-audio'} ${track.audio_missing ? 'missing' : ''} ${isDraggedOver ? 'drag-over' : ''}`}>
        <svg viewBox='0 0 24 24'><path d='M9 3v12.3A4 4 0 1 0 11 19V8h8V3z'/></svg>
        <span className='idle'>{idle}</span>
        <span className='dragging'>{track.audio_filename ? "Drop to replace the track's audio" : "Drop to use as the track's audio"}</span>
    </div>
}

const MidiPlayer = (props: Props) => {
    const { track } = props
    const {
        midiPatterns,
        updateTrackDmxMidiAndSync,
        allMidiKeys,
        activeEditor,
        isRecording,
        setSelectedMidiPatterns,
        isFollowing,
        setIsFollowing,
    } = useDmxMidiContext()

    const isFollowingRef = useRef(isFollowing)
    isFollowingRef.current = isFollowing

    const { audioUrl, uploadTrackAudioAndSync, chooseTrackAudioAndSync, resetTrackAudioAndSync, syncTracks } = useDmxButtonsContext()

    const trackRef = useRef(track)
    trackRef.current = track

    const allMidiKeysRef = useRef(allMidiKeys)
    allMidiKeysRef.current = allMidiKeys

    const midiPatternsRef = useRef(midiPatterns)
    midiPatternsRef.current = midiPatterns
    
    const selectedMidiPatternsRef = useRef<MidiPattern[]>([])
    selectedMidiPatternsRef.current = midiPatterns.filter(p => isSelected(p, selectedMidiPatternsRef.current))
    
    const { midiCurrentTickRef, lastReceivedMidiKey, seek, drivenByMidi } = useRealTimeContext()
    // For the keyboard handler, registered once
    const drivenByMidiRef = useRef(drivenByMidi)
    drivenByMidiRef.current = drivenByMidi

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const mouseSelectionRef = useRef<MouseSelection | null>(null)

    const ticksScrollRef = useRef(0)
    const pixelsPerBeatRef = useRef(BASE_PIXELS_PER_BEAT)

    // The page turn in progress, and the cursor's tick on the previous frame
    const scrollGlideRef = useRef<{ from: number, to: number, start: number } | null>(null)
    const lastFollowedTickRef = useRef(midiCurrentTickRef.current)

    const [audioWaveData, setAudioWaveData] = useState(new Uint8Array() as Uint8Array)
    const audioWaveDataRef = useRef(audioWaveData)
    audioWaveDataRef.current = audioWaveData

    // The track's end: set by hand, else its audio's, else the default length. While its end is dragged,
    // where the mouse puts it
    const audioEndTick = audioWaveData.length > 0 ? audioWaveData.length - 1 : null
    const audioEndTickRef = useRef(audioEndTick)
    audioEndTickRef.current = audioEndTick
    const endTick = trackEndTick(track, audioEndTick)
    const endTickRef = useRef(endTick)
    endTickRef.current = endTick
    const draggedEndTickRef = useRef<number | null>(null)
    const currentEndTick = () => draggedEndTickRef.current ?? endTickRef.current
    // The length dropped is saved: the track has it now
    useEffect(() => { draggedEndTickRef.current = null }, [track])

    const recordingPatternRef = useRef<MidiPattern>(null)

    const ghostMidiPatternRef = useRef<MidiPattern | undefined>(undefined)
    const hoverTickRef = useRef<number | null>(null)

    const updateTrackDmxMidiAndSyncRef = useRef(updateTrackDmxMidiAndSync)
    updateTrackDmxMidiAndSyncRef.current = updateTrackDmxMidiAndSync

    // The selection, here and in the context (the shortcuts' hint and the note editor follow it)
    const setSelection = (patterns: MidiPattern[]) => {
        selectedMidiPatternsRef.current = patterns
        setSelectedMidiPatterns(patterns)
    }

    const splitAtCurrentTick = () => {
        updateTrackDmxMidiAndSyncRef.current(splitPatternsAtTick(midiPatternsRef.current, midiCurrentTickRef.current))
        setSelection([])
    }

    const activeEditorRef = useRef<'TrackEditor' | 'PatternEditor'>(null)
    activeEditorRef.current = activeEditor

    const clipboard = useRef<MidiPattern[]>([])


    const deleteSelectedMidiPatterns = () => {
        updateTrackDmxMidiAndSyncRef.current(
            midiPatternsRef.current.filter(midiPattern => !isSelected(midiPattern, selectedMidiPatternsRef.current))
        )
        setSelection([])
    }

    const copySelectedMidiPatterns = () => {
        clipboard.current = selectedMidiPatternsRef.current
    }

    const pasteSelectedMidiPatterns = () => {
        updateTrackDmxMidiAndSyncRef.current(
            insertPatternsAtTick({
                midiPatterns: midiPatternsRef.current,
                midiPatternsToInsert: clipboard.current,
                tick: midiCurrentTickRef.current,
                ppq: PPQ
            })
        )
    }

    // Two patterns or more
    const joinSelection = () => {
        if(selectedMidiPatternsRef.current.length < 2) return
        updateTrackDmxMidiAndSyncRef.current(
            [
                ...midiPatternsRef.current.filter(midiPattern => !isSelected(midiPattern, selectedMidiPatternsRef.current)),
                ...[sum(selectedMidiPatternsRef.current)]
            ]
        )
        setSelection([])
    }

    const toggleLoop = () => {
        if(!selectedMidiPatternsRef.current) return
        updateTrackDmxMidiAndSyncRef.current(toggleLoopForPatterns(midiPatternsRef.current, selectedMidiPatternsRef.current, currentEndTick()))
    }

    // Back to Start, one beat back or forward. While MainStage drives playback, it alone moves the cursor
    const moveCursor = (to: 'start' | 'back' | 'forward') => {
        if(drivenByMidiRef.current) return
        const beat = magnettedTick(midiCurrentTickRef.current, 1)
        const targetTick = to == 'start' ? 0 : to == 'back' ? Math.max(0, beat - PPQ) : Math.min(currentEndTick(), beat + PPQ)
        seek(targetTick)
        scrollGlideRef.current = null
        ticksScrollRef.current = to == 'start' ? 0 : targetTick - BEATS_OFFSET * PPQ
    }

    // The timeline's keys, also in the app's menu (Edit, Pattern, Playback): the menu's shows them,
    // and a click there does the same
    const commands = {
        delete: () => deleteSelectedMidiPatterns(),
        copy: () => copySelectedMidiPatterns(),
        paste: () => pasteSelectedMidiPatterns(),
        selectAll: () => selectAll(),
        split: () => splitAtCurrentTick(),
        join: () => joinSelection(),
        loop: () => toggleLoop(),
        back: () => moveCursor('back'),
        forward: () => moveCursor('forward'),
    }
    // Not while a form control has the focus (a text field, a slider, which takes the arrows)
    const isActive = () => activeEditorRef.current === 'TrackEditor' &&
        !['input', 'textarea', 'select'].includes(document.activeElement?.localName ?? '')
    const onCommand = (command: keyof typeof commands) => () => { if(isActive()) commands[command]() }
    useMenuMessage('edit:delete', onCommand('delete'))
    useMenuMessage('edit:copy', () => { if(!isPageEdit('copy')) onCommand('copy')() })
    useMenuMessage('edit:paste', onCommand('paste'))
    useMenuMessage('edit:selectAll', onCommand('selectAll'))
    useMenuMessage('pattern:split', onCommand('split'))
    useMenuMessage('pattern:join', onCommand('join'))
    useMenuMessage('pattern:loop', onCommand('loop'))
    useMenuMessage('playback:back', onCommand('back'))
    useMenuMessage('playback:forward', onCommand('forward'))

    // The keys without a modifier. Those with Cmd (copy, paste, select all) go through the menu
    const KEYS: Record<string, keyof typeof commands> = {
        Backspace: 'delete', t: 'split', j: 'join', l: 'loop', ArrowLeft: 'back', ArrowRight: 'forward',
    }
    const onKeyDown = (e: KeyboardEvent) => {
        if(!isActive() || e.metaKey || e.ctrlKey || e.altKey) return

        if(e.key == 'Enter') moveCursor('start')
        else if(KEYS[e.key]) commands[KEYS[e.key]]()
        else return
        // Taken here, so that macOS doesn't pass it on to the menu, which would do it again
        e.preventDefault()
    }

    const selectAll = () => setSelection(midiPatternsRef.current)

    const [isDraggingAudio, setIsDraggingAudio] = useState(false)
    const [audioMenu, setAudioMenu] = useState(undefined as { x: number, y: number } | undefined)

    const onContextMenu = (e: React.MouseEvent) => {
        e.preventDefault()
        if(isInAudioLane(e)) setAudioMenu({ x: e.clientX, y: e.clientY })
    }

    const onDragOver = (e: React.DragEvent) => {
        const inLane = isInAudioLane(e)
        setIsDraggingAudio(inLane)
        if(!inLane) return
        // Taken here: elsewhere, the window refuses the drop (see renderer.ts)
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'copy'
    }

    const onDrop = (e: React.DragEvent) => {
        setIsDraggingAudio(false)
        if(!isInAudioLane(e)) return
        e.preventDefault()
        e.stopPropagation()
        const file = e.dataTransfer.files[0]
        if(file) uploadTrackAudioAndSync(file)
    }

    const persistRecordingPattern = () => {
        if(!recordingPatternRef.current) return
        if(recordingPatternRef.current.midi_notes.length == 0) return

        updateTrackDmxMidiAndSyncRef.current([...midiPatternsRef.current, ...[recordingPatternRef.current]])
        recordingPatternRef.current = null
    }

    useEffect(() => {
        if(isRecording) {
            if(!recordingPatternRef.current) {
                const duration = nextFreeTick(midiPatternsRef.current, midiCurrentTickRef.current, currentEndTick()) - midiCurrentTickRef.current
                if(duration > 0) {
                    recordingPatternRef.current = {
                        ticks: magnettedTick(midiCurrentTickRef.current),
                        durationTicks: duration,
                        midi_notes: []
                    }
                }
            }
            else {
                //TODO: Handle case when we are after durationTicks, send to server and 
            }
        }
        else {
            if(recordingPatternRef.current) {
                persistRecordingPattern()
            }
        }
    }, [isRecording])



    useEffect(() => {
        if(!!lastReceivedMidiKey && isRecording && recordingPatternRef.current) {
            recordingPatternRef.current = {
                ...recordingPatternRef.current,
                ...{
                    midi_notes: addNoteAtTick({
                        tick: magnettedTick(midiCurrentTickRef.current),
                        midiKey: lastReceivedMidiKey.midi,
                        midiNotes: recordingPatternRef.current.midi_notes || [],
                        ppq: PPQ
                    })
                }
            }
        }
    }, [lastReceivedMidiKey, isRecording])

    useEffect(() => {
        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("keydown", onKeyDown)
        }
    }, [])


    useEffect(() => {
        if(!audioUrl) {
            setAudioWaveData(new Uint8Array())
            return
        }
        let cancelled = false
        getWave(audioUrl, track.bpm).then(waveData => { if(!cancelled) setAudioWaveData(waveData) })
        return () => { cancelled = true }
    }, [audioUrl, track.bpm])

    const redrawMidiCanvas = () => {
        if(!canvasRef.current) return

        redrawFullCanvas({
            canvas: canvasRef.current,
            midiPatterns: midiPatternsRef.current,
            selectedMidiPatterns: selectedMidiPatternsRef.current,
            recordingMidiPattern: recordingPatternRef.current,
            ppq: PPQ,
            currentMidiTick: midiCurrentTickRef.current,
            hoverTick: hoverTickRef.current,
            ticksScroll: ticksScrollRef.current,
            pixelsPerBeat: pixelsPerBeatRef.current,
            audioWaveData: audioWaveDataRef.current,
            endTick: currentEndTick(),
            endLabel: endLabel(),
            allMidiKeys: allMidiKeysRef.current,
            mouseSelection: mouseSelectionRef.current,
            ghostMidiPattern: ghostMidiPatternRef.current,
            transformMidiPattern,
        })
    }

    const visibleTicks = () => (canvasRef.current?.getBoundingClientRect().width ?? 0) * PPQ / pixelsPerBeatRef.current

    // The view stops a few bars past the track's end
    const maxScroll = () => Math.max(0, currentEndTick() + PAST_END_TICKS - visibleTicks())

    // Only a moving cursor turns the page: zooming while it stands still leaves the view alone
    const followCursor = (now: number) => {
        const tick = midiCurrentTickRef.current
        const moved = tick != lastFollowedTickRef.current
        lastFollowedTickRef.current = tick
        if(!canvasRef.current) return

        const scroll = scrollGlideRef.current?.to ?? ticksScrollRef.current
        // Near the track's end, the page can't turn any further
        const inPage = tick >= scroll && (tick <= scroll + visibleTicks() * FOLLOW_PAGE_EDGE || scroll >= maxScroll())

        // Scrolled away by hand: following again once the cursor shows in the view
        if(!isFollowingRef.current) {
            if(!inPage) return
            isFollowingRef.current = true
            setIsFollowing(true)
        }
        if(!moved || inPage) return

        scrollGlideRef.current = {
            from: ticksScrollRef.current,
            to: Math.min(maxScroll(), Math.max(0, tick - BEATS_OFFSET * PPQ)),
            start: now,
        }
    }

    const glideScroll = (now: number) => {
        const glide = scrollGlideRef.current
        if(!glide) return

        const progress = Math.min(1, (now - glide.start) / FOLLOW_GLIDE_MS)
        const eased = 1 - Math.pow(1 - progress, 3)
        ticksScrollRef.current = glide.from + (glide.to - glide.from) * eased
        if(progress == 1) scrollGlideRef.current = null
    }

    const onManualScroll = () => {
        scrollGlideRef.current = null
        isFollowingRef.current = false
        setIsFollowing(false)
    }

    const lastScrollRef = useRef(0)

    const mainLoop = (now: number) => {
        followCursor(now)
        glideScroll(now)
        scrollWhileDraggingEdge(now)
        // Not scrolled any further past the track's end. A view already further (the end just moved back)
        // stays where it is
        ticksScrollRef.current = Math.min(ticksScrollRef.current, Math.max(maxScroll(), lastScrollRef.current))
        lastScrollRef.current = ticksScrollRef.current
        redrawMidiCanvas()
    }

    useEffect(() => {
        // Redraw on every frame, right before it's painted: with a timer, frames painted between
        // two redraws show the canvas stretched to its new size while the window is resized
        let frame = requestAnimationFrame(function loop(now) {
            mainLoop(now)
            frame = requestAnimationFrame(loop)
        })
        return () => cancelAnimationFrame(frame)
    }, [])

    const itemsInRect = (rect: Rectangle) => midiPatternsRef.current
        .filter(p =>
            doRectanglesIntersect(
                rect,
                midiPatternToRectangle(
                    p,
                    canvasRef.current?.getBoundingClientRect().height || 1,
                    ticksScrollRef.current,
                    pixelsPerBeatRef.current
                )
            )
        )

    const isNearTick = (x: number, tick: number) =>
        Math.abs(x - ticksOffsetToPixels(tick, ticksScrollRef.current, pixelsPerBeatRef.current)) <= END_GRAB_PX

    const tickAt = (x: number) => xToTicks({ x, ticksScroll: ticksScrollRef.current, pixelsPerBeat: pixelsPerBeatRef.current })

    // The track's length, in its tab: "3:05 ⟷"
    const endLabel = () => `${formatDuration(tickToTime(currentEndTick(), trackRef.current.bpm))} ⟷`

    // The track can't end before its last pattern
    const minTrackLength = () => Math.max(PPQ, ...midiPatternsRef.current.map(p => p.ticks + p.durationTicks))

    // Among the patterns, a loop's end; elsewhere, from the timeline to the waveform, the track's end, or its tab
    const edgeAt = (x: number, y: number): Edge | undefined => {
        const height = canvasRef.current?.getBoundingClientRect().height || 1
        const grabTick = tickAt(x)
        if(y >= height / 5 && y <= height * 3 / 5) {
            const looped = midiPatternsRef.current.find(p =>
                p.loop_until_tick && isNearTick(x, Math.min(p.loop_until_tick, currentEndTick()))
            )
            if(looped?.loop_until_tick) {
                return { kind: 'loopEnd', loopOf: looped, fromTick: Math.min(looped.loop_until_tick, currentEndTick()), grabTick }
            }
        }
        const endTick = currentEndTick()
        const rulerHeight = (height - 2) / 5
        const tab = endTabRect(ticksOffsetToPixels(endTick, ticksScrollRef.current, pixelsPerBeatRef.current), endLabel(), rulerHeight)
        const isOnTab = y < rulerHeight && x >= tab.x0 && x <= tab.x1
        return isOnTab || isNearTick(x, endTick) ? { kind: 'trackEnd', fromTick: endTick, grabTick } : undefined
    }

    const edgeTitle = (edge: Edge) => edge.kind == 'trackEnd'
        ? "Drag to change the track's length, double-click to type it"
        : 'Drag to change where the loop ends'

    // The end being dragged, and where the mouse is
    const edgeDragRef = useRef<{ edge: Edge, x: number } | null>(null)

    // The end moves as much as the mouse did since it grabbed it, on the beats
    const dragEdge = (edge: Edge, x: number, dropped: boolean) => {
        edgeDragRef.current = dropped ? null : { edge, x }
        const aimedTick = edge.fromTick + tickAt(x) - edge.grabTick
        const tick = Math.round(aimedTick / PPQ) * PPQ
        if(edge.kind == 'trackEnd') dragTrackEnd(aimedTick, tick, dropped)
        else dragLoopEnd(edge.loopOf, tick, dropped)
    }

    // Near the view's sides, the view scrolls and the end being dragged goes with it
    const lastEdgeScrollAtRef = useRef<number | null>(null)
    const scrollWhileDraggingEdge = (now: number) => {
        const drag = edgeDragRef.current
        const width = canvasRef.current?.getBoundingClientRect().width
        const lastAt = lastEdgeScrollAtRef.current
        lastEdgeScrollAtRef.current = drag ? now : null
        if(!drag || !width || lastAt === null) return

        // From 0 where the zone starts to 1 at the side, and past it
        const depth = Math.max(drag.x - (width - EDGE_SCROLL_ZONE_PX), EDGE_SCROLL_ZONE_PX - drag.x, 0) / EDGE_SCROLL_ZONE_PX
        if(depth == 0) return
        const direction = drag.x > width / 2 ? 1 : -1
        const pixels = Math.min(1, depth) * EDGE_SCROLL_MAX_PX_PER_S * (now - lastAt) / 1000
        scrollGlideRef.current = null
        ticksScrollRef.current = Math.max(0, ticksScrollRef.current + direction * pixels * PPQ / pixelsPerBeatRef.current)
        dragEdge(drag.edge, drag.x, false)
    }

    const saveTrackLength = (lengthTicks: number) =>
        updateTrack(trackRef.current.id, { length_ticks: Math.max(minTrackLength(), lengthTicks) }).then(syncTracks)

    // The track's end follows the mouse, on the beats or on the audio's end, never before a pattern's end,
    // and is saved once dropped
    const dragTrackEnd = (aimedTick: number, tick: number, dropped: boolean) => {
        const audioEnd = audioEndTickRef.current
        const isNearAudioEnd = audioEnd !== null &&
            ticksDurationToPixels(Math.abs(aimedTick - audioEnd), pixelsPerBeatRef.current) <= END_GRAB_PX
        const endTick = Math.max(minTrackLength(), isNearAudioEnd ? audioEnd : tick)
        draggedEndTickRef.current = endTick
        if(dropped) saveTrackLength(endTick)
    }

    // A double-click on the track's end tab: its length typed in a field there
    const [lengthFieldX, setLengthFieldX] = useState<number | null>(null)
    useEffect(() => {
        const canvas = canvasRef.current
        const onDoubleClick = (e: MouseEvent) => {
            if(!canvas) return
            const rect = canvas.getBoundingClientRect()
            if(edgeAt(e.clientX - rect.left, e.clientY - rect.top)?.kind != 'trackEnd') return
            setLengthFieldX(ticksOffsetToPixels(currentEndTick(), ticksScrollRef.current, pixelsPerBeatRef.current))
        }
        canvas?.addEventListener('dblclick', onDoubleClick)
        return () => canvas?.removeEventListener('dblclick', onDoubleClick)
    }, [])

    const commitTrackLength = (value: string) => {
        setLengthFieldX(null)
        const lengthTicks = parseTrackLength(value, track.bpm)
        if(lengthTicks !== null) saveTrackLength(lengthTicks)
    }

    // A loop's end follows the mouse, on the beats, and is saved once dropped
    const dragLoopEnd = (midiPattern: MidiPattern, tick: number, dropped: boolean) => {
        const midiPatterns = setLoopEnd(midiPatternsRef.current, midiPattern, tick, currentEndTick())
        midiPatternsRef.current = midiPatterns
        if(dropped) updateTrackDmxMidiAndSyncRef.current(midiPatterns)
    }

    const transformMidiPattern: (midiPattern: MidiPattern, x: number, y: number) => MidiPattern = (midiPattern, x, _y) => {
        const deltaTick = xToTicks({
            x,
            ticksScroll: 0, // We want delta tick
            pixelsPerBeat: pixelsPerBeatRef.current,
            magnet: true,
            magnetBeats: 1
        })
        return {
            ...midiPattern,
            ...{
                ticks: midiPattern.ticks + deltaTick,
                midi_notes: midiPattern.midi_notes.map(n => ({...n, ...{ticks: n.ticks + deltaTick}}))
            }
        }
    }

    const patternFromXY: (x: number, y: number) => MidiPattern | undefined = (x,y) => {
        if(y < 20 || y > 50) return undefined
        return undefined

        return {
            ticks: xToTicks({
                x,
                ticksScroll: ticksScrollRef.current,
                pixelsPerBeat: pixelsPerBeatRef.current,
                magnet: true,
                magnetBeats: 1
            }),
            durationTicks: PPQ,
            midi_notes: []
        }
    }

    const updateSelectedMidiPatterns = (updatedMidiPatterns: MidiPattern[]) => {
        if(midiPatternArrayEqual(selectedMidiPatternsRef.current, updatedMidiPatterns)) return
        
        const newPatterns = [
            ...midiPatternsRef.current.filter(p =>
                !midiPatternsInclude(selectedMidiPatternsRef.current, p)
            ),
            ...updatedMidiPatterns
        ]
        selectedMidiPatternsRef.current = updatedMidiPatterns
        midiPatternsRef.current = newPatterns
        updateTrackDmxMidiAndSyncRef.current(newPatterns)
    }

    
    
    return (<>
        <div className="midi-container">
            <div
                onDragOver={onDragOver}
                onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setIsDraggingAudio(false)}
                onDrop={onDrop}
                onContextMenu={onContextMenu}
                className={`midi-canvas-container${activeEditor === 'TrackEditor' ? ' midi-canvas-container--focused' : ''}`}>
                <canvas
                    ref={canvasRef}
                    id="midi-canvas"
                    width="300"
                    height="30"
                    />
                <CanvasMouseHandler
                    canvasRef={canvasRef}
                    ticksScrollRef={ticksScrollRef}
                    pixelsPerBeatRef={pixelsPerBeatRef}
                    onManualScroll={onManualScroll}
                    selectionRef={mouseSelectionRef}
                    selectedItemsRef={selectedMidiPatternsRef}
                    onSelectedItemsChange={() => setSelectedMidiPatterns(selectedMidiPatternsRef.current)}
                    itemsInRect={itemsInRect}
                    timelineHeight={20}
                    transformItem={transformMidiPattern}
                    updateSelectedItems={updateSelectedMidiPatterns}
                    itemFromXY={patternFromXY}
                    ghostItemRef={ghostMidiPatternRef}
                    hoverTickRef={hoverTickRef}
                    maxTick={endTick}
                    edgeAt={edgeAt}
                    dragEdge={dragEdge}
                    edgeTitle={edgeTitle}
                    isItemInSelection={(item, selected) => midiPatternsInclude(selected, item)}/>
                { lengthFieldX !== null && <div
                    className='track-length-field'
                    style={{ left: Math.max(0, lengthFieldX) }}
                    title='Minutes and seconds (3:30), or bars (96)'>
                    <InlineInput
                        className='track-length-input'
                        initialValue={formatDuration(tickToTime(endTick, track.bpm))}
                        onCommit={commitTrackLength}
                        onCancel={() => setLengthFieldX(null)}/>
                </div> }
                <AudioDropHint track={track} isDraggedOver={isDraggingAudio}/>
            </div>
            { audioMenu && <ContextMenu
                {...audioMenu}
                onClose={() => setAudioMenu(undefined)}
                items={audioMenuItems(track, chooseTrackAudioAndSync, resetTrackAudioAndSync)}/> }
        </div>
        
    </>)
}

export default MidiPlayer

