import { useRef, type RefObject } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { Group, Plane, Vector3 } from 'three'

// Moves snap to this step, in meters (hold Alt to move freely)
const SNAP = 0.05

type DragMode = 'floor' | 'height'

interface Drag {
    pointerId: number
    mode: DragMode
    plane: Plane
    // From the point under the pointer to the bar's center, so the bar doesn't jump to the pointer
    offset: Vector3
    moved: boolean
}

const snap = (value: number, free: boolean) =>
    // Rounded to the millimeter, so saved positions don't carry float noise
    Math.round((free ? value : Math.round(value / SNAP) * SNAP) * 1000) / 1000

// Drags a LED bar in the 3D scene seen from a fixed camera:
// a plain drag slides it on the floor (X/Z), Shift+drag moves it up and down (Y).
// The bar is moved directly on its Three.js group while dragging, and `onCommit` saves it once released.
export const useBarDrag = (
    groupRef: RefObject<Group | null>,
    enabled: boolean,
    onCommit: (position: Vector3Tuple) => void,
) => {
    const camera = useThree(state => state.camera)
    const invalidate = useThree(state => state.invalidate)
    const dragRef = useRef<Drag | null>(null)

    // The plane the pointer moves on: horizontal through the bar for the floor,
    // vertical and facing the camera for the height
    const planeFor = (mode: DragMode, through: Vector3) => {
        if (mode == 'floor') return new Plane().setFromNormalAndCoplanarPoint(new Vector3(0, 1, 0), through)

        const normal = camera.position.clone().sub(through).setY(0).normalize()
        return new Plane().setFromNormalAndCoplanarPoint(normal, through)
    }

    // Starts (or restarts, when Shift is pressed or released mid-drag) moving on the mode's plane
    const anchor = (drag: Pick<Drag, 'pointerId' | 'moved'>, mode: DragMode, e: ThreeEvent<PointerEvent>): Drag | null => {
        const position = groupRef.current!.position
        const plane = planeFor(mode, position)
        const hit = e.ray.intersectPlane(plane, new Vector3())
        if (!hit) return null
        return { ...drag, mode, plane, offset: position.clone().sub(hit) }
    }

    const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
        if (!enabled || e.button != 0 || !groupRef.current) return
        e.stopPropagation()
        const drag = anchor({ pointerId: e.pointerId, moved: false }, e.shiftKey ? 'height' : 'floor', e)
        if (!drag) return
        dragRef.current = drag
        ;(e.target as Element).setPointerCapture(e.pointerId)
    }

    const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
        let drag = dragRef.current
        const group = groupRef.current
        if (!drag || drag.pointerId != e.pointerId || !group) return
        e.stopPropagation()

        const mode: DragMode = e.shiftKey ? 'height' : 'floor'
        if (mode != drag.mode) {
            drag = anchor(drag, mode, e)
            if (!drag) return
            dragRef.current = drag
        }

        const hit = e.ray.intersectPlane(drag.plane, new Vector3())
        if (!hit) return
        const target = hit.add(drag.offset)
        const free = e.altKey

        if (mode == 'floor') {
            group.position.x = snap(target.x, free)
            group.position.z = snap(target.z, free)
        } else {
            group.position.y = Math.max(0, snap(target.y, free))
        }
        drag.moved = true
        invalidate()
    }

    const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
        const drag = dragRef.current
        if (!drag || drag.pointerId != e.pointerId) return
        e.stopPropagation()
        ;(e.target as Element).releasePointerCapture(e.pointerId)
        dragRef.current = null
        if (drag.moved) onCommit(groupRef.current!.position.toArray())
    }

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp }
}
