import DmxEffect from "./DmxEffect";
import { runAlong } from "./DmxRun";
import { CellLayouts } from "../../../shared/fixtures"

class DmxInverseRun extends DmxEffect {
    static transformDmxHexSignal = (
        dmxHexSignal: DmxHexSignal,
        completeness: number,
        dmxButton: DmxButton,
        _trigger: DmxButtonTrigger,
        layouts: CellLayouts
    ) => runAlong(dmxHexSignal, completeness, dmxButton, layouts, true)
}

export default DmxInverseRun
