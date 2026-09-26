import './App.scss'
import DmxScene from './components/DmxScene/DmxScene';
import DmxButtonDetails from './components/DmxButtonDetails/DmxButtonDetails';
import ProgramSelect from './components/ProgramSelect/ProgramSelect';
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



function App() {
  const { program } = useDmxButtonsContext()
  const { selectedMidiPatterns, isRecording, setIsRecording } = useDmxMidiContext()
  const { debug } = useRealTimeContext()
  
  return (
      <div id="app">
        { debug && <DebugConsole/>}
        
        <div className='section commands-bar'>
          <ProgramSelect/>
          
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
          { program ? <MidiPlayer program={program}/> : <></>}

          {selectedMidiPatterns.length == 1 && <NoteEditor pattern={ selectedMidiPatterns[0]}/>}
        </div>

        <div className="section dmx">
          <DmxButtonDetails/>
          
          <DmxButtonsCollection/>

          <DmxScene/>
        </div>
      </div>
  )
}

export default App

