import { DmxButton } from "../../sequelize/models/dmx_button"
import DmxEffect from "./DmxEffect"
import { setDmxAt } from "./utils"
import { colorHexToArray } from "./utils"

class DmxSet extends DmxEffect {
    static transformDmxHexSignal = (
        dmxHexSignal: DmxHexSignal,
        _completeness: number,
        dmxButton: DmxButton,
        _trigger: DmxButtonTrigger
    ) => {
        return DmxEffect.setToColor(
            dmxButton.red_channels,
            dmxButton.color,
            dmxHexSignal
        )
    }
}
export default DmxSet