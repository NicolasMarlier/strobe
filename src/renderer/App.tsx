import './App.scss'
import DmxScene from './components/DmxScene/DmxScene';
import DmxSceneDetails from './components/DmxScene/DmxSceneDetails';
import { useDmxSceneContext } from './contexts/DmxSceneContext';
import DmxButtonDetails from './components/DmxButtonDetails/DmxButtonDetails';
import TrackSetlist from './components/TrackSetlist/TrackSetlist';
import { useSetlistOpen } from './components/TrackSetlist/useSetlistOpen';
import TrackSetlistCompact from './components/TrackSetlist/TrackSetlistCompact';
import DmxButtonsCollection from './components/DmxButtonsCollection/DmxButtonsCollection';
import MidiPlayer from './components/MidiPlayer/TrackEditor';
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
import InterfacesSection from './components/Interfaces/InterfacesSection';
import TrackPicker from './components/NarrowBar/TrackPicker';
import InterfacesStatus from './components/NarrowBar/InterfacesStatus';



function App() {
  useEditMenu()
  const { track, setSelectedDmxButtonId } = useDmxButtonsContext()

  // A click on the section's empty space deselects the button; clicks on a button,
  // "New DMX button" or the details panel keep their own behavior
  const onButtonsSectionClick = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('.dmx-button, .empty-btn, .dmx-button-details')) return
    setSelectedDmxButtonId(undefined)
  }

  const { setSelectedElementIndex } = useDmxSceneContext()

  // Same for the scene's margins: a click there closes the edited element
  // (the 3D scene handles its own clicks, and the details panel keeps them)
  const onSceneSectionClick = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('.dmx-scene, .dmx-scene-details')) return
    setSelectedElementIndex(undefined)
  }
  const { selectedMidiPatterns, isRecording, setIsRecording } = useDmxMidiContext()
  const { debug } = useRealTimeContext()
  const setlist = useSetlistOpen()
  
  return (
      <div id="app" className={setlist.open ? 'with-setlist' : ''}>
        { debug && <DebugConsole/>}
        
        <div className='section commands-bar'>
          {/* On the left; the transport stays centered */}
          <div className="save-slot">
            <SaveButton/>
          </div>

          {/* In a narrow window only: the setlist and the interfaces have no room below */}
          <TrackPicker/>
          
          <div className="small-buttons-bar">
            <SmallButton
                className="red"
                value={isRecording}
                onClick={() => setIsRecording(!isRecording)}>
                <RecordIcon/>
            </SmallButton>
            <AudioPlayer/>
          </div>

          <InterfacesStatus/>
        </div>

        {/* Open, the setlist is a column on the left of the window */}
        { setlist.open && <TrackSetlist collapse={setlist.toggle}/> }

        {/* The interfaces (after the collapsed setlist), then the track automation taking the rest of the column */}
        <div className="left-column">
          <div className="top-sections">
            {/* Hidden while the column shows (see App.scss) */}
            <TrackSetlistCompact expand={setlist.toggle}/>
            <InterfacesSection/>
          </div>

          <div className="section midi">
            <div className="section-title">Track automation</div>
            <div className="section-body">
              { track ? <MidiPlayer track={track}/> : <></>}

              {selectedMidiPatterns.length == 1 && <NoteEditor pattern={ selectedMidiPatterns[0]}/>}
            </div>
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

