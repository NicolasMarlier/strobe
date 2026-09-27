import './DmxScene.scss'
import { useState } from 'react';
import LedBar from "./LedBar";
import DmxSceneEditor from './DmxSceneEditor';
import SegmentedControl from '../DesignSystem/SegmentedControl/SegmentedControl';
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
      <SegmentedControl
        className='dmx-scene-modes'
        options={[{ value: 'display', label: 'Display' }, { value: 'edit', label: 'Edit' }]}
        value={mode}
        onChange={setMode}/>

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
