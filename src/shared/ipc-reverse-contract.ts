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
  // Edit > Undo (Cmd+Z) and Redo (Cmd+Shift+Z): the renderer undoes a text field's typing,
  // or else the show's last change (show:undo, show:redo)
  'edit:undo': {
    params: null
  }
  'edit:redo': {
    params: null
  }
  // A MIDI input was plugged or unplugged: the names of those connected
  'interfaces:midi_inputs_changed': {
    params: string[]
  }
  // A MIDI input is sending (its name), at most every 400 ms
  'interfaces:midi_activity': {
    params: string
  }
  // Undo or redo brought the show back to a previous state: the UI reloads it
  'show:restored': {
    params: null
  }
}

export type ReverseChannel = keyof ApiReverseContract;