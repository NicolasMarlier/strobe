import DmxEffect from "./DmxEffect"
import { CellLayouts } from "../../../shared/fixtures"

class DmxSet extends DmxEffect {
    static transformDmxHexSignal = (
        dmxHexSignal: DmxHexSignal,
        _completeness: number,
        dmxButton: DmxButton,
        _trigger: DmxButtonTrigger,
        layouts: CellLayouts
    ) => {
        return DmxEffect.setToColor(
            dmxButton.red_channels,
            dmxButton.color,
            dmxHexSignal,
            layouts
        )
    }
}
export default DmxSet
