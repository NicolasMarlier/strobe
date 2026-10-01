import DmxEffect from "./DmxEffect";
import { CellLayouts } from "../../../shared/fixtures"

// A light running along the button's cells, from the first channel to the last (or back, reversed),
// lighting `spread` channels around it
export const runAlong = (
    dmxHexSignal: DmxHexSignal,
    completeness: number,
    dmxButton: DmxButton,
    layouts: CellLayouts,
    reversed: boolean
) => {
    const spread = 2 * 3

    const startRedChannel = Math.min(...dmxButton.red_channels) - 2 * 3
    const endRedChannel = Math.max(...dmxButton.red_channels) + 2 * 3

    const center = startRedChannel + (endRedChannel - startRedChannel) * (reversed ? 1 - completeness : completeness)

    return DmxEffect.setToColor(
        dmxButton.red_channels,
        dmxButton.color,
        dmxHexSignal,
        layouts,
        (redChannel) => Math.max(0, 1 - (Math.abs(center - redChannel) / spread))
    )
}

class DmxRun extends DmxEffect {
    static transformDmxHexSignal = (
        dmxHexSignal: DmxHexSignal,
        completeness: number,
        dmxButton: DmxButton,
        _trigger: DmxButtonTrigger,
        layouts: CellLayouts
    ) => runAlong(dmxHexSignal, completeness, dmxButton, layouts, false)
}

export default DmxRun
