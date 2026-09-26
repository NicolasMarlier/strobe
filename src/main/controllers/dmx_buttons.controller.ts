import { Op } from "@sequelize/core"
import { DmxButton } from "../sequelize/models/dmx_button";
import { DmxLoop } from "../dmx_loop";
import { handleErrors, NotFoundError } from "./application.controller";


const getButton = async(id: string) => {
  const button = await DmxButton.findByPk(id);

  if (!button) {
    throw new NotFoundError("DmxButton not found")
  }
  return button
}

export class DmxButtonController {
  static list = async(program_id: number) => handleErrors(() =>
    DmxButton.findAll({
        where: {[Op.or]: [{program_id}, {program_id: null}]},
        order: [["program_id", "DESC", ], ["created_at", "ASC"]],
    })
  )

  static get = async(id: string) => handleErrors(() => getButton(id))

  static create = async(params: DmxButtonCreationParams) => handleErrors(async() => {
    const button = await DmxButton.create({
      program_id: params.program_id,
      color: params.color ?? "#fffff",
      duration_ms: params.duration_ms ?? 100,
      red_channels: params.red_channels ?? [],
      nature: params.nature ?? 'Boom',
      triggering_midi_key: params.triggering_midi_key ?? null,
    });

    DmxLoop.getInstance().resyncDmxButtons()
    
    return button
  })

  static play = async(id: string) => handleErrors(async() => {
    const button = await getButton(id)
    DmxLoop.getInstance().triggerDmxButton(button.id, {mock_midi_signal: true})
    return button;
  })

  static update = async(id: string, params: DmxButtonUpdateParams) => handleErrors(async() => {
    const button = await getButton(id)
    await button.update({
      program_id: 'program_id' in params ? params.program_id : button.program_id,
      color: params.color ?? button.color,
      duration_ms: params.duration_ms ?? button.duration_ms,
      red_channels: params.red_channels ?? button.red_channels,
      nature: params.nature ?? button.nature,
      triggering_midi_key: 'triggering_midi_key' in params
        ? params.triggering_midi_key
        : button.triggering_midi_key,
    });

    DmxLoop.getInstance().resyncDmxButtons()
    return button
  })

  static destroy = async(id: string) => handleErrors(async() => {
    const button = await getButton(id)
    await button.destroy()
    return true
  })
}