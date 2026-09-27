import './DmxScene.scss'
import LedBar from "./LedBar";
import { useDmxButtonsContext } from "../../contexts/DmxButtonsContext";
import { useRealTimeContext } from "../../contexts/RealTimeContext";
import { useDmxSceneContext } from "../../contexts/DmxSceneContext";

const DmxScene = () => {
    const { dmxButtons, selectedDmxButtonId } = useDmxButtonsContext()
    const { dmxScene, selectedLedBarIndex } = useDmxSceneContext()
    const { dmxHexSignal } = useRealTimeContext()

    const { updateDmxButtonAndSync } = useDmxButtonsContext()

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

    // LED bars are edited in the details panel next to the scene (DmxSceneDetails).
    // Clicking a bar here assigns its channels to the selected DMX button
    return <div className='dmx-scene'>
      { dmxScene.led_bars.map((ledBarConfig, index) => (
          <LedBar
            key={index}
            className={selectedLedBarIndex == index ? 'editing' : ''}
            style={ledBarConfig.style}
            dmxHexSignal={dmxHexSignal}
            size={ledBarConfig.rgb_dots_count}
            channel={ledBarConfig.channel}
            selectedRedChannels={selectedRedChannels}
            onSelectRedChannels={onSelectRedChannels}/>
      ))}
    </div>
}

export default DmxScene
