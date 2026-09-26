export interface ApiContract {
  'programs:list':   {
      args: []
      result: Program[]
  }
  'programs:create': {
    args: [params: ProgramCreationParams]
    result: Program
  }
  'programs:update': {
    args: [id: number, params: ProgramUpdateParams]
    result: Program
  }
  'programs:destroy':{
    args: [id: number]
    result: void
  }
  'programs:select': {
    args: [id: number]
    result: Program
  }
  
  'programs:audio:upload': {
    args: [program_id: number, file: File]
    result: string
  }
  'programs:audio:reset': {
    args: [program_id: number]
    result: void
  }
  'programs:audio:get': {
    args: [program_id: number]
    result: string
  }

  'programs:dmx_midi:get': {
    args: [id: number]
    result: DmxMidi
  }
  'programs:dmx_midi:update': {
    args: [id: number, params: DmxMidiUpdateParams]
    result: DmxMidi
  }
  
  'dmx_buttons:list': {
    args: [program_id: number]
    result: DmxButton[]
  }
  'dmx_buttons:get': {
    args: [id: string]
    result: DmxButton
  }
  'dmx_buttons:create': {
    args: [params: DmxButtonCreationParams]
    result: DmxButton
  }
  'dmx_buttons:update': {
    args: [id: string, params: DmxButtonUpdateParams]
    result: DmxButton
  }
  'dmx_buttons:play': {
    args: [id: string]
    result: DmxButton
  }
  'dmx_buttons:destroy': {
    args: [id: string]
    result: void
  }

  'main_loop:update_current_tick': {
    args: [tick: number]
    result: void
  }

}

export type Channel = keyof ApiContract;