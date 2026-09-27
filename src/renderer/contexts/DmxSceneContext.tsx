import { createContext, useContext, useEffect, useState } from "react";
import { getDmxScene, updateDmxScene as saveDmxScene } from "../ApiClient";

interface DmxSceneContextType {
  dmxScene: DmxScene
  updateDmxScene: (dmxScene: DmxScene) => void
  // LED bar edited in the scene's details panel, highlighted in the scene
  selectedLedBarIndex: number | undefined
  setSelectedLedBarIndex: (index: number | undefined) => void
}

const DmxSceneContext = createContext<DmxSceneContextType | null>(null);

export const useDmxSceneContext = () => {
  const dmxSceneContext = useContext(DmxSceneContext);

  if (!dmxSceneContext) {
    throw new Error(
      "useDmxSceneContext has to be used within <DmxSceneContext.Provider>"
    );
  }
  return dmxSceneContext
}

// The show's scene: how the lights are laid out on screen.
// Loaded once: opening another show reloads the window.
export const DmxSceneContextProvider = ({ children }: {children: React.ReactNode}) => {
  const [dmxScene, setDmxScene] = useState<DmxScene>({ led_bars: [] })
  const [selectedLedBarIndex, setSelectedLedBarIndex] = useState<number | undefined>(undefined)

  useEffect(() => { getDmxScene().then(setDmxScene) }, [])

  // Shown right away, saved in the background
  const updateDmxScene = (dmxScene: DmxScene) => {
    setDmxScene(dmxScene)
    saveDmxScene(dmxScene)
  }

  return (
    <DmxSceneContext.Provider value={ { dmxScene, updateDmxScene, selectedLedBarIndex, setSelectedLedBarIndex } }>
      {children}
    </DmxSceneContext.Provider>
  )
}
