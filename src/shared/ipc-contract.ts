export interface ApiContract {
  'tracks:list':   {
      args: []
      result: Track[]
  }
  'tracks:create': {
    args: [params: TrackCreationParams]
    result: Track
  }
  'tracks:update': {
    args: [id: number, params: TrackUpdateParams]
    result: Track
  }
  'tracks:destroy':{
    args: [id: number]
    result: void
  }
  'tracks:select': {
    args: [id: number]
    result: Track
  }
  
  'tracks:audio:upload': {
    args: [track_id: number, file: File]
    result: string
  }
  'tracks:audio:reset': {
    args: [track_id: number]
    result: void
  }
  'tracks:audio:get': {
    args: [track_id: number]
    result: string
  }

  'tracks:dmx_midi:get': {
    args: [id: number]
    result: DmxMidi
  }
  'tracks:dmx_midi:update': {
    args: [id: number, params: DmxMidiUpdateParams]
    result: DmxMidi
  }
  
  'dmx_buttons:list': {
    args: [track_id: number]
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

  'dmx_scene:get': {
    args: []
    result: DmxScene
  }
  'dmx_scene:update': {
    args: [dmxScene: DmxScene]
    result: DmxScene
  }

  'show:state': {
    args: []
    result: ShowState
  }
  'show:new': {
    args: []
    result: void
  }
  'show:open': {
    args: []
    result: void
  }
  'show:open_recent': {
    args: [dir: string]
    result: void
  }
  'show:remove_recent': {
    args: [dir: string]
    result: RecentShow[]
  }

}

export type Channel = keyof ApiContract;