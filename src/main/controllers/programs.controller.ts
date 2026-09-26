import { handleErrors } from "./application.controller";
import { DmxLoop } from "../dmx_loop";
import { Store } from "../store/Store";


export class ProgramsController {

    static list = async() => handleErrors(async() => Store.getInstance().listPrograms())

    static create = async(params: ProgramCreationParams) => handleErrors(async() => {
        const program = Store.getInstance().createProgram(params)

        return {
            status: 'ok',
            program: program
        }
    })

    static select = async(id: number) => handleErrors(async() => {
        const program = Store.getInstance().getProgram(id)
        await DmxLoop.getInstance().switchProgram(program.id)
        return {status: 'ok'}
    })

    static update = async(id: number, params: ProgramUpdateParams) => handleErrors(async() => {
        Store.getInstance().updateProgram(id, params)
        return {status: 'ok'}
    })

    static destroy = async(id: number) => handleErrors(async() => {
        Store.getInstance().destroyProgram(id)
        return { success: true }
    })
}
