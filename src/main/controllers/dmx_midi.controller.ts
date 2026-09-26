import { Store } from "../store/Store";
import { handleErrors } from "./application.controller";

export class DmxMidiController {
    static get = (track_id: number) => handleErrors(async() =>
        Store.getInstance().getOrInitDmxMidi(track_id)
    )

    static update = async(track_id: number, params: DmxMidiUpdateParams) => handleErrors(async() =>
        Store.getInstance().updateDmxMidi(track_id, params.midi_patterns)
    )
}
