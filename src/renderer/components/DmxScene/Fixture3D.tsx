import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { Edges, TransformControls } from '@react-three/drei'
import { AdditiveBlending, CatmullRomCurve3, Color, CylinderGeometry, DoubleSide, Group, InstancedMesh, Line, LineBasicMaterial, MathUtils, Matrix4, Mesh, MeshBasicMaterial, Object3D, ShaderMaterial, SRGBColorSpace, TubeGeometry, Vector3 } from 'three'
import { useBarDrag } from './useBarDrag'
import FloorGuide from './FloorGuide'
import SelectionMarquee, { LensHoverPreview } from './SelectionMarquee'
import ToggleAllButton from './ToggleAllButton'
import FogCloud from './FogCloud'
import type { TransformControls as TransformControlsImpl } from 'three-stdlib'
import { cellChannels, cellFog, cellLight } from '../../../shared/fixtures'

// Sizes in meters, the housing's coming from the fixture.
// A bar's lenses sit side by side, sharing its width: joined in a continuous strip covering the whole
// front face, so a lit bar's face is all its color. A box's are smaller squares, this share of their room
const BOX_LENS_SCALE = 0.6

// Rotation rings snap to this step
const ROTATION_SNAP = MathUtils.degToRad(15)

// Dots are drawn brighter than their DMX value so lit dots go past the bloom threshold
const DOT_BRIGHTNESS = 2
// Added under every dot's color, so an unlit dot stays barely visible, below the bloom threshold.
// Added rather than swapped in when unlit: a dot dims down smoothly to it, never darker than unlit
const UNLIT_DOT = new Color('#1c1c1c')
// The housing is almost black, but for a box's lighter front face, around its lenses.
// A bar's lenses cover its whole front face: a lighter one would only show as a line around them
const HOUSING_COLOR = '#121212'
const HOUSING_FRONT_COLOR = '#5a5a5a'
const housingFaceColors = (shape: FixtureProfile['shape']) => {
    const front = shape == 'bar' ? HOUSING_COLOR : HOUSING_FRONT_COLOR
    return [HOUSING_COLOR, HOUSING_COLOR, HOUSING_COLOR, HOUSING_COLOR, front, HOUSING_COLOR]
}

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

// The housing's outline only shows a state: none on an idle bar.
// The lenses selected for a DMX button have their own dashed marquee (SelectionMarquee)
const EDGES_COLOR = {
    idle: null,
    hovered: '#888',
    editing: '#bbb',
}

interface Props {
    element: SceneElement
    fixture: FixtureProfile
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
    // Alt is held: the selected bar shows its rotation rings, and can't be moved
    rotating: boolean
}

// Whether the pointer is over one of the rotation rings.
// The controls keep the hovered axis (typed as private, but public in JavaScript)
export const isPointerOverGizmo = (gizmo: TransformControlsImpl | null) =>
    !!(gizmo as unknown as { axis: string | null } | null)?.axis

// Thickness of the rotation rings (their radius is 1, scaled to the screen by the controls)
const RING_THICKNESS = 0.035

// The X/Y/Z rings are 1px lines (WebGL lines can't be thicker): replaces each with a tube along
// the same points. Named and colored like the line, so the controls turn and highlight it the same way
const thickenRing = (group: Object3D, line: Line) => {
    const points = []
    const position = line.geometry.getAttribute('position')
    for (let i = 0; i < position.count; i++) points.push(new Vector3().fromBufferAttribute(position, i))

    const lineMaterial = line.material as LineBasicMaterial
    const tube = new Mesh(
        new TubeGeometry(new CatmullRomCurve3(points), points.length, RING_THICKNESS, 6),
        new MeshBasicMaterial({
            color: lineMaterial.color,
            opacity: lineMaterial.opacity,
            transparent: lineMaterial.transparent,
            depthTest: false,
            depthWrite: false,
            fog: false,
            toneMapped: false,
        }),
    )
    Object.assign(tube, { name: line.name, tag: (line as unknown as { tag?: string }).tag, renderOrder: line.renderOrder })
    group.remove(line)
    group.add(tube)
}

// Keeps only the X/Y/Z rings, which snap, and thickens them. Removes the free rotation handles
// (the outer ring, and the invisible trackball sphere that would cover the bar and catch the presses
// meant to move it), and the helper lines (an endless white line along the hovered ring's axis)
const setupRotationHandles = (gizmo: TransformControlsImpl) => {
    const { gizmo: handles, picker, helper } =
        (gizmo as unknown as { gizmo: Record<'gizmo' | 'picker' | 'helper', Record<string, Object3D>> }).gizmo
    for (const group of [handles.rotate, picker.rotate]) {
        group.children.filter(({ name }) => name == 'E' || name == 'XYZE').forEach(handle => group.remove(handle))
    }
    handles.rotate.children
        .filter((handle): handle is Line => handle instanceof Line)
        .forEach(line => thickenRing(handles.rotate, line))
    helper.rotate.clear()
}

// Light beams: an open cone per dot, from its lens forward (+Z), widening to BEAM_END_RADIUS
const BEAM_LENGTH = 3
const BEAM_START_RADIUS = 0.05
const BEAM_END_RADIUS = 0.35
const BEAM_INTENSITY = 0.03

const BEAM_GEOMETRY = new CylinderGeometry(BEAM_START_RADIUS, BEAM_END_RADIUS, BEAM_LENGTH, 24, 1, true)
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

// Each cell's lens (or nozzle) on the front face (+Z), spread along the housing's width
const lensLayout = ({ shape, size: [width, height] }: FixtureProfile, count: number) => {
    const pitch = width / count
    const side = Math.min(pitch, height) * BOX_LENS_SCALE
    return {
        width: shape == 'bar' ? pitch : side,
        height: shape == 'bar' ? height : side,
        // X of each lens, the housing being centered on its position
        x: (index: number) => (index - (count - 1) / 2) * pitch,
    }
}

// A scene element, drawn from its fixture: a housing with a lens per cell, lit by the live DMX signal.
// Cells making fog have a nozzle instead, and a fog cloud in front of it
const Fixture3D = (props: Props) => {
    const { element, fixture, dmxHexSignal, assignMode, editing, selectedRedChannels, onSelectRedChannels, onSelect, onMove, onRotate, gizmoRef, showBeams, rotating } = props
    const { cells: size, position, rotation } = element
    const [housingWidth, housingHeight, housingDepth] = fixture.size
    const lens = lensLayout(fixture, size)
    const dotX = lens.x
    // Lenses are just over the housing's front face
    const dotZ = housingDepth / 2 + 0.001
    const makesFog = fixture.cell.includes('fog')

    const invalidate = useThree(state => state.invalidate)
    const gl = useThree(state => state.gl)
    const groupRef = useRef<Group>(null)
    const dotsRef = useRef<InstancedMesh>(null)
    const beamsRef = useRef<InstancedMesh>(null)
    const [hovered, setHovered] = useState(false)
    // The lens under the pointer while assigning, to preview what a click does
    const [hoveredDot, setHoveredDot] = useState<number | undefined>(undefined)
    // A ring is being dragged: the rings stay until it's released, even if Alt is released first
    const [turning, setTurning] = useState(false)

    const redChannels = useMemo(() => cellChannels(element, fixture), [element.channel, size, fixture])
    const selected = redChannels.every(redChannel => selectedRedChannels.includes(redChannel))

    const drag = useBarDrag(groupRef, !assignMode && !rotating, onMove)

    // Dots' positions along the housing
    useLayoutEffect(() => {
        const matrix = new Matrix4()
        for (const mesh of [dotsRef.current!, beamsRef.current!]) {
            redChannels.forEach((_, i) => mesh.setMatrixAt(i, matrix.makeTranslation(dotX(i), 0, dotZ)))
            mesh.instanceMatrix.needsUpdate = true
            mesh.computeBoundingSphere()
        }
        invalidate()
    }, [redChannels, fixture])

    // Dots' and beams' colors follow the live DMX signal
    useLayoutEffect(() => {
        const dots = dotsRef.current!
        const beams = beamsRef.current!
        const color = new Color()
        redChannels.forEach((redChannel, i) => {
            const [red, green, blue] = cellLight(dmxHexSignal, redChannel, fixture.cell)
            color.setRGB(red, green, blue, SRGBColorSpace)
            beams.setColorAt(i, color)
            dots.setColorAt(i, color.multiplyScalar(DOT_BRIGHTNESS).add(UNLIT_DOT))
        })
        dots.instanceColor!.needsUpdate = true
        beams.instanceColor!.needsUpdate = true
        invalidate()
    }, [dmxHexSignal, redChannels, fixture])

    const showGizmo = editing && !assignMode && (rotating || turning)
    useEffect(() => {
        if (showGizmo && gizmoRef.current) setupRotationHandles(gizmoRef.current)
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

    // Pressing a bar selects it, and moves it unless rotating (Alt held: its rings rotate it)
    const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
        // The rotation rings in front of a bar get the click
        if (assignMode || e.button != 0 || isPointerOverGizmo(gizmoRef.current)) return
        onSelect()
        if (!rotating) drag.onPointerDown(e)
    }

    const edgesColor = editing ? EDGES_COLOR.editing
        : hovered ? EDGES_COLOR.hovered
        : EDGES_COLOR.idle

    const onRotationEnd = () => {
        setTurning(false)
        const { x, y, z } = groupRef.current!.rotation
        onRotate([x, y, z].map(angle => Math.round(MathUtils.radToDeg(angle) * 100) / 100) as Vector3Tuple)
    }

    return <>
    <group
        ref={groupRef}
        position={position}
        rotation={rotation.map(MathUtils.degToRad) as Vector3Tuple}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); setCursor(assignMode || rotating ? 'pointer' : 'grab') }}
        onPointerOut={() => { setHovered(false); setCursor('') }}
        onPointerDown={onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onPointerCancel={drag.onPointerCancel}>

        <mesh onClick={onHousingClick}>
            <boxGeometry args={fixture.size}/>
            {/* Box faces: +X, -X, +Y, -Y, +Z (the lenses' face), -Z */}
            { housingFaceColors(fixture.shape).map((color, i) => <meshBasicMaterial key={i} attach={`material-${i}`} color={color}/>) }
            { edgesColor && <Edges color={edgesColor}/> }
        </mesh>

        {/* Remounted when the dot count changes: an InstancedMesh has a fixed capacity */}
        <instancedMesh
            key={size}
            ref={dotsRef}
            args={[undefined, undefined, size]}
            onClick={onDotClick}
            onPointerMove={(e) => { if (assignMode && e.instanceId != hoveredDot) setHoveredDot(e.instanceId) }}
            onPointerOut={() => setHoveredDot(undefined)}>
            <planeGeometry args={[lens.width, lens.height]}/>
            <primitive object={DOT_MATERIAL} attach='material'/>
        </instancedMesh>

        <instancedMesh key={`beams-${size}`} ref={beamsRef} args={[BEAM_GEOMETRY, BEAM_MATERIAL, size]} visible={showBeams} raycast={() => null} dispose={null}/>

        { makesFog && redChannels.map((redChannel, i) => (
            <FogCloud key={i} position={[dotX(i), 0, dotZ]} density={cellFog(dmxHexSignal, redChannel, fixture.cell)}/>
        ))}

        {/* The lenses assigned to the selected DMX button */}
        { assignMode && <SelectionMarquee
            // The hovered lens is shown half-tinted instead (LensHoverPreview)
            selected={redChannels.map((redChannel, i) => i != hoveredDot && selectedRedChannels.includes(redChannel))}
            dotX={dotX}
            lensWidth={lens.width}
            lensHeight={lens.height}
            lensZ={dotZ}/> }

        { assignMode && hoveredDot != undefined && <LensHoverPreview
            index={hoveredDot}
            dotX={dotX}
            lensWidth={lens.width}
            lensHeight={lens.height}
            lensZ={dotZ}/> }
    </group>

    { editing && !assignMode && <FloorGuide barRef={groupRef} barLength={housingWidth} barThickness={Math.max(housingHeight, housingDepth)}/> }

    {/* Selects or unselects all the bar's lenses for the selected DMX button */}
    { assignMode &&
        <ToggleAllButton
            barRef={groupRef}
            barSize={fixture.size}
            label={selected ? 'Unlink all' : 'Link all'}
            onClick={() => onSelectRedChannels(redChannels, !selected)}/>
    }

    { showGizmo &&
        <TransformControls
            ref={gizmoRef}
            object={groupRef as React.RefObject<Group>}
            mode='rotate'
            space='local'
            size={0.7}
            rotationSnap={ROTATION_SNAP}
            onMouseDown={() => setTurning(true)}
            onMouseUp={onRotationEnd}/>
    }
    </>
}

export default Fixture3D
