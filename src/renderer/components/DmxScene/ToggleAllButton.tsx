import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Group, Vector3 } from 'three'
import { framedArea } from './framing'

// Between the bar and the button, in pixels
const MARGIN = 10
// The button's size before it's measured, in pixels
const DEFAULT_SIZE = { width: 70, height: 22 }

interface Props {
    // The LED bar's group, and its housing's size (meters)
    barRef: RefObject<Group | null>
    barSize: Vector3Tuple
    label: string
    onClick: () => void
}

// The bar's box corners, in its own space
const corners = ([width, height, depth]: Vector3Tuple) =>
    [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z =>
        new Vector3(x * width / 2, y * height / 2, z * depth / 2))))

// Next to a LED bar, on the visible part of the scene: above the bar if it fits there,
// else below, on the left, or on the right. Placed on screen every frame, so it follows zooms and resizes.
// Hidden while the bar is out of view
const ToggleAllButton = ({ barRef, barSize, label, onClick }: Props) => {
    const anchorRef = useRef<Group>(null)
    const buttonRef = useRef<HTMLDivElement>(null)

    // Before Html places itself from the anchor (priority 0)
    useFrame(({ camera, size }) => {
        const bar = barRef.current
        const anchor = anchorRef.current
        const button = buttonRef.current
        if (!bar || !anchor || !button) return

        const toPixels = (point: Vector3) => {
            const ndc = point.clone().project(camera)
            return { x: (ndc.x + 1) / 2 * size.width, y: (1 - ndc.y) / 2 * size.height, behind: ndc.z > 1 }
        }

        bar.updateMatrixWorld()
        const points = corners(barSize).map(corner => toPixels(corner.applyMatrix4(bar.matrixWorld)))
        const area = framedArea(size.width, size.height)
        const right = area.left + area.width
        const bottom = area.top + area.height

        const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x))
        const minY = Math.min(...points.map(p => p.y)), maxY = Math.max(...points.map(p => p.y))
        const outOfView = points.some(p => p.behind) || maxX < area.left || minX > right || maxY < area.top || minY > bottom
        button.style.visibility = outOfView ? 'hidden' : ''
        if (outOfView) return

        const width = button.offsetWidth || DEFAULT_SIZE.width
        const height = button.offsetHeight || DEFAULT_SIZE.height
        const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2
        const candidates = [
            { x: centerX, y: minY - MARGIN - height / 2 },
            { x: centerX, y: maxY + MARGIN + height / 2 },
            { x: minX - MARGIN - width / 2, y: centerY },
            { x: maxX + MARGIN + width / 2, y: centerY },
        ]
        const fits = ({ x, y }: { x: number, y: number }) =>
            x - width / 2 >= area.left && x + width / 2 <= right && y - height / 2 >= area.top && y + height / 2 <= bottom
        // None fits: above, kept inside the visible part
        const spot = candidates.find(fits) ?? {
            x: Math.min(Math.max(candidates[0].x, area.left + width / 2), right - width / 2),
            y: Math.min(Math.max(candidates[0].y, area.top + height / 2), bottom - height / 2),
        }

        // Back in the scene, at the bar's depth
        const depth = bar.getWorldPosition(new Vector3()).project(camera).z
        anchor.position.set(spot.x / size.width * 2 - 1, 1 - spot.y / size.height * 2, depth).unproject(camera)
    }, -1)

    return <group ref={anchorRef}>
        <Html center zIndexRange={[0, 0]}>
            <div ref={buttonRef} className='toggle-all' onClick={onClick}>{label}</div>
        </Html>
    </group>
}

export default ToggleAllButton
