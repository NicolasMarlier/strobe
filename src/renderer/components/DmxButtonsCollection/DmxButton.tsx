
import { useDmxSceneContext } from '../../contexts/DmxSceneContext'
import { humanizeMidiKey } from '../../utils'
import './DmxButton.scss' 

interface Props {
    onTap: () => void
    selected: boolean
    isPlaying: boolean
    dmxButton: DmxButton
}

const DmxButton = (props: Props) => {
    const { 
        onTap,
        selected,
        isPlaying,
        dmxButton: dmxButton
    } = props
    const { dmxScene } = useDmxSceneContext()

    const isLighted = (dmxButton: DmxButton, ledBarConfig: LedBarConfig) => (
        dmxButton.red_channels.some(c => c >= ledBarConfig.channel && c < ledBarConfig.channel + ledBarConfig.rgb_dots_count * 3)
    )
    const global = dmxButton.track_id == null

    return <div className={`dmx-button ${isPlaying ? 'playing': ''} ${selected ? 'selected' : ''} ${global ? 'global' : ''}`}
        onClick={onTap}>
            <div className="playing-light"/>
            { dmxButton.triggering_midi_key && <div className="triggering-midi-key">
                { humanizeMidiKey(dmxButton.triggering_midi_key) }
            </div> }
            
            <div className='color-symbols'>
                { dmxScene.led_bars.map(ledBarConfig => (
                    <div className='color-symbol' style={isLighted(dmxButton, ledBarConfig) ? {background: dmxButton.color} : {}}/>
                ))}
            </div>
        </div>
}

export default DmxButton