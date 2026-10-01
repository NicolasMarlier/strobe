type USBDeviceState = 'Not connected' | 'Connected' | 'Initializing' | 'Identified'

type MidiKey = number

type DmxButton = {
    id: string
    track_id: number | null
    color: string
    duration_ms: number
    // First channel of each cell the button lights (the red of an RGB dot)
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
    // True when it comes from a button clicked in the app, not from a MIDI device
    mock: boolean,
    at: number
}


type WSMidiNoteOnMessage = {
    midi: MidiKey
    mock: boolean
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

// What a DMX channel of a fixture does. The colors make light; fog makes fog, as much as the color is bright
type FixtureChannelKind = 'red' | 'green' | 'blue' | 'white' | 'fog'

// A kind of device, described as data (see shared/fixtures.ts): built in, or a JSON file in the Fixtures folder.
// A fixture is a row of identical cells (the dots of a LED bar), each taking the channels of `cell`, in order
type FixtureProfile = {
    // Stored in the show's elements: never change it once used
    id: string
    name: string
    // How it's drawn: a bar whose lenses cover its front face, or a box with smaller lenses (or nozzles)
    shape: 'bar' | 'box'
    // Width, height, depth of the housing, in meters
    size: Vector3Tuple
    cell: FixtureChannelKind[]
    // Cells of a new element of this fixture
    cells: number
    // Whether each element sets its own cell count, and what the cells are called (e.g. Dots)
    resizable?: boolean
    cell_label?: string
}

// The fixtures elements can be made of, and why fixture files were skipped
type FixtureLibraryContents = {
    fixtures: FixtureProfile[]
    problems: string[]
}

// A device placed in the scene: `cells` cells of its fixture, starting at DMX channel `channel`
type SceneElement = {
    fixture: string,
    channel: number,
    cells: number,
    // Center of the housing in the 3D scene, in meters (Y up, origin at the front-center of the stage floor)
    position: Vector3Tuple,
    // Euler angles in degrees (XYZ order)
    rotation: Vector3Tuple
}

type Vector3Tuple = [number, number, number]

// How the 3D scene is shown, saved with the show (defaults in DmxScene.tsx)
type DmxSceneDisplay = {
    show_grid: boolean,
    show_beams: boolean,
    zoom: number
}

// How the devices are laid out in the 3D scene
type DmxScene = {
    elements: SceneElement[],
    display?: DmxSceneDisplay
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
    // Buttons whose effect is running, i.e. currently changing the DMX signal
    activeDmxButtonIds: string[]
}