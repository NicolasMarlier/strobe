import { DmxButton } from "../../sequelize/models/dmx_button";
import DmxEffect from "./DmxEffect";
import { colorHexToArray, setDmxAt } from "./utils"

class DmxInverseRun extends DmxEffect {
    static transformDmxHexSignal = (
        dmxHexSignal: DmxHexSignal,
        completeness: number,
        dmxButton: DmxButton,
        _trigger: DmxButtonTrigger
    ) => {
        let newSignal = dmxHexSignal
        const spread = 2 * 3
        
        const startRedChannel = Math.min(...dmxButton.red_channels) - 2 * 3
        const endRedChannel = Math.max(...dmxButton.red_channels) + 2 * 3

        
        const center = startRedChannel + (endRedChannel - startRedChannel) * (1 - completeness)

        const colorArray = colorHexToArray(dmxButton.color)

        dmxButton.red_channels.forEach(redChannel => {

            const colorIntensity = Math.max(0, 1 - (Math.abs(center - redChannel) / spread))
            newSignal = setDmxAt(newSignal, redChannel + 0, Math.floor(colorArray[0] * colorIntensity))
            newSignal = setDmxAt(newSignal, redChannel + 1, Math.floor(colorArray[1] * colorIntensity))
            newSignal = setDmxAt(newSignal, redChannel + 2, Math.floor(colorArray[2] * colorIntensity))
        })

        return newSignal
    }
}

export default DmxInverseRun