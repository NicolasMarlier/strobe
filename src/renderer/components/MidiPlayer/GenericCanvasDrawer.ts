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

const primaryGridRatio = (tick: number, props: DrawerFunctionProps)  => {
    const { ppq, pixelsPerBeat } = props
    if(pixelsPerBeat > 20) return tick % ppq == 0
    else if(pixelsPerBeat > 10) return tick % (ppq * 4) == 0
    else return tick % (ppq * 16) == 0
}
const secondaryGridRatio = (tick: number, props: DrawerFunctionProps)  => {
    const { ppq, pixelsPerBeat } = props
    if(pixelsPerBeat > 20) return tick % (ppq / 4) == 0
    else if(pixelsPerBeat > 10) return tick % ppq == 0
    else return tick % (ppq * 4) == 0
}

export const drawBeatsGrid = (props: DrawerFunctionProps) => {
    const { ctx, ppq, height, ticksScroll, pixelsPerBeat, baseXOffset, baseYOffset } = props
    for(let tick=0; tick <= ppq * 60 * 10; tick+= 1) {
        const isPrimary = primaryGridRatio(tick, props)
        const isSecondary = secondaryGridRatio(tick, props)
        if(isPrimary || isSecondary) {
            ctx.fillStyle = isPrimary ? PRIMARY_GRID_COLOR : SECONDARY_GRID_COLOR;
            ctx.fillRect(
                ticksOffsetToPixels(tick, ticksScroll, pixelsPerBeat, baseXOffset),
                (baseYOffset || 0)- (isPrimary ? 6 : 3),
                1,
                height + (isPrimary ? 6 : 3)
            )
        }
    }
}

export const drawTimeline = (props: DrawerFunctionProps) => {
    const { ctx, ppq, ticksScroll, pixelsPerBeat, baseXOffset, baseYOffset } = props
    
    
    ctx.font = '10px monospace';
    ctx.textAlign = "left"
    ctx.textBaseline = "middle"
    ctx.fillStyle = "#ffffff66";
    for(let tick=0; tick <= ppq * 60 * 10; tick+= 1) {
        if(primaryGridRatio(tick, props)) {
            ctx.fillText(`${tick / ppq + 1}`, ticksOffsetToPixels(tick, ticksScroll, pixelsPerBeat, baseXOffset) + 3, (baseYOffset || 0) / 2);
        }
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