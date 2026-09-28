const BARS_PER_ROW = 3

// Height of a bar's center when it rests on the floor: half its 10 cm housing
export const LED_BAR_FLOOR_HEIGHT = 0.05

// The middle of the stage, on the floor, where the camera looks: to bring back a bar lost out of view
export const LED_BAR_CENTER_POSITION: Vector3Tuple = [0, LED_BAR_FLOOR_HEIGHT, 0]

// Where a bar without a position goes: rows of 3 bars on the floor, each row 1 m further upstage
export const defaultLedBarPosition = (index: number): Vector3Tuple => [
    ((index % BARS_PER_ROW) - 1) * 2.5,
    LED_BAR_FLOOR_HEIGHT,
    -1 - Math.floor(index / BARS_PER_ROW),
]

// Shows saved before the 3D scene placed their bars with CSS (`style`): that's dropped,
// and bars without a position are laid out in the default rows
export const migrateDmxScene = (dmxScene: DmxScene): DmxScene => ({
    ...dmxScene,
    led_bars: dmxScene.led_bars.map(({ channel, rgb_dots_count, position, rotation }, index) => ({
        channel,
        rgb_dots_count,
        position: position ?? defaultLedBarPosition(index),
        rotation: rotation ?? [0, 0, 0],
    })),
})
