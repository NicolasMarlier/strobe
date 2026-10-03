import { useEffect, useRef, type RefObject } from 'react'

// While the show plays, the camera drifts slowly around its place, like a camera operator's:
// a few slow waves whose periods don't line up, so the drift never visibly repeats.
// Each wave: an amplitude (meters), a period (seconds) and a phase
type Wave = [amplitude: number, period: number, phase: number]
const POSITION_WAVES: [x: Wave[], y: Wave[], z: Wave[]] = [
    [[0.35, 17, 0], [0.12, 7.3, 1.2]],
    [[0.10, 11, 2.1], [0.04, 5.1, 0.4]],
    [[0.25, 13, 4.0], [0.08, 6.7, 2.7]],
]
// The aimed point sways less than the camera, so the stage keeps the middle of the view
const TARGET_WAVES: [x: Wave[], y: Wave[], z: Wave[]] = [
    [[0.08, 19, 3.3]],
    [[0.04, 9.7, 1.7]],
    [[0, 1, 0]],
]

// The drift fades in when playback starts, and the camera glides back to its place when it stops
const FADE_IN_SECONDS = 1.5
const FADE_OUT_SECONDS = 1

// Playback is seen from the cursor: it is playing while the tick keeps moving forward, whether
// the app's Play or MainStage drives it. A single jump (a rewind, a click in the track) is not playing
const STEP_WINDOW_MS = 200
const STOPPED_AFTER_MS = 300

// Zoomed in, the same drift would look bigger: it shrinks with the zoom, from the default zoom
const DRIFT_ZOOM = 4

export interface CameraOffset {
    position: Vector3Tuple
    target: Vector3Tuple
}

export const NO_OFFSET: CameraOffset = { position: [0, 0, 0], target: [0, 0, 0] }

const sway = (waves: Wave[], time: number) =>
    waves.reduce((sum, [amplitude, period, phase]) => sum + amplitude * Math.sin(2 * Math.PI * time / period + phase), 0)

const swayAll = (waves: Wave[][], time: number, scale: number) =>
    waves.map(axis => sway(axis, time) * scale) as Vector3Tuple

// Moves the camera by an offset while the show plays, through onMove, and back to no offset when it stops.
// Checked on every animation frame: the scene itself is only drawn on demand
export const useCameraMotion = (
    tickRef: RefObject<number>,
    zoomRef: RefObject<number>,
    enabledRef: RefObject<boolean>,
    onMove: (offset: CameraOffset) => void,
) => {
    const onMoveRef = useRef(onMove)
    onMoveRef.current = onMove

    useEffect(() => {
        let lastTick = tickRef.current
        let lastStepAt = -Infinity
        let lastAdvanceAt = -Infinity
        // 0 at rest, 1 drifting fully
        let amount = 0
        // The drift's own clock only runs while it shows, so it starts again where it was
        let driftTime = 0
        let previousFrameAt = performance.now()
        let frame = 0

        const onFrame = (now: number) => {
            const elapsed = Math.min(0.1, (now - previousFrameAt) / 1000)
            previousFrameAt = now

            const tick = tickRef.current
            if (tick != lastTick) {
                if (tick > lastTick && now - lastStepAt < STEP_WINDOW_MS) lastAdvanceAt = now
                lastStepAt = now
                lastTick = tick
            }
            const playing = enabledRef.current && now - lastAdvanceAt < STOPPED_AFTER_MS

            const previousAmount = amount
            amount = playing
                ? Math.min(1, amount + elapsed / FADE_IN_SECONDS)
                : Math.max(0, amount - elapsed / FADE_OUT_SECONDS)

            if (amount > 0 || previousAmount > 0) {
                driftTime += elapsed
                // Eased, so the drift starts and settles without a jolt
                const eased = amount * amount * (3 - 2 * amount)
                const scale = eased * Math.min(1, DRIFT_ZOOM / zoomRef.current)
                onMoveRef.current({
                    position: swayAll(POSITION_WAVES, driftTime, scale),
                    target: swayAll(TARGET_WAVES, driftTime, scale),
                })
            }
            frame = requestAnimationFrame(onFrame)
        }
        frame = requestAnimationFrame(onFrame)
        return () => cancelAnimationFrame(frame)
    }, [])
}
