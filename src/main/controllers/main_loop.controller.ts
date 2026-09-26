import { DmxLoop } from "../dmx_loop"
import { handleErrors } from "./application.controller"

export class MainLoopController {

    static update_current_tick = async(tick: number) => handleErrors(async() => {
        DmxLoop.getInstance().dmxMidiHandler.updateCurrentTickManually(tick)
        return
    })
}