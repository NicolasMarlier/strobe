import { Store } from "../store/Store";
import { handleErrors } from "./application.controller";

export class DmxMidiController {
    static get = (program_id: number) => handleErrors(async() =>
        Store.getInstance().getOrInitDmxMidi(program_id)
    )

    static update = async(program_id: number, params: DmxMidiUpdateParams) => handleErrors(async() =>
        Store.getInstance().updateDmxMidi(program_id, params.midi_patterns)
    )
}
