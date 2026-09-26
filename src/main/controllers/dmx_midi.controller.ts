import { Request, Response } from "express"
import { Program } from "../sequelize/models/program";
import { DmxLoop } from "../dmx_loop";
import { handleErrors, NotFoundError } from "./application.controller";

const getDmxMidi = async(program_id: number) => {
  const program = await Program.findByPk(program_id);

  if (!program) {
    throw new NotFoundError("Program not found")
  }

  const dmxMidi = await program.getOrInitDmxMidi()
  return dmxMidi
}

export class DmxMidiController {
    static get = (program_id: number) => handleErrors(async() => getDmxMidi(program_id))
        
    static update = async(program_id: number, params: DmxMidiUpdateParams) => handleErrors(async() => {
        const dmxMidi = await getDmxMidi(program_id)

        const midi_patterns = params.midi_patterns

        await dmxMidi.update({
            midi_patterns: midi_patterns
        })

        DmxLoop.getInstance().reloadMidi()

        return dmxMidi
    })
}