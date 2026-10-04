import { drawBeatsGrid, drawTimeline, drawCurrentTick, drawHoverTick, type DrawerFunctionProps, drawCurrentSelection, SELECTED_COLOR, ITEM_COLOR, drawRoundedRect, RECORDING_COLOR } from "./GenericCanvasDrawer";
import { isVisibleX, midiKeyToPixelsHeight, midiKeyToPixelsOffset, midiPatternToRectangle, setupCanvasDPR, ticksDurationToPixels, ticksOffsetToPixels } from "./utils";

interface Props {
    canvas: HTMLCanvasElement
    midiPatterns: MidiPattern[]
    recordingMidiPattern: MidiPattern | null
    ticksScroll: number
    pixelsPerBeat: number
    audioWaveData: Uint8Array
    // The track's end, and its length written there (m:ss)
    endTick: number
    endLabel: string
    ppq: number
    allMidiKeys: MidiKey[]
    selectedMidiPatterns: MidiPattern[]
    currentMidiTick: number
    hoverTick: number | null
    ghostMidiPattern: MidiPattern | undefined
    mouseSelection: MouseSelection | null
    transformMidiPattern: (midiPattern: MidiPattern, x: number, y: number) => MidiPattern
}


const drawAudioWave = (props: DrawerFunctionProps, audioWaveData: Uint8Array) => {
    const { ctx, ppq, ticksScroll, pixelsPerBeat, width, height } = props

    ctx.fillStyle = "#000000aa";
    ctx.beginPath();
    ctx.roundRect(
        0,
        3 * height / 5,
        width,
        2 * height / 5,
        4
    )
    ctx.fill();
    
    // One data point per tick: only draw the ticks that are on screen
    const firstTick = Math.max(0, Math.floor(ticksScroll - ppq / pixelsPerBeat))
    const lastTick = Math.min(audioWaveData.length - 1, Math.ceil(ticksScroll + width * ppq / pixelsPerBeat))

    ctx.fillStyle = "#ffffff06";
    for(let ticks = firstTick; ticks <= lastTick; ticks++) {
        const dataPointHeight = audioWaveData[ticks] * height * 2 / (255 * 5)
        ctx.fillRect(
            ticksOffsetToPixels(ticks, ticksScroll, pixelsPerBeat),
            height * 4 / 5 - dataPointHeight / 2,
            1,
            dataPointHeight
        )
    }
}

const END_TAB_FONT = '10px monospace'
const END_TAB_PADDING = 5
const measureContext = document.createElement('canvas').getContext('2d')

// The track's end tab, in the timeline, right after the end line: its length, to drag or double-click
export const endTabRect = (endX: number, endLabel: string, timelineHeight: number): Rectangle => {
    if(measureContext) measureContext.font = END_TAB_FONT
    const textWidth = measureContext?.measureText(endLabel).width ?? endLabel.length * 6
    return { x0: endX, y0: 2, x1: endX + textWidth + 2 * END_TAB_PADDING, y1: timelineHeight - 2 }
}

// Past the track's end: darkened, after a line, with its tab in the timeline
const drawPastEnd = (props: DrawerFunctionProps, endTick: number, endLabel: string) => {
    const { ctx, ticksScroll, pixelsPerBeat, width, height, baseYOffset } = props
    const x = ticksOffsetToPixels(endTick, ticksScroll, pixelsPerBeat)
    if(x > width) return

    ctx.fillStyle = "#000000aa";
    ctx.fillRect(Math.max(0, x), 0, width - Math.max(0, x), height)
    ctx.fillStyle = "#ffffff66";
    ctx.fillRect(x, 0, 1, height)

    const tab = endTabRect(x, endLabel, baseYOffset || 0)
    ctx.fillStyle = "#555";
    ctx.beginPath();
    ctx.roundRect(tab.x0, tab.y0, tab.x1 - tab.x0, tab.y1 - tab.y0, [0, 4, 4, 0])
    ctx.fill();
    ctx.font = END_TAB_FONT;
    ctx.textAlign = "left"
    ctx.textBaseline = "middle"
    ctx.fillStyle = "#fff";
    ctx.fillText(endLabel, tab.x0 + END_TAB_PADDING, (tab.y0 + tab.y1) / 2)
}

const drawMidiPattern = (props: DrawerFunctionProps, params: {midiPattern: MidiPattern, currentMidiTick: number}) => {
    const { ctx, width, height, ticksScroll, pixelsPerBeat, allMidiKeys } = props
    const { midiPattern, currentMidiTick } = params
    const rect = midiPatternToRectangle(
        midiPattern,
        height,
        ticksScroll,
        pixelsPerBeat
    )
    if(!isVisibleX(rect.x0, rect.x1, width)) return

    drawRoundedRect(ctx, rect)
    midiPattern.midi_notes.forEach((midiNote) => {
        ctx.fillStyle = "#00000055";
        
        // Highlight when played
        if(currentMidiTick >= midiNote.ticks && currentMidiTick < midiNote.ticks + midiNote.durationTicks) {
            ctx.fillStyle = "#ffffffcc";
        }

        ctx.fillRect(
            ticksOffsetToPixels(midiNote.ticks, ticksScroll, pixelsPerBeat) + 1,
            midiKeyToPixelsOffset(midiNote.midi, height, allMidiKeys),
            ticksDurationToPixels(midiNote.durationTicks, pixelsPerBeat) - 1,
            midiKeyToPixelsHeight(height)
        )
    })
}


interface DrawMidiPatternsArgs {
    midiPatterns: MidiPattern[],
    selectedMidiPatterns: MidiPattern[],
    currentMidiTick: number,
    endTick: number,
    mouseSelection: MouseSelection | null
    transformMidiPattern: (midiPattern: MidiPattern, x: number, y: number) => MidiPattern
}

const drawMidiPatterns = (props: DrawerFunctionProps, params: DrawMidiPatternsArgs) => {
    const { ctx } = props
    const { midiPatterns, selectedMidiPatterns, currentMidiTick, endTick, mouseSelection, transformMidiPattern } = params
    midiPatterns.forEach((midiPattern) => {
            const isSelected = selectedMidiPatterns.find((n) => n.ticks == midiPattern.ticks)
            ctx.fillStyle = isSelected ? SELECTED_COLOR : ITEM_COLOR
            
            const draggableMidiPattern = mouseSelection?.mode == 'drag' && isSelected ? transformMidiPattern(
                midiPattern,
                mouseSelection.rect.x1 - mouseSelection.rect.x0,
                mouseSelection.rect.y1 - mouseSelection.rect.y0
            ) : midiPattern
            
            drawMidiPattern(props, {midiPattern: draggableMidiPattern, currentMidiTick})
            
            
            if(midiPattern.loop_until_tick) {
                // Loops made before the track's end was known can run past it: they stop there
                const loopUntilTick = Math.min(midiPattern.loop_until_tick, endTick)
                for(let i = midiPattern.ticks + midiPattern.durationTicks; i < loopUntilTick; i += midiPattern.durationTicks) {
                    const loopedPattern = {
                        ticks: i,
                        durationTicks: Math.min(midiPattern.durationTicks, loopUntilTick - i),
                        midi_notes: midiPattern
                            .midi_notes
                            .map(n => ({...n, ...{ticks: n.ticks + i - midiPattern.ticks}}))
                            .filter(n => n.ticks < loopUntilTick)
                    }
                    ctx.fillStyle = isSelected ? SELECTED_COLOR + "33" : ITEM_COLOR + "33"
                    drawMidiPattern(props, {midiPattern: loopedPattern, currentMidiTick})
                }
            }
        })
}

const drawRecordingMidiPattern = (props: DrawerFunctionProps, args: {recordingMidiPattern: MidiPattern, currentMidiTick: number}) => {
    const { ctx } = props
    const { recordingMidiPattern: midiPattern, currentMidiTick } = args
    ctx.fillStyle = RECORDING_COLOR
    drawMidiPattern(props, {midiPattern, currentMidiTick})
}



const drawGhostMidiPattern = (props: DrawerFunctionProps, ghostMidiPattern: MidiPattern) => {
    drawMidiPattern(props, {midiPattern: ghostMidiPattern, currentMidiTick: -1})
}


export const redrawFullCanvas = (props: Props) => {
        const {
            canvas,
            midiPatterns,
            recordingMidiPattern,
            audioWaveData,
            endTick,
            endLabel,
            ghostMidiPattern,
            selectedMidiPatterns,
            currentMidiTick,
            hoverTick,
            mouseSelection,
            transformMidiPattern
        } = props

        const ctx = canvas.getContext("2d")
        if(!ctx) return

        const { width, height } = setupCanvasDPR(canvas, ctx, -2)

        const drawerFunctionProps: DrawerFunctionProps = {
            ...props,
            ...{
                width,
                height,
                ctx,
                baseYOffset: height/5
            }
        }
        
        // Background
        ctx.fillStyle = "#222";
        ctx.fillRect(0, 0, width, height)
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height/5)
        drawBeatsGrid(drawerFunctionProps)

        // Top part
        drawTimeline(drawerFunctionProps)
        
        // Middle part
        drawMidiPatterns(drawerFunctionProps, {midiPatterns, selectedMidiPatterns, currentMidiTick, endTick, mouseSelection, transformMidiPattern})
        if(recordingMidiPattern) drawRecordingMidiPattern(drawerFunctionProps, {recordingMidiPattern, currentMidiTick})
        if(ghostMidiPattern) {
            drawGhostMidiPattern(drawerFunctionProps, ghostMidiPattern)
        }

        // Bottom part
        drawAudioWave(drawerFunctionProps, audioWaveData)
        drawPastEnd(drawerFunctionProps, endTick, endLabel)

        // Overlay
        drawHoverTick(drawerFunctionProps, hoverTick)
        drawCurrentTick(drawerFunctionProps, currentMidiTick)
        if(mouseSelection?.mode == 'select') {
            drawCurrentSelection(drawerFunctionProps, mouseSelection.rect)
        }
    }