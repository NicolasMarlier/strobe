import { DmxLoop } from "../dmx_loop"
import { handleErrors } from "./application.controller"

export class MainLoopController {

    static update_current_tick = async(tick: number) => handleErrors(async() => {
        const dmxMidiHandler = DmxLoop.getInstance().dmxMidiHandler
        // While MainStage drives playback, it alone moves the cursor
        if (dmxMidiHandler.isDrivenByMidi()) return
        dmxMidiHandler.updateCurrentTickManually(tick)
        return
    })
}