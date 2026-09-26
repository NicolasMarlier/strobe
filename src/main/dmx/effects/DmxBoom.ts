import { DmxButton } from "../../sequelize/models/dmx_button";
import DmxEffect from "./DmxEffect";

class DmxBoom extends DmxEffect {
    static transformDmxHexSignal = (
        dmxHexSignal: DmxHexSignal,
        completeness: number,
        dmxButton: DmxButton,
        _trigger: DmxButtonTrigger
    ) => {
        return this.setToColor(
            dmxButton.red_channels,
            dmxButton.color,
            dmxHexSignal,
            1 - completeness
        )
    }
}

export default DmxBoom
