import { createContext, useContext, useEffect, useRef, useState } from "react";

import { precomputeWaves } from "../components/MidiPlayer/waves";
import { createDmxButton, deleteDmxButton, getTrackAudio, listDmxButtons, listTracks, selectTrack, updateDmxButton, uploadTrackAudio } from "../ApiClient";

interface DmxButtonsContextType {
  dmxButtons: DmxButton[]
  tracks: Track[]
  fetchTracks: () => void
  track: Track | undefined
  
  selectedDmxButtonId: string | undefined
  setSelectedDmxButtonId: (id: string | undefined) => void
  
  currentTrackId: number | undefined,
  setCurrentTrackId: (trackId: number | undefined) => void,
  
  syncTracks: () => void

  audioUrl: string | undefined
  uploadTrackAudioAndSync: (file: File) => void


  createDmxButtonAndSync: () => void
  updateDmxButtonAndSync: (id: string, params: DmxButtonUpdateParams) => void,
  deleteDmxButtonAndSync: (id: string) => void
}


export const DmxButtonsContext = createContext<DmxButtonsContextType | null>(null);

export const useDmxButtonsContext = () => {
  const dmxButtonsContext = useContext(DmxButtonsContext);

  if (!dmxButtonsContext) {
    throw new Error(
      "useCurrentUser has to be used within <CurrentUserContext.Provider>"
    );
  }
  return dmxButtonsContext
}



export const DmxButtonsContextProvider = ({ children }: {children: React.ReactNode}) => {
  // Use State to keep the values
  const [dmxButtons, setDmxButtons] = useState([] as DmxButton[])

  const [tracks, setTracks] = useState([] as Track[])
  const [track, setTrack] = useState(undefined as Track | undefined)

  const [currentTrackId, setCurrentTrackId] = useState(undefined as number | undefined)

  


  const fetchDmxButtons = () => track && listDmxButtons(track.id).then((dmxButtons) => setDmxButtons(dmxButtons))

  const syncTracks = () => listTracks().then(setTracks)

  useEffect(() => {
    fetchDmxButtons()
  }, [track])

  const [audioUrl, setAudioUrl] = useState(undefined as string | undefined)

  const syncTrackAudio = () => {
    if(!track) {
      setAudioUrl(undefined)
      return
    }
    // Without audio, the main process answers with an error object instead of a URL
    getTrackAudio(track.id).then((audioUrl) => setAudioUrl(typeof audioUrl == 'string' ? audioUrl : undefined))
  }

  useEffect(syncTrackAudio, [track?.id])


  const uploadTrackAudioAndSync = (file: File) => {
    track && uploadTrackAudio(track.id, file).then(syncTrackAudio)
  }

  useEffect(() => {
    if(currentTrackId) {
      setTrack(tracks.find((p) => p.id == currentTrackId))  
    }
    else if(tracks.length > 0) {
      selectTrack(tracks[0].id)
    }
  }, [tracks, currentTrackId])

  const availableTriggeringMidiKeys = () => [
    36,
    38,
    39,
    43,
    45,
    48,
    49,
    50,
    51,
    52,
    53,
    54
  ].filter(s => !dmxButtons.map(d => d.triggering_midi_key).includes(s))[0]

  const createDmxButtonAndSync = () => {
    track && createDmxButton({
      track_id: track.id,
      color: "#ffffff",
      duration_ms: 500,
      red_channels: [1,4,7,10,13,16,19,22],
      nature: 'Boom',
      triggering_midi_key: availableTriggeringMidiKeys()
    }).then(async (dmxButton) => {
      await fetchDmxButtons()
      // Selected once it's in the list, so the details panel can show it right away
      setSelectedDmxButtonId(dmxButton.id)
    })
  }
  const updateDmxButtonAndSync = (id: string, params: DmxButtonUpdateParams) => {
    updateDmxButton(id, params).then(fetchDmxButtons)
  }
  const deleteDmxButtonAndSync = (id: string) => {
    deleteDmxButton(id).then(fetchDmxButtons)
  }


  useEffect(() => { syncTracks() }, []) 

  // Undo or redo brought back another state of the show: everything is reloaded.
  // The listener is registered once, and calls the latest reload (it depends on the current track)
  const reloadRef = useRef<() => void>(syncTracks)
  reloadRef.current = () => {
    syncTracks()
    fetchDmxButtons()
    syncTrackAudio()
  }
  useEffect(() => window.strobe.api.onMessage('show:restored', () => reloadRef.current()), [])

  // Prepare every track's waveform in the background, so switching tracks is instant
  useEffect(() => {
    let cancelled = false
    precomputeWaves(tracks, () => cancelled)
    return () => { cancelled = true }
  }, [tracks])

  

  const [selectedDmxButtonId, setSelectedDmxButtonId] = useState(undefined as string | undefined)  


  // pass the value in provider and return
  return (
    <DmxButtonsContext.Provider value={ {
        dmxButtons, selectedDmxButtonId, setSelectedDmxButtonId,
        track, tracks, fetchTracks: syncTracks,

        syncTracks,

        audioUrl, uploadTrackAudioAndSync,

        currentTrackId, setCurrentTrackId,

        createDmxButtonAndSync, updateDmxButtonAndSync, deleteDmxButtonAndSync,
        } }>
      {children}
    </DmxButtonsContext.Provider>
  )
}
