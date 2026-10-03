import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useDmxButtonsContext } from "./DmxButtonsContext";
import { getTrackDmxMidi, updateTrackDmxMidi } from "../ApiClient";

interface DmxMidiContextType {
    midiPatterns: MidiPattern[]
    selectedMidiPatterns: MidiPattern[],
    setSelectedMidiPatterns: (v: MidiPattern[]) => void,
    updateTrackDmxMidiAndSync: (v: MidiPattern[]) => void
    updateSelectedMidiPatternNotes: (v: MidiNote[]) => void
    allMidiKeys: MidiKey[]
    activeEditor: 'TrackEditor' | 'PatternEditor'
    setActiveEditor: (v: 'TrackEditor' | 'PatternEditor') => void

    isRecording: boolean,
    setIsRecording: (v: boolean) => void

    // The track editor's view turns its pages to keep the moving cursor in sight
    isFollowing: boolean,
    setIsFollowing: (v: boolean) => void
}

const DmxMidiContext = createContext<DmxMidiContextType | null>(null)

export const useDmxMidiContext = () => {
  const dmxMidiContext = useContext(DmxMidiContext);

  if (!dmxMidiContext) {
    throw new Error(
      "useDmxMidiContext has to be used within <RealTimeContext.Provider>"
    )
  }
  return dmxMidiContext
}

export const DmxMidiContextProvider = ({ children }: {children: React.ReactNode}) => {
 
    const { currentTrackId, dmxButtons } = useDmxButtonsContext()

    const [selectedMidiPatterns, setSelectedMidiPatterns] = useState<MidiPattern[]>([])
    const [midiPatterns, setMidiPatterns] = useState<MidiPattern[]>([])

    const fetchDmxMidi = () => {
        if(!currentTrackId) return

        getTrackDmxMidi(currentTrackId).then((dmxMidi) => {
            setMidiPatterns(dmxMidi.midi_patterns)
            setSelectedMidiPatterns(prev =>
                prev.map(sp => dmxMidi.midi_patterns.find(p => p.ticks === sp.ticks) ?? sp)
            )
        })
    }
    const updateTrackDmxMidiAndSync = (midiPatterns: MidiPattern[]) => {
        if(!currentTrackId) return
        updateTrackDmxMidi(currentTrackId, {midi_patterns: midiPatterns}).then(
            fetchDmxMidi
        )
    }

    const updateSelectedMidiPatternNotes = (updatedNotes: MidiNote[]) => {
        if(selectedMidiPatterns.length != 1) return

        const newPatterns = midiPatterns.map(p =>
            p.ticks === selectedMidiPatterns[0].ticks ? { ...p, midi_notes: updatedNotes } : p
        )
        updateTrackDmxMidiAndSync(newPatterns)
    }

    const allMidiKeys = (dmxButtons.flatMap(({triggering_midi_key}) => triggering_midi_key) || []).toSorted() as MidiKey[]

    const [activeEditor, setActiveEditor] = useState<'TrackEditor' | 'PatternEditor'>('TrackEditor')

    const [isRecording, setIsRecording] = useState(false)
    const [isFollowing, setIsFollowing] = useState(true)
        

    useEffect(fetchDmxMidi, [currentTrackId])
    // Undo or redo brought back another state of the show. Registered once, calls the latest fetch
    const fetchDmxMidiRef = useRef(fetchDmxMidi)
    fetchDmxMidiRef.current = fetchDmxMidi
    useEffect(() => window.strobe.api.onMessage('show:restored', () => fetchDmxMidiRef.current()), [])
    useEffect(() => setIsRecording(false), [currentTrackId])

    return (
        <DmxMidiContext.Provider value={ {
            midiPatterns,

            selectedMidiPatterns,
            setSelectedMidiPatterns,

            updateTrackDmxMidiAndSync,
            updateSelectedMidiPatternNotes,

            allMidiKeys,
            activeEditor,
            setActiveEditor,

            isRecording,
            setIsRecording,

            isFollowing,
            setIsFollowing,
            } }>
            {children}
        </DmxMidiContext.Provider>
    )
}