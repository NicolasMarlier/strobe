import EventEmitter from "events"
import { randomUUID } from "crypto"
import { InvalidParamError, NotFoundError } from "../controllers/application.controller"

export const STORE_EVENTS = {
    CHANGED: 'changed',
    PROGRAM_RENAMED: 'programRenamed',
    LOADED: 'loaded',
}

// In-memory replacement for the former SQLite database.
// Every getter returns a copy so callers never hold references into the store state.
export class Store extends EventEmitter {
    private static instance: Store

    private programs: Program[] = []
    private dmxButtons: DmxButton[] = []
    private dmxMidis: DmxMidiRecord[] = []

    static getInstance(): Store {
        if (!Store.instance) {
            Store.instance = new Store()
        }
        return Store.instance
    }

    private changed = () => this.emit(STORE_EVENTS.CHANGED)

    // Whole data set, used to open and save shows

    load = (data: ShowData): void => {
        this.programs = structuredClone(data.programs)
        this.dmxButtons = structuredClone(data.dmx_buttons)
        this.dmxMidis = structuredClone(data.dmx_midis)
        this.emit(STORE_EVENTS.LOADED)
    }

    toData = (): ShowData => structuredClone({
        programs: this.programs,
        dmx_buttons: this.dmxButtons,
        dmx_midis: this.dmxMidis,
    })

    // Programs

    listPrograms = (): Program[] =>
        structuredClone([...this.programs].sort((a, b) => a.id - b.id))

    findProgram = (id: number | undefined): Program | undefined => {
        const program = this.programs.find(p => p.id == id)
        return program && structuredClone(program)
    }

    getProgram = (id: number): Program => {
        const program = this.findProgram(id)
        if (!program) throw new NotFoundError("Program not found")
        return program
    }

    createProgram = (params: ProgramCreationParams): Program => {
        const program: Program = {
            id: Math.max(0, ...this.programs.map(p => p.id)) + 1,
            name: params.name,
            bpm: params.bpm ?? 85,
            audio_filename: null,
        }
        this.programs.push(program)
        this.dmxMidis.push({ program_id: program.id, midi_patterns: [] })
        this.changed()
        return structuredClone(program)
    }

    updateProgram = (id: number, params: ProgramUpdateParams & { audio_filename?: string | null }): Program => {
        const program = this.programs.find(p => p.id == id)
        if (!program) throw new NotFoundError("Program not found")

        const newId = params.id ?? program.id
        if (newId != program.id) {
            if (this.programs.some(p => p.id == newId)) {
                throw new InvalidParamError("Program id already used")
            }
            this.dmxButtons.filter(b => b.program_id == id).forEach(b => b.program_id = newId)
            this.dmxMidis.filter(m => m.program_id == id).forEach(m => m.program_id = newId)
            program.id = newId
        }

        program.name = params.name ?? program.name
        program.bpm = params.bpm ?? program.bpm
        if ('audio_filename' in params) program.audio_filename = params.audio_filename ?? null

        if (newId != id) this.emit(STORE_EVENTS.PROGRAM_RENAMED, id, newId)
        this.changed()
        return structuredClone(program)
    }

    destroyProgram = (id: number): void => {
        this.getProgram(id)
        this.programs = this.programs.filter(p => p.id != id)
        this.dmxButtons = this.dmxButtons.filter(b => b.program_id != id)
        this.dmxMidis = this.dmxMidis.filter(m => m.program_id != id)
        this.changed()
    }

    // DmxButtons

    // The program's own buttons first, then the global ones (program_id null), each in creation order
    listButtons = (programId: number | undefined): DmxButton[] => structuredClone([
        ...this.dmxButtons.filter(b => b.program_id != null && b.program_id == programId),
        ...this.dmxButtons.filter(b => b.program_id == null),
    ])

    getButton = (id: string): DmxButton => {
        const button = this.dmxButtons.find(b => b.id == id)
        if (!button) throw new NotFoundError("DmxButton not found")
        return structuredClone(button)
    }

    createButton = (params: DmxButtonCreationParams): DmxButton => {
        const button: DmxButton = {
            id: randomUUID(),
            program_id: params.program_id,
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

        button.program_id = 'program_id' in params ? params.program_id ?? null : button.program_id
        button.color = params.color ?? button.color
        button.duration_ms = params.duration_ms ?? button.duration_ms
        button.red_channels = params.red_channels ?? button.red_channels
        button.nature = params.nature ?? button.nature
        button.triggering_midi_key = 'triggering_midi_key' in params
            ? params.triggering_midi_key ?? null
            : button.triggering_midi_key

        this.changed()
        return structuredClone(button)
    }

    destroyButton = (id: string): void => {
        this.getButton(id)
        this.dmxButtons = this.dmxButtons.filter(b => b.id != id)
        this.changed()
    }

    // DmxMidis

    // Lazily creates the program's DmxMidi; this is not considered a change
    getOrInitDmxMidi = (programId: number): DmxMidi => {
        this.getProgram(programId)
        let dmxMidi = this.dmxMidis.find(m => m.program_id == programId)
        if (!dmxMidi) {
            dmxMidi = { program_id: programId, midi_patterns: [] }
            this.dmxMidis.push(dmxMidi)
        }
        return structuredClone(dmxMidi)
    }

    updateDmxMidi = (programId: number, midi_patterns: MidiPattern[]): DmxMidi => {
        this.getOrInitDmxMidi(programId)
        const dmxMidi = this.dmxMidis.find(m => m.program_id == programId)!
        dmxMidi.midi_patterns = structuredClone(midi_patterns)
        this.changed()
        return structuredClone(dmxMidi)
    }
}
