const BARS_PER_ROW = 3

// Where a bar without a position goes: rows of 3 bars, 1.5 m high, each row 1 m further upstage
export const defaultLedBarPosition = (index: number): Vector3Tuple => [
    ((index % BARS_PER_ROW) - 1) * 2.5,
    1.5,
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
