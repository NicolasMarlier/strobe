import DmxEffect from "./DmxEffect"
import { CellLayouts } from "../../../shared/fixtures"

class DmxToggle extends DmxEffect {
    static transformDmxHexSignal = (
        dmxHexSignal: DmxHexSignal,
        completeness: number,
        dmxButton: DmxButton,
        trigger: DmxButtonTrigger,
        layouts: CellLayouts
    ) => this.setToColor(
        dmxButton.red_channels,
        dmxButton.color,
        dmxHexSignal,
        layouts,
        trigger.state === 'up' ? completeness : 1 - completeness
    )
}
export default DmxToggle
