import { drawBeatsGrid, drawTimeline, drawCurrentTick, type DrawerFunctionProps, drawCurrentSelection, SELECTED_COLOR, ITEM_COLOR, drawRoundedRect, RECORDING_COLOR } from "./GenericCanvasDrawer";
import { midiKeyToPixelsHeight, midiKeyToPixelsOffset, midiPatternToRectangle, setupCanvasDPR, ticksDurationToPixels, ticksOffsetToPixels } from "./utils";

interface Props {
    canvas: HTMLCanvasElement
    midiPatterns: MidiPattern[]
    recordingMidiPattern: MidiPattern | null
    ticksScroll: number
    pixelsPerBeat: number
    audioWaveData: Uint8Array
    ppq: number
    allMidiKeys: MidiKey[]
    selectedMidiPatterns: MidiPattern[]
    currentMidiTick: number
    ghostMidiPattern: MidiPattern | undefined
    mouseSelection: MouseSelection | null
    transformMidiPattern: (midiPattern: MidiPattern, x: number, y: number) => MidiPattern
}


const drawAudioWave = (props: DrawerFunctionProps, audioWaveData: Uint8Array) => {
    const { ctx, ticksScroll, pixelsPerBeat, width, height } = props

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
    
    ctx.fillStyle = "#ffffff06";
    audioWaveData.forEach((dataPoint, ticks) => {
        const dataPointHeight = dataPoint * height * 2 / (255 * 5)
        ctx.fillRect(
            ticksOffsetToPixels(ticks, ticksScroll, pixelsPerBeat),
            height * 4 / 5 - dataPointHeight / 2,
            1,
            dataPointHeight
        )
    })
}

const drawMidiPattern = (props: DrawerFunctionProps, params: {midiPattern: MidiPattern, currentMidiTick: number}) => {
    const { ctx,  height, ticksScroll, pixelsPerBeat, allMidiKeys } = props
    const { midiPattern, currentMidiTick } = params
    const rect = midiPatternToRectangle(
        midiPattern,
        height,
        ticksScroll,
        pixelsPerBeat
    )
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
    mouseSelection: MouseSelection | null
    transformMidiPattern: (midiPattern: MidiPattern, x: number, y: number) => MidiPattern
}

const drawMidiPatterns = (props: DrawerFunctionProps, params: DrawMidiPatternsArgs) => {
    const { ctx } = props
    const { midiPatterns, selectedMidiPatterns, currentMidiTick, mouseSelection, transformMidiPattern } = params
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
                const loopUntilTick = midiPattern.loop_until_tick
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
            ghostMidiPattern,
            selectedMidiPatterns,
            currentMidiTick,
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
        drawMidiPatterns(drawerFunctionProps, {midiPatterns, selectedMidiPatterns, currentMidiTick, mouseSelection, transformMidiPattern})
        if(recordingMidiPattern) drawRecordingMidiPattern(drawerFunctionProps, {recordingMidiPattern, currentMidiTick})
        if(ghostMidiPattern) {
            drawGhostMidiPattern(drawerFunctionProps, ghostMidiPattern)
        }

        // Bottom part
        drawAudioWave(drawerFunctionProps, audioWaveData)

        // Overlay
        drawCurrentTick(drawerFunctionProps, currentMidiTick)
        if(mouseSelection?.mode == 'select') {
            drawCurrentSelection(drawerFunctionProps, mouseSelection.rect)
        }
    }