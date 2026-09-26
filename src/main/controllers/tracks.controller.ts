import { handleErrors } from "./application.controller";
import { DmxLoop } from "../dmx_loop";
import { Store } from "../store/Store";


export class TracksController {

    static list = async() => handleErrors(async() => Store.getInstance().listTracks())

    static create = async(params: TrackCreationParams) => handleErrors(async() => {
        const track = Store.getInstance().createTrack(params)

        return {
            status: 'ok',
            track: track
        }
    })

    static select = async(id: number) => handleErrors(async() => {
        const track = Store.getInstance().getTrack(id)
        await DmxLoop.getInstance().switchTrack(track.id)
        return {status: 'ok'}
    })

    static update = async(id: number, params: TrackUpdateParams) => handleErrors(async() => {
        Store.getInstance().updateTrack(id, params)
        return {status: 'ok'}
    })

    static destroy = async(id: number) => handleErrors(async() => {
        Store.getInstance().destroyTrack(id)
        return { success: true }
    })
}
