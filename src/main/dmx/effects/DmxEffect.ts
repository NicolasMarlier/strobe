import { DmxButton } from "../../sequelize/models/dmx_button"
import { colorHexToArray, setDmxAt } from "./utils"

type DmxHexSignal = string

class DmxEffect {
    static transformDmxHexSignal = (
        dmxHexSignal: DmxHexSignal,
        _completeness: number,
        _dmxButton: DmxButton,
        _trigger: DmxButtonTrigger
    ) => {
        return dmxHexSignal
    }

    static computeCompleteness = (durationMs: number, triggeredAt: number) => (
        durationMs > 0
            ? Math.min(1, (Date.now() - triggeredAt) / durationMs)
            : 1
    )

    static setToColor = (
        redChannels: number[],
        color: string,
        dmxHexSignal: DmxHexSignal,
        colorIntensity: number = 1
    ) => {
        let newSignal = dmxHexSignal

        const colorArray = colorHexToArray(color)

        redChannels.forEach(redChannel => {
            newSignal = setDmxAt(newSignal, redChannel + 0, Math.floor(colorArray[0] * colorIntensity))
            newSignal = setDmxAt(newSignal, redChannel + 1, Math.floor(colorArray[1] * colorIntensity))
            newSignal = setDmxAt(newSignal, redChannel + 2, Math.floor(colorArray[2] * colorIntensity))
        })
        return newSignal
    }
}

export default DmxEffect
