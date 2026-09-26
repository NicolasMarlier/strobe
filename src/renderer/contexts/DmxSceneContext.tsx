import { createContext, useContext, useEffect, useState } from "react";
import { getDmxScene } from "../ApiClient";

interface DmxSceneContextType {
  dmxScene: DmxScene
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

  useEffect(() => { getDmxScene().then(setDmxScene) }, [])

  return (
    <DmxSceneContext.Provider value={ { dmxScene } }>
      {children}
    </DmxSceneContext.Provider>
  )
}
