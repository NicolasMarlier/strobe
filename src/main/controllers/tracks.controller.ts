import { handleErrors } from "./application.controller";
import { DmxLoop } from "../dmx_loop";
import { Store } from "../store/Store";


export class TracksController {

    static list = async() => handleErrors(async() => Store.getInstance().listTracks())

    static create = async(params: TrackCreationParams) => handleErrors(async() =>
        Store.getInstance().createTrack(params)
    )

    static select = async(id: number) => handleErrors(async() => {
        const track = Store.getInstance().getTrack(id)
        await DmxLoop.getInstance().switchTrack(track.id)
        return {status: 'ok'}
    })

    static update = async(id: number, params: TrackUpdateParams) => handleErrors(async() => {
        Store.getInstance().updateTrack(id, params)
        return {status: 'ok'}
    })

    static reorder = async(orderedIds: number[]) => handleErrors(async() =>
        Store.getInstance().reorderTracks(orderedIds)
    )

    static duplicate = async(id: number) => handleErrors(async() =>
        Store.getInstance().duplicateTrack(id)
    )

    static destroy = async(id: number) => handleErrors(async() => {
        Store.getInstance().destroyTrack(id)
        return { success: true }
    })
}
