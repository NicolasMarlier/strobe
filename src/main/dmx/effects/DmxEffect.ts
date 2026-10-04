import { colorHexToArray } from "../../../shared/dmx_signal"
import { CellLayouts, setCellColor } from "../../../shared/fixtures"

type DmxHexSignal = string

class DmxEffect {
    static transformDmxHexSignal = (
        dmxHexSignal: DmxHexSignal,
        _completeness: number,
        _dmxButton: DmxButton,
        _trigger: DmxButtonTrigger,
        _layouts: CellLayouts
    ) => {
        return dmxHexSignal
    }

    static computeCompleteness = (durationMs: number, triggeredAt: number) => (
        durationMs > 0
            ? Math.min(1, (Date.now() - triggeredAt) / durationMs)
            : 1
    )

    // Sets each cell to the color, dimmed by its intensity (0-1), the same for all or one per cell
    static setToColor = (
        redChannels: number[],
        color: string,
        dmxHexSignal: DmxHexSignal,
        layouts: CellLayouts,
        colorIntensity: number | ((redChannel: number) => number) = 1
    ) => {
        const colorArray = colorHexToArray(color)

        return redChannels.reduce((signal, redChannel) => {
            const intensity = typeof colorIntensity == 'function' ? colorIntensity(redChannel) : colorIntensity
            return setCellColor(
                signal,
                redChannel,
                layouts(redChannel),
                colorArray.map(value => value * intensity) as [number, number, number]
            )
        }, dmxHexSignal)
    }
}

export default DmxEffect
