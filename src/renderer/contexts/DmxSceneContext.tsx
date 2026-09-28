import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getDmxScene, updateDmxScene as saveDmxScene } from "../ApiClient";

interface DmxSceneContextType {
  dmxScene: DmxScene
  // Only the given keys change (e.g. the LED bars, or the display options).
  // Given a function, it gets the latest scene: for changes made after a delay
  updateDmxScene: (changes: DmxSceneChanges) => void
  // LED bar edited in the scene's details panel, highlighted in the scene
  selectedLedBarIndex: number | undefined
  setSelectedLedBarIndex: (index: number | undefined) => void
}

type DmxSceneChanges = Partial<DmxScene> | ((dmxScene: DmxScene) => Partial<DmxScene>)

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
  // The latest scene, for changes made before a re-render
  const dmxSceneRef = useRef(dmxScene)

  useEffect(() => {
    getDmxScene().then(dmxScene => {
      dmxSceneRef.current = dmxScene
      setDmxScene(dmxScene)
    })
  }, [])

  // Shown right away, saved in the background
  const updateDmxScene = (changes: DmxSceneChanges) => {
    const current = dmxSceneRef.current
    const dmxScene = { ...current, ...(typeof changes == 'function' ? changes(current) : changes) }
    dmxSceneRef.current = dmxScene
    setDmxScene(dmxScene)
    saveDmxScene(dmxScene)
  }

  return (
    <DmxSceneContext.Provider value={ { dmxScene, updateDmxScene, selectedLedBarIndex, setSelectedLedBarIndex } }>
      {children}
    </DmxSceneContext.Provider>
  )
}
