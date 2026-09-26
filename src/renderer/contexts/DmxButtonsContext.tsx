import { createContext, useContext, useEffect, useState } from "react";

import { createDmxButton, deleteDmxButton, getProgramAudio, listDmxButtons, listPrograms, selectProgram, updateDmxButton, uploadProgramAudio } from "../ApiClient";

interface DmxButtonsContextType {
  dmxButtons: DmxButton[]
  programs: Program[]
  fetchPrograms: () => void
  program: Program | undefined
  
  selectedDmxButtonId: string | undefined
  setSelectedDmxButtonId: (id: string | undefined) => void
  
  currentProgramId: number | undefined,
  setCurrentProgramId: (programId: number | undefined) => void,
  
  syncPrograms: () => void

  audioUrl: string | undefined
  uploadProgramAudioAndSync: (file: File) => void

  ledBarConfigs: LedBarConfig[],

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

  const [programs, setPrograms] = useState([] as Program[])
  const [program, setProgram] = useState(undefined as Program | undefined)

  const [currentProgramId, setCurrentProgramId] = useState(undefined as number | undefined)

  


  const fetchDmxButtons = () => program && listDmxButtons(program.id).then((dmxButtons) => setDmxButtons(dmxButtons))

  const syncPrograms = () => listPrograms().then(setPrograms)

  useEffect(() => {
    fetchDmxButtons()
  }, [program])

  const [audioUrl, setAudioUrl] = useState(undefined as string | undefined)

  const syncProgramAudio = () => {
    if(!program) {
      setAudioUrl(undefined)
      return
    }
    getProgramAudio(program.id).then((audioUrl) => setAudioUrl(audioUrl || undefined))
  }

  useEffect(syncProgramAudio, [program?.id])

  // Free the previous blob once consumers switched to the new one
  useEffect(() => () => { if(audioUrl) URL.revokeObjectURL(audioUrl) }, [audioUrl])

  const uploadProgramAudioAndSync = (file: File) => {
    program && uploadProgramAudio(program.id, file).then(syncProgramAudio)
  }

  useEffect(() => {
    if(currentProgramId) {
      setProgram(programs.find((p) => p.id == currentProgramId))  
    }
    else if(programs.length > 0) {
      selectProgram(programs[0].id)
    }
  }, [programs, currentProgramId])

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
    program && createDmxButton({
      program_id: program.id,
      color: "#ffffff",
      duration_ms: 500,
      red_channels: [1,4,7,10,13,16,19,22],
      nature: 'Boom',
      triggering_midi_key: availableTriggeringMidiKeys()
    }).then(fetchDmxButtons)
  }
  const updateDmxButtonAndSync = (id: string, params: DmxButtonUpdateParams) => {
    updateDmxButton(id, params).then(fetchDmxButtons)
  }
  const deleteDmxButtonAndSync = (id: string) => {
    deleteDmxButton(id).then(fetchDmxButtons)
  }


  useEffect(() => { syncPrograms() }, []) 

  const ledBarConfigs = [
    {
      channel: 1,
      rgbDotsCount: 8,
      style: {
        transform: 'rotateY(110deg) rotateZ(11deg)',
        left: '-30%',
        bottom: '20%'
      }
    },
    {
      channel: 25,
      rgbDotsCount: 8,
      style: {
        transform: 'rotateY(110deg) rotateZ(-11deg)',
        right: '-30%',
        bottom: '20%'
      }
    },
    // {channel: 49, rgbDotsCount: 8},
    // {channel: 73, rgbDotsCount: 8},
    {
      channel: 97,
      rgbDotsCount: 16,
      style: {
        transform: 'rotate(90deg) scale(0.5)',
        top: '25%'
      }

    },
    {
      channel: 145, rgbDotsCount: 1,
      style: {
        transform: 'scale(0.5)',
        bottom: '-10%',
      }
    },
  ]
  

  const [selectedDmxButtonId, setSelectedDmxButtonId] = useState(undefined as string | undefined)  


  // pass the value in provider and return
  return (
    <DmxButtonsContext.Provider value={ {
        dmxButtons, selectedDmxButtonId, setSelectedDmxButtonId,
        program, programs, fetchPrograms: syncPrograms,

        syncPrograms,

        audioUrl, uploadProgramAudioAndSync,

        currentProgramId, setCurrentProgramId,

        ledBarConfigs,

        createDmxButtonAndSync, updateDmxButtonAndSync, deleteDmxButtonAndSync,
        } }>
      {children}
    </DmxButtonsContext.Provider>
  )
}
