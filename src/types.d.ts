type USBDeviceState = 'Not connected' | 'Connected' | 'Initializing' | 'Identified'

type MidiKey = number

type DmxButton = {
    id: string
    track_id: number | null
    color: string
    duration_ms: number
    red_channels: number[]
    nature: DmxEffectNature
    triggering_midi_key: MidiKey | null
}

type DmxButtonCreationParams = {
    track_id: number
    color?: string
    duration_ms?: number
    red_channels?: number[]
    nature?: DmxEffectNature
    triggering_midi_key?: MidiKey
}

type DmxButtonUpdateParams = {
    color?: string
    duration_ms?: number
    red_channels?: number[]
    nature?: DmxEffectNature
    triggering_midi_key?: MidiKey | null
    track_id?: number | null
}

type DmxHexSignal = string

type DmxEffectNature = 'Boom' | 'Set' | 'Run' | 'InverseRun' | 'Toggle'

type Track = {
    name: string
    id: number
    bpm: number
    audio_filename: string | null
}

type TrackCreationParams = {
    name: string
    bpm?: number
}

type TrackUpdateParams = {
    name?: string
    id?: number
    bpm?: number
}

type MidiNote = {
    ticks: number
    midi: number
    durationTicks: number
}


type MidiPattern = {
    ticks: number
    midi_notes: MidiNote[]
    durationTicks: number
    loop_until_tick?: number
}

type DmxMidi = {
    midi_patterns: MidiPattern[]
}

type DmxMidiRecord = {
    track_id: number
    midi_patterns: MidiPattern[]
}

type RecentShow = {
    dir: string
    name: string
    folder: string
}

type ShowState = {
    isOpen: boolean
    // Whether the open show has changes that are not saved
    isDirty: boolean
    recentShows: RecentShow[]
}

type ShowData = {
    tracks: Track[]
    dmx_buttons: DmxButton[]
    dmx_midis: DmxMidiRecord[]
    dmx_scene: DmxScene
}

type DmxMidiUpdateParams = {
    midi_patterns: MidiPattern[]
}

type ReceivedMidiKey = {
    midi: MidiKey,
    at: number
}


type WSMidiNoteOnMessage = {
    midi: MidiKey
}

type DmxMidiControlClientToServerWsPayload = {
    channel: 'dmx-midi-control',
    data: {
        midiCurrentTick: number
    }
}

type Rectangle = {
    x0: number
    y0: number
    x1: number
    y1: number
}

type IncomingWsPayload = any

type OutgoingWsPayload = DmxMidiControlClientToServerWsPayload

type MouseSelection = {
    mode: 'drag' | 'select',
    rect: Rectangle
}

// A LED bar of the scene: rgb_dots_count RGB dots, starting at DMX channel `channel` (red of the first dot)
type LedBarConfig = {
    channel: number,
    rgb_dots_count: number,
    style?: LedBarStyle
}

// Where a LED bar is drawn in the scene (CSS values)
type LedBarStyle = {
    transform?: string,
    left?: string,
    right?: string,
    top?: string,
    bottom?: string
}

// How the lights are laid out on screen
type DmxScene = {
    led_bars: LedBarConfig[]
}

type DmxTriggerState = 'up' | 'down'
type DmxButtonTrigger = {
    at: number
    state: DmxTriggerState
}


type EntecOpenDMXUSBState = "Not connected" | "Connected" | "Initializing" | "Identified";
type DmxSignalParams = {
    enttecOpenDMXUSB: {
        state: EntecOpenDMXUSBState
    },
    dmxHexSignal: DmxHexSignal,
    midiCurrentTick: number
}