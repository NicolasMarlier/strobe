import './App.scss'
import DmxScene from './components/DmxScene/DmxScene';
import DmxSceneDetails from './components/DmxScene/DmxSceneDetails';
import { useDmxSceneContext } from './contexts/DmxSceneContext';
import DmxButtonDetails from './components/DmxButtonDetails/DmxButtonDetails';
import TrackSelect from './components/TrackSelect/TrackSelect';
import DmxButtonsCollection from './components/DmxButtonsCollection/DmxButtonsCollection';
import MidiPlayer from './components/MidiPlayer/TrackEditor';
import Statuses from './components/Statuses/Statuses';
import { useDmxButtonsContext } from './contexts/DmxButtonsContext';
import DebugConsole from './components/DebugConsole/DebugConsole';
import { useRealTimeContext } from './contexts/RealTimeContext';
import NoteEditor from './components/MidiPlayer/NoteEditor';
import { useDmxMidiContext } from './contexts/DmxMidiContext';
import SmallButton from './components/DesignSystem/SmallButton/SmallButton';
import { RecordIcon } from './components/DesignSystem/Icons';
import AudioPlayer from './components/MidiPlayer/AudioPlayer';
import SaveButton from './components/SaveButton/SaveButton';
import SelectionLink from './components/SelectionLink/SelectionLink';
import { useEditMenu } from './useEditMenu';



function App() {
  useEditMenu()
  const { track, setSelectedDmxButtonId } = useDmxButtonsContext()

  // A click on the section's empty space deselects the button; clicks on a button,
  // "New DMX button" or the details panel keep their own behavior
  const onButtonsSectionClick = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('.dmx-button, .empty-btn, .dmx-button-details')) return
    setSelectedDmxButtonId(undefined)
  }

  const { setSelectedLedBarIndex } = useDmxSceneContext()

  // Same for the scene's margins: a click there closes the edited bar
  // (the 3D scene handles its own clicks, and the details panel keeps them)
  const onSceneSectionClick = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('.dmx-scene, .dmx-scene-details')) return
    setSelectedLedBarIndex(undefined)
  }
  const { selectedMidiPatterns, isRecording, setIsRecording } = useDmxMidiContext()
  const { debug } = useRealTimeContext()
  
  return (
      <div id="app">
        { debug && <DebugConsole/>}
        
        <div className='section commands-bar'>
          <SaveButton/>
          <TrackSelect/>
          
          <div className="small-buttons-bar">
            <SmallButton
                className="red"
                value={isRecording}
                onClick={() => setIsRecording(!isRecording)}>
                <RecordIcon/>
            </SmallButton>
            <AudioPlayer/>
          </div>
          <Statuses/>
        </div>

        <div className="section midi">
          <div className="section-title">Track automation</div>
          <div className="section-body">
            { track ? <MidiPlayer track={track}/> : <></>}

            {selectedMidiPatterns.length == 1 && <NoteEditor pattern={ selectedMidiPatterns[0]}/>}
          </div>
        </div>

        <div className="section buttons">
          <div className="section-title">Buttons</div>
          <div className="section-body" onClick={onButtonsSectionClick}>
            <DmxButtonsCollection/>

            <DmxButtonDetails/>

            <SelectionLink/>
          </div>
        </div>
        <div className="section scene">
          <div className="section-title">Scene</div>
          <div className="section-body" onClick={onSceneSectionClick}>
            <DmxScene/>

            <DmxSceneDetails/>
          </div>
        </div>

      </div>
  )
}

export default App

