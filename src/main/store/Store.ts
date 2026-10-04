import EventEmitter from "events"
import { randomUUID } from "crypto"
import { InvalidParamError, NotFoundError } from "../controllers/application.controller"

export const STORE_EVENTS = {
    CHANGED: 'changed',
    TRACK_RENAMED: 'trackRenamed',
    // Several tracks changed id at once (reordering): { [oldId]: newId }
    TRACKS_RENUMBERED: 'tracksRenumbered',
    LOADED: 'loaded',
    // Undo or redo brought back a previous state (see ShowHistory): the UI reloads it
    RESTORED: 'restored',
}

// In-memory replacement for the former SQLite database.
// Every getter returns a copy so callers never hold references into the store state.
export class Store extends EventEmitter {
    private static instance: Store

    private tracks: Track[] = []
    private dmxButtons: DmxButton[] = []
    private dmxMidis: DmxMidiRecord[] = []
    private dmxScene: DmxScene = { elements: [] }

    static getInstance(): Store {
        if (!Store.instance) {
            Store.instance = new Store()
        }
        return Store.instance
    }

    private changed = () => this.emit(STORE_EVENTS.CHANGED)

    // Whole data set, used to open and save shows

    load = (data: ShowData): void => {
        this.setData(data)
        this.emit(STORE_EVENTS.LOADED)
    }

    // Back to a previous state of the open show (undo, redo): a change like any other
    restore = (data: ShowData): void => {
        this.setData(data)
        this.changed()
        this.emit(STORE_EVENTS.RESTORED)
    }

    private setData = (data: ShowData) => {
        this.tracks = structuredClone(data.tracks)
        this.dmxButtons = structuredClone(data.dmx_buttons)
        this.dmxMidis = structuredClone(data.dmx_midis)
        this.dmxScene = structuredClone(data.dmx_scene)
    }

    toData = (): ShowData => structuredClone({
        tracks: this.tracks,
        dmx_buttons: this.dmxButtons,
        dmx_midis: this.dmxMidis,
        dmx_scene: this.dmxScene,
    })

    getDmxScene = (): DmxScene => structuredClone(this.dmxScene)

    updateDmxScene = (dmxScene: DmxScene): DmxScene => {
        this.dmxScene = structuredClone(dmxScene)
        this.changed()
        return structuredClone(this.dmxScene)
    }

    // Tracks

    listTracks = (): Track[] =>
        structuredClone([...this.tracks].sort((a, b) => a.id - b.id))

    findTrack = (id: number | undefined): Track | undefined => {
        const track = this.tracks.find(p => p.id == id)
        return track && structuredClone(track)
    }

    getTrack = (id: number): Track => {
        const track = this.findTrack(id)
        if (!track) throw new NotFoundError("Track not found")
        return track
    }

    createTrack = (params: TrackCreationParams): Track => {
        const track: Track = {
            id: Math.max(0, ...this.tracks.map(p => p.id)) + 1,
            name: params.name,
            bpm: params.bpm ?? 85,
            audio_filename: null,
        }
        this.tracks.push(track)
        this.dmxMidis.push({ track_id: track.id, midi_patterns: [] })
        this.changed()
        return structuredClone(track)
    }

    updateTrack = (id: number, params: TrackUpdateParams & { audio_filename?: string | null, audio_id?: number }): Track => {
        const track = this.tracks.find(p => p.id == id)
        if (!track) throw new NotFoundError("Track not found")

        const newId = params.id ?? track.id
        if (newId != track.id) {
            if (this.tracks.some(p => p.id == newId)) {
                throw new InvalidParamError("Track id already used")
            }
            this.dmxButtons.filter(b => b.track_id == id).forEach(b => b.track_id = newId)
            this.dmxMidis.filter(m => m.track_id == id).forEach(m => m.track_id = newId)
            track.audio_id = track.audio_id ?? track.id
            track.id = newId
        }

        track.name = params.name ?? track.name
        track.bpm = params.bpm ?? track.bpm
        if (params.length_ticks !== undefined) track.length_ticks = params.length_ticks
        if ('audio_filename' in params) track.audio_filename = params.audio_filename ?? null
        if (params.audio_id !== undefined) track.audio_id = params.audio_id

        if (newId != id) this.emit(STORE_EVENTS.TRACK_RENAMED, id, newId)
        this.changed()
        return structuredClone(track)
    }

    // The tracks are renumbered 1, 2, 3… in the new order: their ids are their MIDI programs
    reorderTracks = (orderedIds: number[]): Track[] => {
        const ids = this.tracks.map(p => p.id).sort((a, b) => a - b)
        if (orderedIds.length != ids.length || [...orderedIds].sort((a, b) => a - b).some((id, i) => id != ids[i])) {
            throw new InvalidParamError("The new order must list every track once")
        }

        const mapping: Record<number, number> = {}
        orderedIds.forEach((id, i) => { if (id != i + 1) mapping[id] = i + 1 })
        if (Object.keys(mapping).length == 0) return this.listTracks()

        const renumber = (id: number) => mapping[id] ?? id
        this.tracks.forEach(p => {
            if (renumber(p.id) == p.id) return
            // Its audio file keeps its name
            p.audio_id = p.audio_id ?? p.id
            p.id = renumber(p.id)
        })
        this.dmxButtons.forEach(b => { if (b.track_id != null) b.track_id = renumber(b.track_id) })
        this.dmxMidis.forEach(m => m.track_id = renumber(m.track_id))

        this.emit(STORE_EVENTS.TRACKS_RENUMBERED, mapping)
        this.changed()
        return this.listTracks()
    }

    // A copy of the track with its own buttons and automation, as the last track.
    // It shares the original's audio file
    duplicateTrack = (id: number): Track => {
        const original = this.getTrack(id)
        const track: Track = {
            ...original,
            id: Math.max(0, ...this.tracks.map(p => p.id)) + 1,
            name: `${original.name} copy`,
            // Both play the same audio file
            audio_id: original.audio_id ?? original.id,
        }
        this.tracks.push(track)
        this.dmxButtons.push(...this.dmxButtons
            .filter(b => b.track_id == id)
            .map(b => ({ ...structuredClone(b), id: randomUUID(), track_id: track.id })))
        const dmxMidi = this.dmxMidis.find(m => m.track_id == id)
        this.dmxMidis.push({ track_id: track.id, midi_patterns: structuredClone(dmxMidi?.midi_patterns ?? []) })
        this.changed()
        return structuredClone(track)
    }

    destroyTrack = (id: number): void => {
        this.getTrack(id)
        this.tracks = this.tracks.filter(p => p.id != id)
        this.dmxButtons = this.dmxButtons.filter(b => b.track_id != id)
        this.dmxMidis = this.dmxMidis.filter(m => m.track_id != id)
        this.changed()
    }

    // DmxButtons

    // The track's own buttons first, then the global ones (track_id null), each in creation order
    listButtons = (trackId: number | undefined): DmxButton[] => structuredClone([
        ...this.dmxButtons.filter(b => b.track_id != null && b.track_id == trackId),
        ...this.dmxButtons.filter(b => b.track_id == null),
    ])

    getButton = (id: string): DmxButton => {
        const button = this.dmxButtons.find(b => b.id == id)
        if (!button) throw new NotFoundError("DmxButton not found")
        return structuredClone(button)
    }

    createButton = (params: DmxButtonCreationParams): DmxButton => {
        const button: DmxButton = {
            id: randomUUID(),
            track_id: params.track_id,
            color: params.color ?? "#fffff",
            duration_ms: params.duration_ms ?? 100,
            red_channels: params.red_channels ?? [],
            nature: params.nature ?? 'Boom',
            triggering_midi_key: params.triggering_midi_key ?? null,
        }
        this.dmxButtons.push(button)
        this.changed()
        return structuredClone(button)
    }

    updateButton = (id: string, params: DmxButtonUpdateParams): DmxButton => {
        const button = this.dmxButtons.find(b => b.id == id)
        if (!button) throw new NotFoundError("DmxButton not found")
        const before = JSON.stringify(button)

        button.track_id = 'track_id' in params ? params.track_id ?? null : button.track_id
        button.color = params.color ?? button.color
        button.duration_ms = params.duration_ms ?? button.duration_ms
        button.red_channels = params.red_channels ?? button.red_channels
        button.nature = params.nature ?? button.nature
        button.triggering_midi_key = 'triggering_midi_key' in params
            ? params.triggering_midi_key ?? null
            : button.triggering_midi_key

        // The button details panel sends the button's values back when it's selected:
        // that must not mark the show as modified
        if (JSON.stringify(button) != before) this.changed()
        return structuredClone(button)
    }

    destroyButton = (id: string): void => {
        this.getButton(id)
        this.dmxButtons = this.dmxButtons.filter(b => b.id != id)
        this.changed()
    }

    // DmxMidis

    // Lazily creates the track's DmxMidi; this is not considered a change
    getOrInitDmxMidi = (trackId: number): DmxMidi => {
        this.getTrack(trackId)
        let dmxMidi = this.dmxMidis.find(m => m.track_id == trackId)
        if (!dmxMidi) {
            dmxMidi = { track_id: trackId, midi_patterns: [] }
            this.dmxMidis.push(dmxMidi)
        }
        return structuredClone(dmxMidi)
    }

    updateDmxMidi = (trackId: number, midi_patterns: MidiPattern[]): DmxMidi => {
        this.getOrInitDmxMidi(trackId)
        const dmxMidi = this.dmxMidis.find(m => m.track_id == trackId)!
        dmxMidi.midi_patterns = structuredClone(midi_patterns)
        this.changed()
        return structuredClone(dmxMidi)
    }
}
