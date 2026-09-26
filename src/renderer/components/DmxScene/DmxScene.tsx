import './DmxScene.scss'
import { useState } from 'react';
import LedBar from "./LedBar";
import DmxSceneEditor from './DmxSceneEditor';
import { useDmxButtonsContext } from "../../contexts/DmxButtonsContext";
import { useRealTimeContext } from "../../contexts/RealTimeContext";
import { useDmxSceneContext } from "../../contexts/DmxSceneContext";

type Mode = 'display' | 'edit'

const DmxScene = () => {
    const { dmxButtons, selectedDmxButtonId } = useDmxButtonsContext()
    const { dmxScene } = useDmxSceneContext()
    const { dmxHexSignal } = useRealTimeContext()

    const { updateDmxButtonAndSync } = useDmxButtonsContext()

    const [mode, setMode] = useState<Mode>('display')

    const selectedRedChannels = dmxButtons.find(({id}) => selectedDmxButtonId == id)?.red_channels || []

    const onSelectRedChannels = (redChannels: number[], selected: boolean) => {
      if(!selectedDmxButtonId) return

      if(selected) {
        updateDmxButtonAndSync(selectedDmxButtonId, {red_channels: [...new Set([...selectedRedChannels, ...redChannels])]})
      }
      else {
        updateDmxButtonAndSync(selectedDmxButtonId, {red_channels: selectedRedChannels.filter(channel => redChannels.indexOf(channel) == -1)})
      }
    }

    return <div className='dmx-scene'>
      <div className='dmx-scene-modes'>
        { (['display', 'edit'] as Mode[]).map(m => (
          <div key={m} className={`dmx-scene-mode ${mode == m ? 'active' : ''}`} onClick={() => setMode(m)}>
            { m == 'display' ? 'Display' : 'Edit' }
          </div>
        ))}
      </div>

      { mode == 'edit'
        ? <DmxSceneEditor dmxHexSignal={dmxHexSignal}/>
        : dmxScene.led_bars.map((ledBarConfig, index) => (
            <LedBar
              key={index}
              style={ledBarConfig.style}
              dmxHexSignal={dmxHexSignal}
              size={ledBarConfig.rgb_dots_count}
              channel={ledBarConfig.channel}
              selectedRedChannels={selectedRedChannels}
              onSelectRedChannels={onSelectRedChannels}/>
        ))
      }
    </div>
}

export default DmxScene
