import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Group, Mesh, Vector3 } from 'three'

// Just over the floor, so the shadow doesn't flicker with the grid
const FLOOR_Y = 0.003

interface Props {
    // The LED bar's group, moved directly while it's dragged
    barRef: RefObject<Group | null>
    barLength: number
    // Width of the bar's shadow on the floor
    barThickness: number
}

// Under the selected LED bar, to see where it is over the floor: its shadow,
// a line down to the floor, and its height. Follows the bar every frame, dragged included
const FloorGuide = ({ barRef, barLength, barThickness }: Props) => {
    const shadowRef = useRef<Group>(null)
    const dropLineRef = useRef<Mesh>(null)
    const labelRef = useRef<Group>(null)
    const heightRef = useRef<HTMLDivElement>(null)

    useFrame(() => {
        const bar = barRef.current
        const shadow = shadowRef.current
        const dropLine = dropLineRef.current
        const label = labelRef.current
        if (!bar || !shadow || !dropLine || !label) return

        // The bar's ends, flattened on the floor: a lying bar casts a strip, a standing one a square
        bar.updateMatrixWorld()
        const start = new Vector3(-barLength / 2, 0, 0).applyMatrix4(bar.matrixWorld)
        const end = new Vector3(barLength / 2, 0, 0).applyMatrix4(bar.matrixWorld)
        const { x, y, z } = bar.position

        shadow.position.set(x, FLOOR_Y, z)
        shadow.rotation.y = -Math.atan2(end.z - start.z, end.x - start.x)
        shadow.scale.x = Math.hypot(end.x - start.x, end.z - start.z) + barThickness

        dropLine.position.set(x, y / 2, z)
        dropLine.scale.y = Math.max(y, 0.001)

        label.position.set(x, y / 2, z)
        if (heightRef.current) heightRef.current.textContent = `${y.toFixed(2)} m`
    })

    return <>
        <group ref={shadowRef}>
            <mesh rotation-x={-Math.PI / 2} scale={[1, barThickness, 1]} raycast={() => null}>
                <planeGeometry args={[1, 1]}/>
                <meshBasicMaterial color='#000' transparent opacity={0.5} depthWrite={false}/>
            </mesh>
        </group>

        <mesh ref={dropLineRef} raycast={() => null}>
            <cylinderGeometry args={[0.004, 0.004, 1, 6]}/>
            <meshBasicMaterial color='#fff' transparent opacity={0.35} depthWrite={false}/>
        </mesh>

        <group ref={labelRef}>
            <Html center zIndexRange={[0, 0]} style={{ pointerEvents: 'none' }}>
                <div ref={heightRef} className='floor-guide-height'/>
            </Html>
        </group>
    </>
}

export default FloorGuide
