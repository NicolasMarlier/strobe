export interface ApiReverseContract {
  'dmx': {
    params: DmxSignalParams
  }
  'program:change': {
    params: number
  }
  'midi:note_on': {
    params: WSMidiNoteOnMessage
  }
}

export type ReverseChannel = keyof ApiReverseContract;