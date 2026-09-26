import './LedBar.scss'

import RgbDot from "./RgbDot"

interface Props {
    dmxHexSignal: string
    size: number
    channel: number
    style?: LedBarStyle
    selectedRedChannels: number[]
    onSelectRedChannels: (channels: number[], selected: boolean) => void
}

// DMX Channels are setup on device, from 001 to 511
// The DMX signal is composed on hexadecimal values
const dmxSignalAtChannel = (dmxHexSignal: DmxHexSignal, channel: number) => {
    return parseInt(dmxHexSignal.slice(2*channel, 2*channel + 2), 16) || 0
}


const LedBar = (props: Props) => {
    const { size, dmxHexSignal, channel, selectedRedChannels, onSelectRedChannels, style } = props
    
    const redChannels = Array.from(Array(size).keys()).map((i) => channel + i * 3)
    const selected = redChannels.every(redChannel => selectedRedChannels.includes(redChannel))
    

    const handleClick = (e: any) => {
        if(e.target == e.currentTarget) {
            onSelectRedChannels(redChannels, !selected)
        }
    }
    
    
    return <div className={`led-bar ${selected ? 'selected': ''}`}
        onClick={handleClick}
        style={style}
        >
        { redChannels.map((redChannel) => (
            <RgbDot
                key={redChannel}
                red={   dmxSignalAtChannel(dmxHexSignal, redChannel + 0)}
                green={ dmxSignalAtChannel(dmxHexSignal, redChannel + 1)}
                blue={  dmxSignalAtChannel(dmxHexSignal, redChannel + 2)}
                selected={ !selected && selectedRedChannels.includes(redChannel)}
                onClick={ () => onSelectRedChannels([redChannel], !selectedRedChannels.includes(redChannel)) }
            />
        ))}
    </div>
}


export default LedBar
