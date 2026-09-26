const i = window.dmxControl.api.invoke



export const listPrograms  = () =>
    i('programs:list')
export const createProgram = (dict: {name: string}) =>
    i('programs:create', dict)
export const updateProgram = (id: number, program: ProgramUpdateParams) =>
    i('programs:update', id, program)
export const deleteProgram = (id: number) =>
    i('programs:destroy', id)
export const selectProgram = (id: number) =>
    i('programs:select', id)

export const getProgramDmxMidi = (program_id: number) =>
    i('programs:dmx_midi:get', program_id)

export const updateProgramDmxMidi = (program_id: number, params: DmxMidiUpdateParams) =>
    i('programs:dmx_midi:update', program_id, params)


export const listDmxButtons = (program_id: number) =>
    i('dmx_buttons:list', program_id)

export const createDmxButton = (params: DmxButtonCreationParams) =>
    i('dmx_buttons:create', params)

export const updateDmxButton = (id: string, params: DmxButtonUpdateParams) =>
    i('dmx_buttons:update', id, params)

export const playDmxButton = (id: string) => 
    i('dmx_buttons:play', id)

export const deleteDmxButton = (id: string) =>
    i('dmx_buttons:destroy', id)

export const uploadProgramAudio = (program_id: number, file: File) =>
    i('programs:audio:upload', program_id, file)

export const getProgramAudio = (program_id: number) =>
    i('programs:audio:get', program_id)

