import './TrackEditor.scss'

import { useEffect, useRef, useState } from 'react';
import { useRealTimeContext } from '../../contexts/RealTimeContext';
import { getWave } from './waves';
import { redrawFullCanvas } from './TrackEditorCanvasDrawer';
import Draggable from '../DesignSystem/Draggable/Draggable';
import { addNoteAtTick, insertPatternsAtTick, magnettedTick, nextFreeTick, toggleLoopForPatterns } from './utils_midi_notes';
import { doRectanglesIntersect, midiPatternToRectangle, PPQ, xToTicks } from './utils';
import CanvasMouseHandler from './CanvasMouseHandler';
import { useDmxMidiContext } from '../../contexts/DmxMidiContext';
import { useDmxButtonsContext } from '../../contexts/DmxButtonsContext';
import { isSelected, midiPatternArrayEqual, midiPatternsInclude, splitPatternsAtTick, sum } from './utils_midi_patterns';
import { isPageEdit, useMenuMessage } from '../../useEditMenu';

const BEATS_OFFSET = 2
// Following the cursor, the view turns its page once the cursor passes this share of its width
const FOLLOW_PAGE_EDGE = 0.9
const FOLLOW_GLIDE_MS = 150

interface Props {
    track: Track
}

const BASE_PIXELS_PER_BEAT = 40

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

    const { audioUrl, uploadTrackAudioAndSync } = useDmxButtonsContext()

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
        updateTrackDmxMidiAndSyncRef.current(toggleLoopForPatterns(midiPatternsRef.current, selectedMidiPatternsRef.current))
    }

    // Back to Start, one beat back or forward. While MainStage drives playback, it alone moves the cursor
    const moveCursor = (to: 'start' | 'back' | 'forward') => {
        if(drivenByMidiRef.current) return
        const beat = magnettedTick(midiCurrentTickRef.current, 1)
        const targetTick = to == 'start' ? 0 : to == 'back' ? Math.max(0, beat - PPQ) : beat + PPQ
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

    const onDropAudioFile = (file: File) => {
        uploadTrackAudioAndSync(file)
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
                const duration = nextFreeTick(midiPatternsRef.current, midiCurrentTickRef.current) - midiCurrentTickRef.current
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
            allMidiKeys: allMidiKeysRef.current,
            mouseSelection: mouseSelectionRef.current,
            ghostMidiPattern: ghostMidiPatternRef.current,
            transformMidiPattern,
        })
    }

    // Only a moving cursor turns the page: zooming while it stands still leaves the view alone
    const followCursor = (now: number) => {
        const tick = midiCurrentTickRef.current
        const moved = tick != lastFollowedTickRef.current
        lastFollowedTickRef.current = tick
        if(!canvasRef.current) return

        const visibleTicks = canvasRef.current.getBoundingClientRect().width * PPQ / pixelsPerBeatRef.current
        const scroll = scrollGlideRef.current?.to ?? ticksScrollRef.current
        const inPage = tick >= scroll && tick <= scroll + visibleTicks * FOLLOW_PAGE_EDGE

        // Scrolled away by hand: following again once the cursor shows in the view
        if(!isFollowingRef.current) {
            if(!inPage) return
            isFollowingRef.current = true
            setIsFollowing(true)
        }
        if(!moved || inPage) return

        scrollGlideRef.current = {
            from: ticksScrollRef.current,
            to: Math.max(0, tick - BEATS_OFFSET * PPQ),
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

    const mainLoop = (now: number) => {
        followCursor(now)
        glideScroll(now)
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
            <Draggable
                onDropFile={onDropAudioFile}
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
                    isItemInSelection={(item, selected) => midiPatternsInclude(selected, item)}/>
            </Draggable>
        </div>
        
    </>)
}

export default MidiPlayer

