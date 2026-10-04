import type { DevWorktree } from './dev_worktree';

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
  // The tracks' ids, in their new order: they're renumbered 1, 2, 3… (their MIDI programs) in that order
  'tracks:reorder': {
    args: [orderedIds: number[]]
    result: Track[]
  }
  'tracks:duplicate': {
    args: [id: number]
    result: Track
  }
  
  // A file dropped on the track, by its path: the track, or null if it's not an audio file
  'tracks:audio:upload': {
    args: [track_id: number, filePath: string]
    result: Track | null
  }
  // Choose Audio File…: the track, or null if cancelled
  'tracks:audio:choose': {
    args: [track_id: number]
    result: Track | null
  }
  'tracks:audio:reset': {
    args: [track_id: number]
    result: Track
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

  'fixtures:list': {
    args: []
    result: FixtureLibraryContents
  }

  // The app has rendered in the calling window: it can be shown
  'app:rendered': {
    args: []
    result: void
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
  'show:open_example': {
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
  // Returns whether the show was saved (Save As can be cancelled)
  'show:save': {
    args: []
    result: boolean
  }
  // Names of the MIDI inputs connected (see interfaces:midi_inputs_changed)
  'interfaces:midi_inputs': {
    args: []
    result: string[]
  }
  // Undo or redo the show's last change; returns whether there was one
  'show:undo': {
    args: []
    result: boolean
  }
  'show:redo': {
    args: []
    result: boolean
  }
  // Edit > Copy, Paste and Select All left to the page (a text field, selected text): the window does them
  'edit:native': {
    args: [action: 'copy' | 'paste' | 'selectAll']
    result: void
  }
  // A feature the window saw used, for the anonymous usage statistics (see telemetry.ts)
  'telemetry:signal': {
    args: [type: 'Strobe.playbackStarted' | 'Strobe.narrowWindowUsed']
    result: void
  }
  // Run from source, the worktree and branch it runs from, to show them; null when released
  'dev:worktree': {
    args: []
    result: DevWorktree | null
  }

}

export type Channel = keyof ApiContract;