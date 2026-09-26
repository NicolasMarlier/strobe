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
  // Sent when the open show gets unsaved changes, or gets saved
  'show:dirty': {
    params: boolean
  }
}

export type ReverseChannel = keyof ApiReverseContract;