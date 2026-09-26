import { useEffect, useRef, type RefObject } from "react";
import { PPQ, xToTicks } from "./utils";
import { useDmxMidiContext } from "../../contexts/DmxMidiContext";
import { useRealTimeContext } from "../../contexts/RealTimeContext";

interface Props<T> {
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
}

const CanvasMouseHandler = <T,>(props: Props<T>) => {
    const {
        canvasRef,
        ticksScrollRef,
        pixelsPerBeatRef,
        selectionRef,
        selectedItemsRef,
        ghostItemRef,
    } = props

    const { setActiveEditor } = useDmxMidiContext()
    const { sendCurrentTickToServer } = useRealTimeContext()

    // Keep all non-ref props fresh so the registered-once handlers never use stale closures
    const p = useRef({
        ...props,
        isItemInSelection: props.isItemInSelection ?? ((item: T, selected: T[]) => selected.includes(item)),
        x0: props.x0 ?? 0,
        editorMode: props.editorMode ?? 'TrackEditor' as const,
        setActiveEditor,
        sendCurrentTickToServer,
    })
    p.current = {
        ...props,
        isItemInSelection: props.isItemInSelection ?? ((item: T, selected: T[]) => selected.includes(item)),
        x0: props.x0 ?? 0,
        editorMode: props.editorMode ?? 'TrackEditor' as const,
        setActiveEditor,
        sendCurrentTickToServer,
    }

    const canvasTop = () => canvasRef.current?.getBoundingClientRect().top || 0
    const canvasLeft = () => canvasRef.current?.getBoundingClientRect().left || 0

    const onMouseUp = (_event: MouseEvent) => {
        if(selectionRef.current?.mode == 'drag') {
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

        if(event.clientY - canvasTop() >= 0 &&
            event.clientY - canvasTop() < p.current.timelineHeight) {

            selectionRef.current = null
            const magnetBeats = pixelsPerBeatRef.current > 20 ? 0.25 : 1
            p.current.sendCurrentTickToServer(
                xToTicks({
                    x: event.clientX - canvasLeft(),
                    ticksScroll: ticksScrollRef.current,
                    pixelsPerBeat: pixelsPerBeatRef.current,
                    magnet: true,
                    magnetMode: 'line',
                    magnetBeats,
                    x0: p.current.x0,
                })
            )
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

        if(selectionRef.current) {
            selectionRef.current = {
                mode: selectionRef.current.mode,
                rect: {
                    x0: selectionRef.current.rect.x0,
                    y0: selectionRef.current.rect.y0,
                    x1: event.clientX - canvasLeft(),
                    y1: event.clientY - canvasTop(),
                }
            }
            if(selectionRef.current.mode == 'select') {
                setSelectedItems(p.current.itemsInRect(selectionRef.current.rect))
            }
        }
    }

    const onMouseMove = (event: MouseEvent) => (
        !selectionRef.current ? onMouseUpMove : onMouseDownMove
    )(event)

    const onMouseUpMove = (event: MouseEvent) => {
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
