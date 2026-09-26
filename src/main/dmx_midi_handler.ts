// PPQ: Pulses per quarter note
// ie: There are (PPQ) ticks in 1 beat
// ie: A beat last (PPQ ticks)
const PPQ = 480

// 24 PPQM per clock event
// https://en.wikipedia.org/wiki/MIDI_beat_clock
//
// So at 480 PPQ that means we receive 20 CLOCK events per beat,
// ie 20 CLOCK events per second at 60 BPM
const CLOCK_PPQM = 24




export class DmxMidiHandler {
  private isPlaying: boolean
  currentTick: number
  private midiNotes: MidiNote[]
  private onMidiKey: (midiKey: MidiKey) => void

  constructor(params: {onMidiKey?: (midiKey: MidiKey) => void}) {
    this.isPlaying = false
    this.currentTick = 0
    this.midiNotes = []
    this.onMidiKey = params.onMidiKey || (() => {}) 
  }

  setMidiNotes(midiNotes: MidiNote[]) {
    this.midiNotes = midiNotes
  }

  setMidiPatterns(midiPatterns: MidiPattern[]) {
    this.midiNotes = midiPatterns.map(midiPattern => {
      if(!midiPattern.loop_until_tick) return midiPattern.midi_notes
      const loopUntilTick = midiPattern.loop_until_tick
      let loopedMidiNotes: MidiNote[] = []
      for(let i = midiPattern.ticks; i < loopUntilTick; i += midiPattern.durationTicks) {
          loopedMidiNotes = loopedMidiNotes.concat(
            midiPattern
              .midi_notes
              .map(n => ({
                ...n,
                ...{
                  ticks: n.ticks + i - midiPattern.ticks
                }
              }))
              .filter(n => n.ticks < loopUntilTick)
            )
      }
      return loopedMidiNotes
      
    }).flat()
  }

  play = () => {
    this.currentTick = -PPQ / CLOCK_PPQM
    this.isPlaying = true
  }

  stop = (options?: {reset?: true}) => {
    this.isPlaying = false
    if(!!options?.reset) {
      this.currentTick = 0
    }
  }

  receiveClock = () => {
      if(!this.isPlaying) { return false }
      this.updateCurrentTickManually(this.nextTick())
  }

  updateCurrentTickManually = (newCurrentTick: number) => {
    this.emitNotes(this.currentTick, newCurrentTick)
    this.currentTick = newCurrentTick
  }

  nextTick = () => this.currentTick + PPQ / CLOCK_PPQM

  emitNotes = (fromTick: number, toTick: number) => {
      this.midiNotes
          .filter((midiNote) => midiNote.ticks >= fromTick && midiNote.ticks < toTick)
          .forEach((midiNote) => this.onMidiKey(midiNote.midi))
  }
}