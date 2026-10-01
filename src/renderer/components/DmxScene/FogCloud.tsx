import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, InstancedMesh, Matrix4, NormalBlending, PlaneGeometry, ShaderMaterial } from 'three'

// Sizes in meters, speeds in seconds
// Soft puffs leave the nozzle forward (+Z), widen, rise a little and fade along the plume
const PUFFS = 48
const PLUME_LENGTH = 2.2
const PLUME_SPREAD = 0.7
const PLUME_RISE = 0.35
const PUFF_START_SIZE = 0.12
const PUFF_END_SIZE = 1.1
// A puff takes this long to go along the whole plume
const PUFF_LIFETIME = 3.5
// How opaque the thickest fog is
const MAX_OPACITY = 0.22
const FOG_COLOR = new Color('#c8ccd2')

// A puff is a disc fading from its center, always facing the camera.
// Its share of the opacity comes in its instance color (red), set from where it is along the plume
const FOG_MATERIAL = new ShaderMaterial({
    vertexShader: `
        varying vec2 vUv;
        varying float vAlpha;

        void main() {
            vUv = uv;
            vAlpha = 1.0;
            #ifdef USE_INSTANCING_COLOR
                vAlpha = instanceColor.r;
            #endif
            vec4 center = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            float size = length(instanceMatrix[0].xyz);
            gl_Position = projectionMatrix * (center + vec4(position.xy * size, 0.0, 0.0));
        }
    `,
    fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        varying vec2 vUv;
        varying float vAlpha;

        void main() {
            float d = length(vUv - 0.5) * 2.0;
            float soft = pow(max(1.0 - d, 0.0), 2.0);
            gl_FragColor = vec4(color, soft * opacity * vAlpha);
            #include <colorspace_fragment>
        }
    `,
    uniforms: {
        color: { value: FOG_COLOR },
        opacity: { value: 0 },
    },
    transparent: true,
    blending: NormalBlending,
    depthWrite: false,
})

const PUFF_GEOMETRY = new PlaneGeometry(1, 1)

interface Props {
    // The nozzle, in the fixture's space
    position: Vector3Tuple
    // How much fog comes out (0-1)
    density: number
}

// Fog coming out of a fog machine's nozzle, as thick as its DMX value.
// Drifts while there's fog: the scene is redrawn every frame meanwhile, and only on demand otherwise
const FogCloud = ({ position, density }: Props) => {
    const meshRef = useRef<InstancedMesh>(null)
    const invalidate = useThree(state => state.invalidate)
    // Each mesh has its own opacity
    const material = useMemo(() => FOG_MATERIAL.clone(), [])
    useEffect(() => () => material.dispose(), [])

    // Where each puff starts along the plume, and which way it goes
    const puffs = useMemo(() => Array.from({ length: PUFFS }, (_, i) => ({
        phase: i / PUFFS,
        angle: Math.random() * Math.PI * 2,
        spread: Math.sqrt(Math.random()),
    })), [])

    // Where the puffs are now
    const place = () => {
        const time = performance.now() / 1000
        const mesh = meshRef.current
        if (!mesh) return
        const matrix = new Matrix4()
        const alpha = new Color()
        puffs.forEach(({ phase, angle, spread }, i) => {
            const along = (phase + time / PUFF_LIFETIME) % 1
            const radius = PLUME_SPREAD * along * spread
            const size = PUFF_START_SIZE + (PUFF_END_SIZE - PUFF_START_SIZE) * along
            matrix.makeScale(size, size, size).setPosition(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius * 0.5 + PLUME_RISE * along * along,
                PLUME_LENGTH * along,
            )
            mesh.setMatrixAt(i, matrix)
            // Fades in out of the nozzle, and out at the end of the plume
            const fade = Math.min(1, along * 10) * (1 - along)
            mesh.setColorAt(i, alpha.setScalar(fade))
        })
        mesh.instanceMatrix.needsUpdate = true
        mesh.instanceColor!.needsUpdate = true
    }

    useLayoutEffect(() => {
        material.uniforms.opacity.value = density * MAX_OPACITY
        place()
        invalidate()
    }, [density])

    useFrame(() => {
        if (density <= 0) return
        place()
        invalidate()
    })

    return <group position={position}>
        <instancedMesh
            ref={meshRef}
            args={[PUFF_GEOMETRY, material, PUFFS]}
            visible={density > 0}
            frustumCulled={false}
            raycast={() => null}
            dispose={null}/>
    </group>
}

export default FogCloud
