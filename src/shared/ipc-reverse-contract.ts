export interface ApiReverseContract {
  'dmx': {
    params: DmxSignalParams
  }
  'track:change': {
    params: number
  }
  'midi:note_on': {
    params: WSMidiNoteOnMessage
  }
}

export type ReverseChannel = keyof ApiReverseContract;