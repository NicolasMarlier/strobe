import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { Edges, TransformControls } from '@react-three/drei'
import { AdditiveBlending, Color, CylinderGeometry, DoubleSide, Group, InstancedMesh, MathUtils, Matrix4, Object3D, ShaderMaterial, SRGBColorSpace } from 'three'
import { LED_DOT_PITCH } from '../../../shared/led_bar'
import { useBarDrag } from './useBarDrag'
import type { TransformControls as TransformControlsImpl } from 'three-stdlib'

// Sizes in meters
const DOT_RADIUS = 0.04
const HOUSING_HEIGHT = 0.1
const HOUSING_DEPTH = 0.06
// The dots are lenses on the housing's front face (+Z), just over it
const DOT_Z = HOUSING_DEPTH / 2 + 0.001

// Rotation rings snap to this step
const ROTATION_SNAP = MathUtils.degToRad(15)

// Dots are drawn brighter than their DMX value so lit dots go past the bloom threshold
const DOT_BRIGHTNESS = 2
// An unlit dot stays visible, below the bloom threshold
const UNLIT_DOT = new Color(0.04, 0.04, 0.04)
// Seen side-on, a dot keeps this share of its brightness
const SIDE_BRIGHTNESS = 0.05

// A LED shines forward: full brightness seen from the front, fading to SIDE_BRIGHTNESS seen side-on
// (the bloom follows, as it only spreads bright pixels). Single-sided: from behind, only the housing shows.
// Shared by all the bars
const DOT_MATERIAL = new ShaderMaterial({
    vertexShader: `
        varying vec3 vColor;
        varying float vFacing;

        void main() {
            vColor = vec3(1.0);
            #ifdef USE_INSTANCING_COLOR
                vColor = instanceColor;
            #endif
            vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
            vec3 viewNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
            vFacing = max(dot(viewNormal, normalize(-mvPosition.xyz)), 0.0);
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform float sideBrightness;
        varying vec3 vColor;
        varying float vFacing;

        void main() {
            gl_FragColor = vec4(vColor * mix(sideBrightness, 1.0, vFacing), 1.0);
            #include <colorspace_fragment>
        }
    `,
    uniforms: { sideBrightness: { value: SIDE_BRIGHTNESS } },
})

const EDGES_COLOR = {
    idle: '#444',
    hovered: '#888',
    editing: '#bbb',
    assigned: '#fff',
}

interface Props {
    config: LedBarConfig
    dmxHexSignal: string
    // A DMX button is selected: clicks assign channels to it instead of selecting and moving the bar
    assignMode: boolean
    editing: boolean
    selectedRedChannels: number[]
    onSelectRedChannels: (channels: number[], selected: boolean) => void
    onSelect: () => void
    onMove: (position: Vector3Tuple) => void
    onRotate: (rotation: Vector3Tuple) => void
    // Rotation rings of the bar being edited (a single one in the scene)
    gizmoRef: React.RefObject<TransformControlsImpl | null>
    showBeams: boolean
}

// Whether the pointer is over one of the rotation rings.
// The controls keep the hovered axis (typed as private, but public in JavaScript)
export const isPointerOverGizmo = (gizmo: TransformControlsImpl | null) =>
    !!(gizmo as unknown as { axis: string | null } | null)?.axis

// Keeps only the X/Y/Z rings, which snap: removes the free rotation handles (the outer ring,
// and the invisible trackball sphere that would cover the bar and catch the presses meant to move it)
const removeFreeRotationHandles = (gizmo: TransformControlsImpl) => {
    const { gizmo: handles, picker } = (gizmo as unknown as { gizmo: Record<'gizmo' | 'picker', Record<string, Object3D>> }).gizmo
    for (const group of [handles.rotate, picker.rotate]) {
        group.children.filter(({ name }) => name == 'E' || name == 'XYZE').forEach(handle => group.remove(handle))
    }
}

// Light beams: an open cone per dot, from its lens forward (+Z), widening to BEAM_END_RADIUS
const BEAM_LENGTH = 3
const BEAM_END_RADIUS = 0.35
const BEAM_INTENSITY = 0.03

const BEAM_GEOMETRY = new CylinderGeometry(DOT_RADIUS, BEAM_END_RADIUS, BEAM_LENGTH, 24, 1, true)
    // The cylinder's top (narrow end) at the lens, its axis along +Z
    .rotateX(-Math.PI / 2)
    .translate(0, 0, BEAM_LENGTH / 2)

// Additive and fading with the distance, softer on the cone's edges, like a beam in haze.
// An unlit dot's beam is black: it adds nothing. Shared by all the bars
const BEAM_MATERIAL = new ShaderMaterial({
    vertexShader: `
        uniform float beamLength;
        varying vec3 vColor;
        varying float vAlong;
        varying float vFacing;

        void main() {
            vColor = vec3(1.0);
            #ifdef USE_INSTANCING_COLOR
                vColor = instanceColor;
            #endif
            vAlong = position.z / beamLength;
            vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
            vec3 viewNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
            vFacing = abs(dot(viewNormal, normalize(-mvPosition.xyz)));
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform float intensity;
        varying vec3 vColor;
        varying float vAlong;
        varying float vFacing;

        void main() {
            float fade = (1.0 - vAlong) * (1.0 - vAlong);
            gl_FragColor = vec4(vColor * intensity * fade * vFacing, 1.0);
            #include <colorspace_fragment>
        }
    `,
    uniforms: {
        beamLength: { value: BEAM_LENGTH },
        intensity: { value: BEAM_INTENSITY },
    },
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
})

// DMX Channels are setup on device, from 001 to 511
// The DMX signal is composed on hexadecimal values
const dmxSignalAtChannel = (dmxHexSignal: DmxHexSignal, channel: number) => {
    return parseInt(dmxHexSignal.slice(2*channel, 2*channel + 2), 16) || 0
}

// X of each dot along the bar, the bar being centered on its position
const dotX = (index: number, count: number) => (index - (count - 1) / 2) * LED_DOT_PITCH

const LedBar = (props: Props) => {
    const { config, dmxHexSignal, assignMode, editing, selectedRedChannels, onSelectRedChannels, onSelect, onMove, onRotate, gizmoRef, showBeams } = props
    const { channel, rgb_dots_count: size } = config
    const position = config.position ?? [0, 0, 0]
    const rotation = config.rotation ?? [0, 0, 0]

    const invalidate = useThree(state => state.invalidate)
    const gl = useThree(state => state.gl)
    const groupRef = useRef<Group>(null)
    const dotsRef = useRef<InstancedMesh>(null)
    const beamsRef = useRef<InstancedMesh>(null)
    const [hovered, setHovered] = useState(false)

    const redChannels = useMemo(() => Array.from(Array(size).keys()).map((i) => channel + i * 3), [channel, size])
    const selected = redChannels.every(redChannel => selectedRedChannels.includes(redChannel))

    const drag = useBarDrag(groupRef, !assignMode, onMove)

    // Dots' positions along the bar
    useLayoutEffect(() => {
        const matrix = new Matrix4()
        for (const mesh of [dotsRef.current!, beamsRef.current!]) {
            redChannels.forEach((_, i) => mesh.setMatrixAt(i, matrix.makeTranslation(dotX(i, size), 0, DOT_Z)))
            mesh.instanceMatrix.needsUpdate = true
            mesh.computeBoundingSphere()
        }
        invalidate()
    }, [redChannels])

    // Dots' and beams' colors follow the live DMX signal
    useLayoutEffect(() => {
        const dots = dotsRef.current!
        const beams = beamsRef.current!
        const color = new Color()
        const black = new Color(0, 0, 0)
        redChannels.forEach((redChannel, i) => {
            const red = dmxSignalAtChannel(dmxHexSignal, redChannel + 0)
            const green = dmxSignalAtChannel(dmxHexSignal, redChannel + 1)
            const blue = dmxSignalAtChannel(dmxHexSignal, redChannel + 2)
            const unlit = red + green + blue == 0
            color.setRGB(red / 255, green / 255, blue / 255, SRGBColorSpace)
            beams.setColorAt(i, unlit ? black : color)
            dots.setColorAt(i, unlit ? UNLIT_DOT : color.multiplyScalar(DOT_BRIGHTNESS))
        })
        dots.instanceColor!.needsUpdate = true
        beams.instanceColor!.needsUpdate = true
        invalidate()
    }, [dmxHexSignal, redChannels])

    const showGizmo = editing && !assignMode
    useEffect(() => {
        if (showGizmo && gizmoRef.current) removeFreeRotationHandles(gizmoRef.current)
    }, [showGizmo])

    const setCursor = (cursor: string) => { gl.domElement.style.cursor = cursor }

    const onHousingClick = (e: ThreeEvent<MouseEvent>) => {
        if (!assignMode) return
        e.stopPropagation()
        onSelectRedChannels(redChannels, !selected)
    }

    const onDotClick = (e: ThreeEvent<MouseEvent>) => {
        if (!assignMode || e.instanceId == undefined) return
        e.stopPropagation()
        const redChannel = redChannels[e.instanceId]
        onSelectRedChannels([redChannel], !selectedRedChannels.includes(redChannel))
    }

    // Moving the bar selects it, so its rotation rings show up
    const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
        // The rotation rings in front of a bar get the click
        if (assignMode || e.button != 0 || isPointerOverGizmo(gizmoRef.current)) return
        onSelect()
        drag.onPointerDown(e)
    }

    const edgesColor = selected ? EDGES_COLOR.assigned
        : editing ? EDGES_COLOR.editing
        : hovered ? EDGES_COLOR.hovered
        : EDGES_COLOR.idle

    const onRotationEnd = () => {
        const { x, y, z } = groupRef.current!.rotation
        onRotate([x, y, z].map(angle => Math.round(MathUtils.radToDeg(angle) * 100) / 100) as Vector3Tuple)
    }

    return <>
    <group
        ref={groupRef}
        position={position}
        rotation={rotation.map(MathUtils.degToRad) as Vector3Tuple}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); setCursor(assignMode ? 'pointer' : 'grab') }}
        onPointerOut={() => { setHovered(false); setCursor('') }}
        onPointerDown={onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onPointerCancel={drag.onPointerCancel}>

        <mesh onClick={onHousingClick}>
            <boxGeometry args={[size * LED_DOT_PITCH, HOUSING_HEIGHT, HOUSING_DEPTH]}/>
            <meshBasicMaterial color='#151515'/>
            <Edges color={edgesColor}/>
        </mesh>

        {/* Remounted when the dot count changes: an InstancedMesh has a fixed capacity */}
        <instancedMesh key={size} ref={dotsRef} args={[undefined, undefined, size]} onClick={onDotClick}>
            <circleGeometry args={[DOT_RADIUS, 24]}/>
            <primitive object={DOT_MATERIAL} attach='material'/>
        </instancedMesh>

        <instancedMesh key={`beams-${size}`} ref={beamsRef} args={[BEAM_GEOMETRY, BEAM_MATERIAL, size]} visible={showBeams} raycast={() => null} dispose={null}/>

        {/* Dots assigned one by one to the selected button, when the whole bar isn't */}
        { !selected && redChannels.map((redChannel, i) => selectedRedChannels.includes(redChannel) && (
            <mesh key={redChannel} position={[dotX(i, size), 0, DOT_Z + 0.001]} raycast={() => null}>
                <torusGeometry args={[DOT_RADIUS * 1.35, 0.006, 8, 32]}/>
                <meshBasicMaterial color='#fff' toneMapped={false}/>
            </mesh>
        ))}
    </group>

    { showGizmo &&
        <TransformControls
            ref={gizmoRef}
            object={groupRef as React.RefObject<Group>}
            mode='rotate'
            space='local'
            size={0.7}
            rotationSnap={ROTATION_SNAP}
            onMouseUp={onRotationEnd}/>
    }
    </>
}

export default LedBar
