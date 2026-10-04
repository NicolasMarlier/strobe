import './App.scss'
import DmxScene from './components/DmxScene/DmxScene';
import DmxSceneDetails from './components/DmxScene/DmxSceneDetails';
import { useDmxSceneContext } from './contexts/DmxSceneContext';
import DmxButtonDetails from './components/DmxButtonDetails/DmxButtonDetails';
import TrackSetlist from './components/TrackSetlist/TrackSetlist';
import { useSetlistOpen } from './components/TrackSetlist/useSetlistOpen';
import { useTrackArrows } from './components/TrackSetlist/useTrackArrows';
import TrackSetlistCompact from './components/TrackSetlist/TrackSetlistCompact';
import DmxButtonsCollection from './components/DmxButtonsCollection/DmxButtonsCollection';
import MidiPlayer from './components/MidiPlayer/TrackEditor';
import { useDmxButtonsContext } from './contexts/DmxButtonsContext';
import DebugConsole from './components/DebugConsole/DebugConsole';
import { useRealTimeContext } from './contexts/RealTimeContext';
import NoteEditor from './components/MidiPlayer/NoteEditor';
import { useDmxMidiContext } from './contexts/DmxMidiContext';
import { isSelected } from './components/MidiPlayer/utils_midi_patterns';
import SmallButton from './components/DesignSystem/SmallButton/SmallButton';
import { RecordIcon } from './components/DesignSystem/Icons';
import AudioPlayer from './components/MidiPlayer/AudioPlayer';
import SaveButton from './components/SaveButton/SaveButton';
import SelectionLink from './components/SelectionLink/SelectionLink';
import { useEditMenu } from './useEditMenu';
import { useNarrowWindow } from './useNarrowWindow';
import { sendUsageSignal } from './ApiClient';
import { useEffect } from 'react';
import InterfacesSection from './components/Interfaces/InterfacesSection';
import TrackPicker from './components/NarrowBar/TrackPicker';
import InterfacesStatus from './components/NarrowBar/InterfacesStatus';



function App() {
  useEditMenu()

  // For the anonymous usage statistics: whether the narrow window is used at all
  const isNarrowWindow = useNarrowWindow()
  useEffect(() => {
    if (isNarrowWindow) sendUsageSignal('Strobe.narrowWindowUsed')
  }, [isNarrowWindow])
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
  const { selectedMidiPatterns, midiPatterns, isRecording, setIsRecording } = useDmxMidiContext()
  // Those still in the track (a change can have replaced them), for the timeline's hint
  const selectedPatternCount = midiPatterns.filter(p => isSelected(p, selectedMidiPatterns)).length
  const { debug, drivenByMidi } = useRealTimeContext()
  const setlist = useSetlistOpen()
  useTrackArrows()
  
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
          
          <div className={`transport ${drivenByMidi ? 'driven-by-midi' : ''}`}>
            <div className="small-buttons-bar">
              <SmallButton
                  className="red"
                  title={isRecording ? 'Stop Recording' : 'Record'}
                  value={isRecording}
                  onClick={() => setIsRecording(!isRecording)}>
                  <RecordIcon/>
              </SmallButton>
              <AudioPlayer/>
            </div>
            {/* While MainStage drives playback, said next to the transport it replaces */}
            { drivenByMidi && <div className="driven-by-midi-badge" title='Playback is driven by MainStage'>
              <span className="light"/>MainStage
            </div> }
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
            {/* The timeline's own keys, for what's at hand: moving the cursor while nothing is selected,
                what can be done to the selection otherwise. The generic ones (Copy, Paste, Delete…) are only
                in the Edit menu, all of them in the menus */}
            <div className="section-hint">
              { selectedPatternCount == 0 ? <>
                <span><kbd>←</kbd> <kbd>→</kbd> one beat</span>
                <span><kbd>↵</kbd> back to start</span>
              </> : <>
                { selectedPatternCount == 1 && <span><kbd>T</kbd> split</span> }
                { selectedPatternCount >= 2 && <span><kbd>J</kbd> join</span> }
                <span><kbd>L</kbd> loop</span>
              </> }
            </div>
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

