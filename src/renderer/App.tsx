import './App.scss'
import DmxScene from './components/DmxScene/DmxScene';
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



function App() {
  const { track } = useDmxButtonsContext()
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
          { track ? <MidiPlayer track={track}/> : <></>}

          {selectedMidiPatterns.length == 1 && <NoteEditor pattern={ selectedMidiPatterns[0]}/>}
        </div>

        <div className="section buttons">
          <DmxButtonDetails/>
          
          <DmxButtonsCollection/>
        </div>
        <div className="section scene">
          <DmxScene/>
        </div>

      </div>
  )
}

export default App

