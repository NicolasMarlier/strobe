import { DmxButton } from "../../sequelize/models/dmx_button"
import DmxEffect from "./DmxEffect"

class DmxToggle extends DmxEffect {
    static transformDmxHexSignal = (
        dmxHexSignal: DmxHexSignal,
        completeness: number,
        dmxButton: DmxButton,
        trigger: DmxButtonTrigger
    ) => this.setToColor(
        dmxButton.red_channels,
        dmxButton.color,
        dmxHexSignal,
        trigger.state === 'up' ? completeness : 1 - completeness
    )
}
export default DmxToggle
