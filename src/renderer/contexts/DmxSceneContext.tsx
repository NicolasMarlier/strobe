import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getDmxScene, listFixtures, updateDmxScene as saveDmxScene } from "../ApiClient";
import { BUILT_IN_FIXTURES, fixtureLookup, FixtureLookup } from "../../shared/fixtures";

interface DmxSceneContextType {
  dmxScene: DmxScene
  // Only the given keys change (e.g. the elements, or the display options).
  // Given a function, it gets the latest scene: for changes made after a delay
  updateDmxScene: (changes: DmxSceneChanges) => void
  // Moves or rotates an element
  placeElement: (index: number, placement: ElementPlacement) => void
  // Element edited in the scene's details panel, highlighted in the scene
  selectedElementIndex: number | undefined
  setSelectedElementIndex: (index: number | undefined) => void
  // The fixtures elements can be made of, and why fixture files were skipped
  fixtures: FixtureProfile[]
  fixtureProblems: string[]
  fixtureOf: FixtureLookup
}

type DmxSceneChanges = Partial<DmxScene> | ((dmxScene: DmxScene) => Partial<DmxScene>)
type ElementPlacement = Partial<Pick<SceneElement, 'position' | 'rotation'>>

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

// The show's scene: how the devices are laid out on screen.
// Loaded once: opening another show reloads the window.
export const DmxSceneContextProvider = ({ children }: {children: React.ReactNode}) => {
  const [dmxScene, setDmxScene] = useState<DmxScene>({ elements: [] })
  const [selectedElementIndex, setSelectedElementIndex] = useState<number | undefined>(undefined)
  const [library, setLibrary] = useState<FixtureLibraryContents>({ fixtures: BUILT_IN_FIXTURES, problems: [] })
  // The latest scene, for changes made before a re-render
  const dmxSceneRef = useRef(dmxScene)

  const fetchDmxScene = () => getDmxScene().then(dmxScene => {
    dmxSceneRef.current = dmxScene
    setDmxScene(dmxScene)
  })
  const fetchFixtures = () => listFixtures().then(setLibrary)

  useEffect(() => { fetchDmxScene(); fetchFixtures() }, [])
  // Undo or redo brought back another state of the show
  useEffect(() => window.strobe.api.onMessage('show:restored', fetchDmxScene), [])
  // A fixture file was added, changed or removed
  useEffect(() => window.strobe.api.onMessage('fixtures:changed', fetchFixtures), [])

  const fixtureOf = useMemo(() => fixtureLookup(library.fixtures), [library])

  // Shown right away, saved in the background
  const updateDmxScene = (changes: DmxSceneChanges) => {
    const current = dmxSceneRef.current
    const dmxScene = { ...current, ...(typeof changes == 'function' ? changes(current) : changes) }
    dmxSceneRef.current = dmxScene
    setDmxScene(dmxScene)
    saveDmxScene(dmxScene)
  }

  const placeElement = (index: number, placement: ElementPlacement) =>
    updateDmxScene(dmxScene => ({
      elements: dmxScene.elements.map((element, i) => i == index ? { ...element, ...placement } : element),
    }))

  return (
    <DmxSceneContext.Provider value={ {
      dmxScene, updateDmxScene, placeElement, selectedElementIndex, setSelectedElementIndex,
      fixtures: library.fixtures, fixtureProblems: library.problems, fixtureOf,
    } }>
      {children}
    </DmxSceneContext.Provider>
  )
}
