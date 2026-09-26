import { Program } from "../sequelize/models/program";
import { handleErrors, NotFoundError } from "./application.controller";
import { DmxMidi } from "../sequelize/models/dmx_midi";
import { DmxLoop } from "../dmx_loop";


const getProgram = async(id: number) => {
  const program = await Program.findByPk(id);

  if (!program) {
    throw new NotFoundError("Program not found")
  }
  return program
}


export class ProgramsController {

    static list = async() => handleErrors(async() => {
        const programs = await Program.findAll(
            {order: [['id', 'ASC']]}
        )

        return programs
    })
      

    static create = async(params: ProgramCreationParams) => handleErrors(async() => {
        const program = await Program
            .create(params)
        await DmxMidi
            .create({
                program_id: program.id,
                midi_patterns: []
            })

        return {
            status: 'ok',
            program: program
        }
    })

    static select = async(id: number) => handleErrors(async() => {
        const program = await getProgram(id)
        await DmxLoop.getInstance().switchProgram(program.id)
        return {status: 'ok'}
    })

    static update = async(id: number, params: ProgramUpdateParams) => handleErrors(async() => {
        const program = await getProgram(id)
        program.update(params)
        return {status: 'ok'}
    })

    static destroy = async(id: number) => handleErrors(async() => {
        const program = await getProgram(id)
        await program.destroy();
        return { success: true }
    })
}