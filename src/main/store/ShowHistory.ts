import { Store, STORE_EVENTS } from "./Store"

// Changes this close together make a single undo step: typing a value, dragging a color, recording MIDI…
const MERGE_WITHIN_MS = 600
// Steps Undo can go back through
const MAX_STEPS = 100

// The show without its display options (zoom, grid, beams): those aren't undone
const withoutDisplay = (data: ShowData) => JSON.stringify({ ...data, dmx_scene: { ...data.dmx_scene, display: undefined } })

// Undo and redo over the whole open show: the store's states before each change.
// Opening a show starts a new history
export class ShowHistory {
    private static instance: ShowHistory

    static getInstance(): ShowHistory {
        if (!ShowHistory.instance) {
            ShowHistory.instance = new ShowHistory(Store.getInstance())
        }
        return ShowHistory.instance
    }

    private undoSteps: ShowData[] = []
    private redoSteps: ShowData[] = []
    private current: ShowData
    private lastChangeAt = 0
    private restoring = false

    constructor(private store: Store) {
        this.current = store.toData()
        store.on(STORE_EVENTS.CHANGED, this.onChange)
        store.on(STORE_EVENTS.LOADED, this.reset)
    }

    canUndo = () => this.undoSteps.length > 0
    canRedo = () => this.redoSteps.length > 0

    // Whether there was something to undo
    undo = () => this.move(this.undoSteps, this.redoSteps)
    redo = () => this.move(this.redoSteps, this.undoSteps)

    private reset = () => {
        this.undoSteps = []
        this.redoSteps = []
        this.current = this.store.toData()
        this.lastChangeAt = 0
    }

    private onChange = () => {
        if (this.restoring) return
        const next = this.store.toData()

        // Display options only: nothing to undo
        if (withoutDisplay(next) == withoutDisplay(this.current)) {
            this.current = next
            return
        }

        const now = Date.now()
        if (now - this.lastChangeAt > MERGE_WITHIN_MS) {
            this.undoSteps = [...this.undoSteps.slice(1 - MAX_STEPS), this.current]
        }
        this.lastChangeAt = now
        this.current = next
        this.redoSteps = []
    }

    private move = (from: ShowData[], to: ShowData[]) => {
        const data = from.pop()
        if (!data) return false
        to.push(this.current)

        // The display options stay as they are
        this.restoring = true
        this.store.restore({ ...data, dmx_scene: { ...data.dmx_scene, display: this.current.dmx_scene.display } })
        this.restoring = false

        this.current = this.store.toData()
        // The next change is a step of its own
        this.lastChangeAt = 0
        return true
    }
}
