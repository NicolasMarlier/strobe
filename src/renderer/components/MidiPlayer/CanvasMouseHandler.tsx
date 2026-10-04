import { useEffect, useRef, type RefObject } from "react";
import { PPQ, xToTicks } from "./utils";
import { useDmxMidiContext } from "../../contexts/DmxMidiContext";
import { useRealTimeContext } from "../../contexts/RealTimeContext";

interface Props<T, E> {
    canvasRef: RefObject<HTMLCanvasElement | null>
    ticksScrollRef: RefObject<number>
    pixelsPerBeatRef: RefObject<number>
    selectionRef: RefObject<MouseSelection | null>
    onSelectedItemsChange?: () => void
    timelineHeight: number,
    selectedItemsRef: RefObject<T[]>,
    itemsInRect: (rect: Rectangle) => T[],
    transformItem: (item: T, x: number, y: number) => T,
    updateSelectedItems: (items: T[]) => void
    itemFromXY: (x: number, y: number) => T | undefined,
    ghostItemRef: RefObject<T | undefined>,
    isItemInSelection?: (item: T, selectedItems: T[]) => boolean,
    x0?: number,
    editorMode?: 'TrackEditor' | 'PatternEditor',
    onManualScroll?: () => void,
    // Where a click would put the cursor, while the mouse is over the timeline and may move it; else null
    hoverTickRef?: RefObject<number | null>,
    // The cursor goes no further (the track's end)
    maxTick?: number,
    // The edge under x, y (a loop's end, the track's end): the mouse drags it, rather than seeking or
    // selecting
    edgeAt?: (x: number, y: number) => E | undefined,
    // The edge dragged to x, then dropped there. A click that doesn't move leaves it alone
    dragEdge?: (edge: E, x: number, dropped: boolean) => void,
    // The tooltip over an edge
    edgeTitle?: (edge: E) => string,
}

// A playhead: a triangle pointing down over a line, white outlined in black to show on any background.
// Its hotspot is on the line, where the cursor would go
const SEEK_CURSOR_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='15' height='22' viewBox='0 0 15 22'>
<path d='M1.5 1.5h12v5.5l-5.25 4.5v9h-1.5v-9l-5.25-4.5z' fill='white' stroke='black' stroke-width='1.2' stroke-linejoin='round'/>
</svg>`
const SEEK_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(SEEK_CURSOR_SVG)}") 7 11, pointer`

// How far the mouse must go, in pixels, before a click on an item moves it: a click that only selects
// often slips by a pixel or two
const DRAG_THRESHOLD = 5

const CanvasMouseHandler = <T, E = never>(props: Props<T, E>) => {
    const {
        canvasRef,
        ticksScrollRef,
        pixelsPerBeatRef,
        selectionRef,
        selectedItemsRef,
        ghostItemRef,
    } = props

    const { setActiveEditor } = useDmxMidiContext()
    const { seek, drivenByMidi } = useRealTimeContext()

    // Keep all non-ref props fresh so the registered-once handlers never use stale closures
    const p = useRef({
        ...props,
        isItemInSelection: props.isItemInSelection ?? ((item: T, selected: T[]) => selected.includes(item)),
        x0: props.x0 ?? 0,
        editorMode: props.editorMode ?? 'TrackEditor' as const,
        setActiveEditor,
        seek,
        drivenByMidi,
    })
    p.current = {
        ...props,
        isItemInSelection: props.isItemInSelection ?? ((item: T, selected: T[]) => selected.includes(item)),
        x0: props.x0 ?? 0,
        editorMode: props.editorMode ?? 'TrackEditor' as const,
        setActiveEditor,
        seek,
        drivenByMidi,
    }

    // Whether the mouse went past DRAG_THRESHOLD since the click on an item
    const dragStartedRef = useRef(false)

    const canvasTop = () => canvasRef.current?.getBoundingClientRect().top || 0
    const canvasLeft = () => canvasRef.current?.getBoundingClientRect().left || 0

    // The tick a click at this x in the timeline moves the cursor to
    const seekTickAt = (clientX: number) => Math.min(
        p.current.maxTick ?? Infinity,
        xToTicks({
            x: clientX - canvasLeft(),
            ticksScroll: ticksScrollRef.current,
            pixelsPerBeat: pixelsPerBeatRef.current,
            magnet: true,
            magnetMode: 'line',
            magnetBeats: pixelsPerBeatRef.current > 20 ? 0.25 : 1,
            x0: p.current.x0,
        })
    )

    // The edge being dragged, and whether the mouse moved since it was grabbed
    const edgeDragRef = useRef<{ edge: E, moved: boolean } | null>(null)
    const edgeAt = (event: MouseEvent) => p.current.edgeAt?.(event.clientX - canvasLeft(), event.clientY - canvasTop())

    // Over the timeline, where a click moves the cursor (not the piano keys on its left)
    const isOverTimeline = (event: MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return false
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        return x >= p.current.x0 && x < rect.width && y >= 0 && y < p.current.timelineHeight
    }

    // A playhead-shaped mouse cursor and a faint cursor where a click would put it; neither while MainStage
    // drives playback
    const showSeekHover = (tick: number | null) => {
        if (p.current.hoverTickRef) p.current.hoverTickRef.current = tick
        if (canvasRef.current) canvasRef.current.style.cursor = tick === null ? '' : SEEK_CURSOR
    }

    const onMouseUp = (event: MouseEvent) => {
        if(edgeDragRef.current) {
            const { edge, moved } = edgeDragRef.current
            if(moved) p.current.dragEdge?.(edge, event.clientX - canvasLeft(), true)
            edgeDragRef.current = null
        }
        else if(selectionRef.current?.mode == 'drag') {
            const deltaX = selectionRef.current.rect.x1 - selectionRef.current.rect.x0
            const deltaY = selectionRef.current.rect.y1 - selectionRef.current.rect.y0
            p.current.updateSelectedItems(
                selectedItemsRef.current.map(i => p.current.transformItem(i, deltaX, deltaY))
            )
        }
        else if(ghostItemRef.current) {
            p.current.updateSelectedItems([ghostItemRef.current])
        }
        selectionRef.current = null
    }

    const setSelectedItems = (items: T[]) => {
        selectedItemsRef.current = items
        if(p.current.onSelectedItemsChange) p.current.onSelectedItemsChange()
    }

    const onMouseDown = (event: MouseEvent) => {
        p.current.setActiveEditor(p.current.editorMode)
        // A right-click (or Ctrl-click) opens a menu, it doesn't select nor move the cursor
        if(event.button == 2 || event.ctrlKey) return

        const edge = edgeAt(event)
        if(edge !== undefined) {
            selectionRef.current = null
            edgeDragRef.current = { edge, moved: false }
        }
        else if(event.clientY - canvasTop() >= 0 &&
            event.clientY - canvasTop() < p.current.timelineHeight) {

            selectionRef.current = null
            p.current.seek(seekTickAt(event.clientX))
        }
        else if(event.clientY - canvasTop() > p.current.timelineHeight) {
            const x = event.clientX - canvasLeft()
            const y = event.clientY - canvasTop()
            const items = p.current.itemsInRect({x0:x, y0:y, x1: x, y1: y})

            if(items.length == 0) {
                setSelectedItems([])
                selectionRef.current = {
                    mode: 'select',
                    rect: {
                        x0: event.clientX - canvasLeft(),
                        y0: event.clientY - canvasTop(),
                        x1: event.clientX - canvasLeft(),
                        y1: event.clientY - canvasTop(),
                    }
                }
            }
            else {
                const clickedItemAlreadySelected = items.some(item => p.current.isItemInSelection(item, selectedItemsRef.current))
                if(event.shiftKey) {
                    setSelectedItems([...selectedItemsRef.current, ...items])
                }
                else if(!clickedItemAlreadySelected) {
                    setSelectedItems(items)
                }
                dragStartedRef.current = false
                selectionRef.current = {
                    mode: 'drag',
                    rect: {
                        x0: event.clientX - canvasLeft(),
                        y0: event.clientY - canvasTop(),
                        x1: event.clientX - canvasLeft(),
                        y1: event.clientY - canvasTop(),
                    }
                }
            }
        }
    }

    const onMouseDownMove = (event: MouseEvent) => {
        ghostItemRef.current = undefined
        showSeekHover(null)

        if(selectionRef.current) {
            const x = event.clientX - canvasLeft()
            const y = event.clientY - canvasTop()
            if(selectionRef.current.mode == 'drag' && !dragStartedRef.current) {
                const { x0, y0 } = selectionRef.current.rect
                if(Math.hypot(x - x0, y - y0) < DRAG_THRESHOLD) return
                dragStartedRef.current = true
            }
            selectionRef.current = {
                mode: selectionRef.current.mode,
                rect: {
                    x0: selectionRef.current.rect.x0,
                    y0: selectionRef.current.rect.y0,
                    x1: x,
                    y1: y,
                }
            }
            if(selectionRef.current.mode == 'select') {
                setSelectedItems(p.current.itemsInRect(selectionRef.current.rect))
            }
        }
    }

    const onMouseMove = (event: MouseEvent) => {
        if(edgeDragRef.current) {
            edgeDragRef.current.moved = true
            p.current.dragEdge?.(edgeDragRef.current.edge, event.clientX - canvasLeft(), false)
            return
        }
        (!selectionRef.current ? onMouseUpMove : onMouseDownMove)(event)
    }

    const onMouseUpMove = (event: MouseEvent) => {
        const edge = edgeAt(event)
        if (canvasRef.current) canvasRef.current.title = edge !== undefined ? p.current.edgeTitle?.(edge) ?? '' : ''
        if(edge !== undefined) {
            ghostItemRef.current = undefined
            showSeekHover(null)
            if (canvasRef.current) canvasRef.current.style.cursor = 'ew-resize'
            return
        }
        if(isOverTimeline(event)) {
            ghostItemRef.current = undefined
            showSeekHover(p.current.drivenByMidi ? null : seekTickAt(event.clientX))
            return
        }
        showSeekHover(null)
        if(p.current.itemsInRect({
            x0: event.clientX - canvasLeft(),
            y0: event.clientY - canvasTop(),
            x1: event.clientX - canvasLeft(),
            y1: event.clientY - canvasTop()
        }).length > 0) {
            ghostItemRef.current = undefined
        }
        else {
            ghostItemRef.current = p.current.itemFromXY(
                event.clientX - canvasLeft(),
                event.clientY - canvasTop()
            )
        }
    }

    const onWheel = (e: WheelEvent) => {
        e.preventDefault()
        p.current.setActiveEditor(p.current.editorMode)

        if(Math.abs(e.deltaX) > Math.abs(e.deltaY) && e.deltaX != 0) {
            const scrollAmount = (e.deltaX) * 1000
            ticksScrollRef.current = Math.max(0, ticksScrollRef.current + scrollAmount / pixelsPerBeatRef.current)
            p.current.onManualScroll?.()
        }
        else if(e.deltaY != 0) {
            const cursorX = e.clientX - canvasLeft()
            const zoomRatio = 1 + (e.deltaY) * 0.01
            const oldPixelsPerBeat = pixelsPerBeatRef.current
            const newPixelsPerBeat = Math.min(Math.max(2, oldPixelsPerBeat * zoomRatio), 200)
            const tickAtCursor = ticksScrollRef.current + (cursorX - p.current.x0) * PPQ / oldPixelsPerBeat
            pixelsPerBeatRef.current = newPixelsPerBeat
            ticksScrollRef.current = Math.max(0, tickAtCursor - (cursorX - p.current.x0) * PPQ / newPixelsPerBeat)
        }
    }


    useEffect(() => {
        document.addEventListener('mouseup', onMouseUp)
        document.addEventListener('mousemove', onMouseMove)
        canvasRef.current?.addEventListener('mousedown', onMouseDown)
        canvasRef.current?.addEventListener('wheel', onWheel, {passive: false})
        return () => {
            document.removeEventListener("mouseup", onMouseUp);
            document.removeEventListener("mousemove", onMouseMove);
            canvasRef.current?.removeEventListener('mousedown', onMouseDown)
            canvasRef.current?.removeEventListener('wheel', onWheel)
        }
    }, [])

    return <></>
}

export default CanvasMouseHandler
