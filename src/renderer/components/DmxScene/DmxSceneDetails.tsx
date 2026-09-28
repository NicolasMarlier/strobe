import '../DesignSystem/DetailsPanel/DetailsPanel.scss'
import './DmxSceneDetails.scss'
import { useDmxSceneContext } from '../../contexts/DmxSceneContext'
import { defaultLedBarPosition } from '../../../shared/led_bar'

const DMX_CHANNELS = 512
const NEW_LED_BAR_DOTS = 8

interface Field {
    key: 'channel' | 'rgb_dots_count'
    label: string
    max: number
}

const FIELDS: Field[] = [
    { key: 'channel', label: 'Channel', max: DMX_CHANNELS },
    { key: 'rgb_dots_count', label: 'Dots', max: Math.floor(DMX_CHANNELS / 3) },
]

// First channel after the last LED bar, so a new bar doesn't overlap the others
const nextFreeChannel = (ledBars: LedBarConfig[]) =>
    Math.max(1, ...ledBars.map(({ channel, rgb_dots_count }) => channel + rgb_dots_count * 3))

// DMX channels a bar uses, 3 per dot (red, green, blue)
const channelRange = ({ channel, rgb_dots_count }: LedBarConfig) => `${channel}–${channel + rgb_dots_count * 3 - 1}`

// Panel on the right of the scene: the LED bars list, or the selected bar's settings
const DmxSceneDetails = () => {
    const { dmxScene, updateDmxScene, selectedLedBarIndex, setSelectedLedBarIndex } = useDmxSceneContext()
    const ledBars = dmxScene.led_bars
    const selectedLedBar = selectedLedBarIndex == undefined ? undefined : ledBars[selectedLedBarIndex]

    const updateLedBar = (index: number, ledBar: LedBarConfig) =>
        updateDmxScene({ led_bars: ledBars.map((current, i) => i == index ? ledBar : current) })

    // The new bar opens right away, like a new DMX button
    const addLedBar = () => {
        updateDmxScene({ led_bars: [
            ...ledBars,
            {
                channel: Math.min(nextFreeChannel(ledBars), DMX_CHANNELS - NEW_LED_BAR_DOTS * 3 + 1),
                rgb_dots_count: NEW_LED_BAR_DOTS,
                // Moved and rotated by dragging it in the scene
                position: defaultLedBarPosition(ledBars.length),
                rotation: [0, 0, 0],
            },
        ]})
        setSelectedLedBarIndex(ledBars.length)
    }

    const deleteLedBar = (index: number) => {
        updateDmxScene({ led_bars: ledBars.filter((_, i) => i != index) })
        setSelectedLedBarIndex(undefined)
    }

    if (selectedLedBarIndex == undefined || !selectedLedBar) {
        return <div className='details-panel dmx-scene-details'>
            <label>LED bars</label>
            <div className='led-bars-list'>
                { ledBars.map((ledBar, index) => (
                    <div key={index} className='led-bars-list-item' onClick={() => setSelectedLedBarIndex(index)}>
                        <span className='name'>LED bar #{index + 1}</span>
                        <span className='channels'>{ channelRange(ledBar) }</span>
                    </div>
                ))}
            </div>
            <div className='btn empty add-element' onClick={addLedBar}>+ Add an element</div>
        </div>
    }

    const onFieldChange = (field: Field, value: string) => {
        const number = parseInt(value, 10)
        // Let the field be empty or incomplete while typing
        if (Number.isNaN(number)) return
        updateLedBar(selectedLedBarIndex, { ...selectedLedBar, [field.key]: Math.min(field.max, Math.max(1, number)) })
    }

    // The inputs keep what's typed: rebuild them for another bar, or when the bars move around,
    // so they never show the values of the bar that was selected before
    return <div key={`${selectedLedBarIndex}-${ledBars.length}`} className='details-panel dmx-scene-details'>
        <div className='details-header'>
            <span>LED bar #{selectedLedBarIndex + 1}</span>
            <div className='close-btn' title='Close' onClick={() => setSelectedLedBarIndex(undefined)}>×</div>
        </div>

        { FIELDS.map(field => (
            <div key={field.key}>
                <label>{field.label}</label>
                <input
                    type='number'
                    defaultValue={selectedLedBar[field.key]}
                    min={1}
                    max={field.max}
                    step={1}
                    onChange={(e) => onFieldChange(field, e.target.value)}
                    // Show the value actually kept (bounded, rounded) once done typing
                    onBlur={(e) => { e.target.value = String(selectedLedBar[field.key]) }}/>
            </div>
        ))}

        <div className='delete-btn btn' onClick={() => deleteLedBar(selectedLedBarIndex)}>DELETE</div>
    </div>
}

export default DmxSceneDetails
