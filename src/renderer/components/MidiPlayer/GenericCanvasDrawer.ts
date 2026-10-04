import { ticksOffsetToPixels } from "./utils"


export const PRIMARY_GRID_COLOR = "#333"
export const SECONDARY_GRID_COLOR = "#282828"

export const SELECTED_COLOR = "#e8531a"
export const ITEM_COLOR = "#3ad400"
export const RECORDING_COLOR = "#9221e866"

export interface DrawerFunctionProps {
    canvas: HTMLCanvasElement,
    width: number
    height: number
    ctx: CanvasRenderingContext2D
    ticksScroll: number
    pixelsPerBeat: number
    ppq: number
    allMidiKeys: MidiKey[]
    baseXOffset?: number
    baseYOffset?: number
}

export const drawRoundedRect = (ctx: CanvasRenderingContext2D, rect: Rectangle) => {
    ctx.beginPath();
    ctx.roundRect(
        rect.x0,
        rect.y0,
        rect.x1 - rect.x0,
        rect.y1 - rect.y0,
        4
    )
    ctx.fill();
}

export const drawCurrentTick = (props: DrawerFunctionProps, currentMidiTick: number) => {
    const { ctx, ticksScroll, pixelsPerBeat, height, baseXOffset } = props
    ctx.fillStyle = "#fff";
    ctx.fillRect(
        ticksOffsetToPixels(currentMidiTick, ticksScroll, pixelsPerBeat, baseXOffset || 0),
        0,
        1,
        height
    )
}

// Where a click in the timeline would put the cursor: a faint line under the mouse
export const drawHoverTick = (props: DrawerFunctionProps, hoverTick: number | null) => {
    if (hoverTick === null) return
    const { ctx, ticksScroll, pixelsPerBeat, height, baseXOffset } = props
    ctx.fillStyle = "#ffffff30";
    ctx.fillRect(
        ticksOffsetToPixels(hoverTick, ticksScroll, pixelsPerBeat, baseXOffset || 0),
        0,
        1,
        height
    )
}

const primaryGridStep = ({ ppq, pixelsPerBeat }: DrawerFunctionProps) => {
    if(pixelsPerBeat > 20) return ppq
    else if(pixelsPerBeat > 10) return ppq * 4
    else return ppq * 16
}
const secondaryGridStep = ({ ppq, pixelsPerBeat }: DrawerFunctionProps) => {
    if(pixelsPerBeat > 20) return ppq / 4
    else if(pixelsPerBeat > 10) return ppq
    else return ppq * 4
}

// Multiples of `step` within the first 10 minutes that are visible on the canvas
// (with a margin on the left for labels drawn to the right of their tick)
const visibleTicks = (props: DrawerFunctionProps, step: number, marginPx = 50) => {
    const { ppq, width, ticksScroll, pixelsPerBeat, baseXOffset } = props
    const pixelsToTicks = (px: number) => px * ppq / pixelsPerBeat
    const firstTick = Math.max(0, ticksScroll - pixelsToTicks((baseXOffset || 0) + marginPx))
    const lastTick = Math.min(ppq * 60 * 10, ticksScroll + pixelsToTicks(width - (baseXOffset || 0)))

    const ticks: number[] = []
    for(let tick = Math.ceil(firstTick / step) * step; tick <= lastTick; tick += step) {
        ticks.push(tick)
    }
    return ticks
}

export const drawBeatsGrid = (props: DrawerFunctionProps) => {
    const { ctx, height, ticksScroll, pixelsPerBeat, baseXOffset, baseYOffset } = props
    const primaryStep = primaryGridStep(props)
    // The secondary step divides the primary one, so this also covers every primary line
    for(const tick of visibleTicks(props, secondaryGridStep(props))) {
        const isPrimary = tick % primaryStep == 0
        ctx.fillStyle = isPrimary ? PRIMARY_GRID_COLOR : SECONDARY_GRID_COLOR;
        ctx.fillRect(
            ticksOffsetToPixels(tick, ticksScroll, pixelsPerBeat, baseXOffset),
            (baseYOffset || 0)- (isPrimary ? 6 : 3),
            1,
            height + (isPrimary ? 6 : 3)
        )
    }
}

export const drawTimeline = (props: DrawerFunctionProps) => {
    const { ctx, ppq, ticksScroll, pixelsPerBeat, baseXOffset, baseYOffset } = props
    
    
    ctx.font = '10px monospace';
    ctx.textAlign = "left"
    ctx.textBaseline = "middle"
    ctx.fillStyle = "#ffffff66";
    for(const tick of visibleTicks(props, primaryGridStep(props))) {
        ctx.fillText(`${tick / ppq + 1}`, ticksOffsetToPixels(tick, ticksScroll, pixelsPerBeat, baseXOffset) + 3, (baseYOffset || 0) / 2);
    }

    ctx.fillStyle = '#111'
}

export const drawCurrentSelection = (props: DrawerFunctionProps, mouseSelection: Rectangle) => {
    const { ctx } = props
    ctx.strokeStyle = "#ffffff88";
    ctx.strokeRect(
        mouseSelection.x0,
        mouseSelection.y0,
        mouseSelection.x1 - mouseSelection.x0,
        mouseSelection.y1 - mouseSelection.y0,
    )
}