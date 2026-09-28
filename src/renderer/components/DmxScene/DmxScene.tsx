import './DmxScene.scss'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { MathUtils, PerspectiveCamera } from 'three'
import { Grid } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import type { TransformControls as TransformControlsImpl } from 'three-stdlib'
import LedBar, { isPointerOverGizmo } from "./LedBar";
import SceneSettings from "./SceneSettings";
import MoveHint from "./MoveHint";
import { useModifierKeys } from "./useModifierKeys";
import { framedArea } from "./framing";
import { useDmxButtonsContext } from "../../contexts/DmxButtonsContext";
import { useRealTimeContext } from "../../contexts/RealTimeContext";
import { useDmxSceneContext } from "../../contexts/DmxSceneContext";
import { LED_BAR_CENTER_POSITION } from "../../../shared/led_bar";

// Fixed camera: from the audience, a bit above head height, looking down at the middle of the stage
const CAMERA_POSITION: Vector3Tuple = [0, 2.2, 5]
// Aims at the middle of the stage, where a reset bar goes
const CAMERA_TARGET: Vector3Tuple = LED_BAR_CENTER_POSITION
// The camera frames this width of stage (in meters, at the target), whatever the panel's shape,
// without its vertical angle going over the maximum on narrow panels
const FRAMED_WIDTH = 8
const MAX_VERTICAL_FOV = 35

// The floor grid, in meters: from 2 m in front of the stage's front edge (z = 0) to 8 m behind it
const FLOOR_WIDTH = 12
const FLOOR_FRONT = 2
const FLOOR_BACK = -8

// Wide-angle lens: how much wider than the framed stage the camera sees
const WIDE_ANGLE = 6

// Zoom on the stage: 1 frames FRAMED_WIDTH, 2 half of it
const ZOOM_DEFAULT = 4
const ZOOM_MIN = 1.5
const ZOOM_MAX = 25
// How fast the trackpad zooms: pinching sends small deltas, scrolling with two fingers bigger ones
const PINCH_SPEED = 0.01
const SCROLL_SPEED = 0.002

// For shows saved without display options
const DEFAULT_DISPLAY: DmxSceneDisplay = { show_grid: true, show_beams: true, zoom: ZOOM_DEFAULT }

// A zoom is saved once it settles: pinching sends dozens of changes per second
const ZOOM_SAVE_DELAY_MS = 500

const clampZoom = (zoom: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom))

// Same as the app's background: the scene fills its section
const BACKGROUND = '#222'


// The camera sees WIDE_ANGLE times more than the framed stage, like a wide-angle lens:
// strong perspective, and room around the stage
const verticalFov = (aspect: number, zoom: number) => {
    const distance = Math.hypot(...CAMERA_POSITION.map((value, i) => value - CAMERA_TARGET[i]))
    const halfHeight = FRAMED_WIDTH / 2 / aspect
    const fov = Math.min(MathUtils.degToRad(MAX_VERTICAL_FOV), 2 * Math.atan(halfHeight / distance))
    return MathUtils.radToDeg(2 * Math.atan(Math.tan(fov / 2) / zoom * WIDE_ANGLE))
}

// Fixed camera, re-framed when the section is resized.
// It frames the free part of the section, and the canvas shows around it too (a view offset)
const FixedCamera = ({ zoom }: { zoom: number }) => {
    const camera = useThree(state => state.camera) as PerspectiveCamera & { manual?: boolean }
    const { width, height } = useThree(state => state.size)
    const invalidate = useThree(state => state.invalidate)

    // The scene is only drawn on demand: redraw it with the new framing,
    // or it would keep showing the previous zoom while the pointer picks with the new one
    useLayoutEffect(() => {
        const framed = framedArea(width, height)

        // The aspect is the framed part's, not the canvas': keep the canvas from resetting it
        camera.manual = true
        camera.position.set(...CAMERA_POSITION)
        camera.lookAt(...CAMERA_TARGET)
        camera.aspect = framed.width / framed.height
        camera.fov = verticalFov(camera.aspect, zoom)
        camera.setViewOffset(framed.width, framed.height, -framed.left, -framed.top, width, height)
        camera.updateProjectionMatrix()
        invalidate()
    }, [camera, width, height, zoom])

    return null
}

const DmxScene = () => {
    const { dmxButtons, selectedDmxButtonId } = useDmxButtonsContext()
    const { dmxScene, updateDmxScene, selectedLedBarIndex, setSelectedLedBarIndex } = useDmxSceneContext()
    const { dmxHexSignal } = useRealTimeContext()

    const { updateDmxButtonAndSync } = useDmxButtonsContext()
    const gizmoRef = useRef<TransformControlsImpl>(null)
    const sceneRef = useRef<HTMLDivElement>(null)

    // Display options, saved with the show
    const display = { ...DEFAULT_DISPLAY, ...dmxScene.display }
    const updateDisplay = (changes: Partial<DmxSceneDisplay>) =>
      updateDmxScene(dmxScene => ({ display: { ...DEFAULT_DISPLAY, ...dmxScene.display, ...changes } }))

    // Zoomed right away, saved once it settles
    const [zoom, setZoom] = useState(display.zoom)
    useEffect(() => setZoom(display.zoom), [display.zoom])
    useEffect(() => {
      if (zoom == display.zoom) return
      const timeout = setTimeout(() => updateDisplay({ zoom: Math.round(zoom * 100) / 100 }), ZOOM_SAVE_DELAY_MS)
      return () => clearTimeout(timeout)
    }, [zoom])
    const { shift, alt } = useModifierKeys()

    // Pinching the trackpad (a wheel event with ctrlKey) or scrolling with two fingers zooms.
    // Listened to natively: React's wheel listeners are passive, and can't keep the page from zooming
    useEffect(() => {
      const onWheel = (e: WheelEvent) => {
        e.preventDefault()
        const speed = e.ctrlKey ? PINCH_SPEED : SCROLL_SPEED
        setZoom(zoom => clampZoom(zoom * Math.exp(-e.deltaY * speed)))
      }
      const scene = sceneRef.current!
      scene.addEventListener('wheel', onWheel, { passive: false })
      return () => scene.removeEventListener('wheel', onWheel)
    }, [])

    const selectedRedChannels = dmxButtons.find(({id}) => selectedDmxButtonId == id)?.red_channels || []

    // With a DMX button selected, clicks assign the bars' channels to it.
    // Otherwise they select the bars, to move and rotate them.
    const assignMode = !!selectedDmxButtonId

    const onSelectRedChannels = (redChannels: number[], selected: boolean) => {
      if(!selectedDmxButtonId) return

      if(selected) {
        updateDmxButtonAndSync(selectedDmxButtonId, {red_channels: [...new Set([...selectedRedChannels, ...redChannels])]})
      }
      else {
        updateDmxButtonAndSync(selectedDmxButtonId, {red_channels: selectedRedChannels.filter(channel => redChannels.indexOf(channel) == -1)})
      }
    }

    const updateLedBar = (index: number, changes: Partial<LedBarConfig>) =>
      updateDmxScene({ led_bars: dmxScene.led_bars.map((ledBar, i) => i == index ? { ...ledBar, ...changes } : ledBar) })

    // A click in the void closes the edited bar, but not a click on its rotation rings
    const onPointerMissed = () => {
      if (isPointerOverGizmo(gizmoRef.current)) return
      setSelectedLedBarIndex(undefined)
    }

    // LED bars' channels are edited in the details panel next to the scene (DmxSceneDetails)
    return <div className='dmx-scene' ref={sceneRef}>
      <Canvas
        frameloop='demand'
        onPointerMissed={onPointerMissed}>

        <FixedCamera zoom={zoom}/>
        <color attach='background' args={[BACKGROUND]}/>

        <Grid
          visible={display.show_grid}
          position={[0, 0, (FLOOR_FRONT + FLOOR_BACK) / 2]}
          args={[FLOOR_WIDTH, FLOOR_FRONT - FLOOR_BACK]}
          cellSize={0.25}
          cellThickness={0.6}
          cellColor='#2a2a2a'
          sectionSize={1}
          sectionThickness={1}
          sectionColor='#3d3d3d'
          fadeDistance={30}/>

        { dmxScene.led_bars.map((ledBarConfig, index) => (
          <LedBar
            key={index}
            config={ledBarConfig}
            dmxHexSignal={dmxHexSignal}
            assignMode={assignMode}
            editing={selectedLedBarIndex == index}
            selectedRedChannels={selectedRedChannels}
            onSelectRedChannels={onSelectRedChannels}
            onSelect={() => setSelectedLedBarIndex(index)}
            onMove={(position) => updateLedBar(index, { position })}
            onRotate={(rotation) => updateLedBar(index, { rotation })}
            gizmoRef={gizmoRef}
            showBeams={display.show_beams}
            rotating={alt}/>
        ))}

        <EffectComposer>
          <Bloom mipmapBlur luminanceThreshold={0.2} intensity={1.2}/>
        </EffectComposer>
      </Canvas>

      <SceneSettings display={display} onChange={updateDisplay}/>

      {/* The selected bar can be moved: bars can't be moved while assigning channels */}
      { selectedLedBarIndex != undefined && !assignMode && <MoveHint shift={shift} alt={alt}/> }

      {/* On a log scale, so each step zooms as much */}
      <input
        className='zoom-slider'
        type='range'
        title='Zoom'
        min={Math.log(ZOOM_MIN)}
        max={Math.log(ZOOM_MAX)}
        step={0.01}
        value={Math.log(zoom)}
        onChange={(e) => setZoom(clampZoom(Math.exp(Number(e.target.value))))}/>
    </div>
}

export default DmxScene
