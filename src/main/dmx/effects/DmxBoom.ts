import DmxEffect from "./DmxEffect";
import { CellLayouts } from "../../../shared/fixtures"

class DmxBoom extends DmxEffect {
    static transformDmxHexSignal = (
        dmxHexSignal: DmxHexSignal,
        completeness: number,
        dmxButton: DmxButton,
        _trigger: DmxButtonTrigger,
        layouts: CellLayouts
    ) => {
        return this.setToColor(
            dmxButton.red_channels,
            dmxButton.color,
            dmxHexSignal,
            layouts,
            1 - completeness
        )
    }
}

export default DmxBoom
