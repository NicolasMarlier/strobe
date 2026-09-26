import { DmxLoop } from "../dmx_loop";
import { Store } from "../store/Store";
import { handleErrors } from "./application.controller";


export class DmxButtonController {
  static list = async(program_id: number) => handleErrors(async() =>
    Store.getInstance().listButtons(program_id)
  )

  static get = async(id: string) => handleErrors(async() => Store.getInstance().getButton(id))

  static create = async(params: DmxButtonCreationParams) => handleErrors(async() =>
    Store.getInstance().createButton(params)
  )

  static play = async(id: string) => handleErrors(async() => {
    const button = Store.getInstance().getButton(id)
    DmxLoop.getInstance().triggerDmxButton(button.id, {mock_midi_signal: true})
    return button;
  })

  static update = async(id: string, params: DmxButtonUpdateParams) => handleErrors(async() =>
    Store.getInstance().updateButton(id, params)
  )

  static destroy = async(id: string) => handleErrors(async() => {
    Store.getInstance().destroyButton(id)
    return true
  })
}
