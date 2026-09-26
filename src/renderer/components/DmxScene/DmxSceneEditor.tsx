import './DmxSceneEditor.scss'
import LedBar from './LedBar'
import { useDmxSceneContext } from '../../contexts/DmxSceneContext'

const DMX_CHANNELS = 512
const NEW_LED_BAR_DOTS = 8

interface Props {
    dmxHexSignal: string
}

interface Field {
    key: 'channel' | 'rgb_dots_count'
    label: string
    max: number
}

const FIELDS: Field[] = [
    { key: 'channel', label: 'Channel', max: DMX_CHANNELS },
    { key: 'rgb_dots_count', label: 'Dots', max: Math.floor(DMX_CHANNELS / 3) },
]

// Where the bar is drawn in the scene, as CSS values (e.g. 'rotateY(110deg) rotateZ(11deg)', '-30%')
const STYLE_FIELDS: { key: keyof LedBarStyle, label: string }[] = [
    { key: 'transform', label: 'Transform' },
    { key: 'left', label: 'Left' },
    { key: 'right', label: 'Right' },
    { key: 'top', label: 'Top' },
    { key: 'bottom', label: 'Bottom' },
]

// First channel after the last LED bar, so a new bar doesn't overlap the others
const nextFreeChannel = (ledBars: LedBarConfig[]) =>
    Math.max(1, ...ledBars.map(({ channel, rgb_dots_count }) => channel + rgb_dots_count * 3))

// Edit mode of the scene: LED bars shown straight, one per row, each with its settings
const DmxSceneEditor = ({ dmxHexSignal }: Props) => {
    const { dmxScene, updateDmxScene } = useDmxSceneContext()
    const ledBars = dmxScene.led_bars

    const updateLedBar = (index: number, changes: Partial<LedBarConfig>) =>
        updateDmxScene({ led_bars: ledBars.map((ledBar, i) => i == index ? { ...ledBar, ...changes } : ledBar) })

    const deleteLedBar = (index: number) =>
        updateDmxScene({ led_bars: ledBars.filter((_, i) => i != index) })

    const addLedBar = () => updateDmxScene({ led_bars: [
        ...ledBars,
        {
            channel: Math.min(nextFreeChannel(ledBars), DMX_CHANNELS - NEW_LED_BAR_DOTS * 3 + 1),
            rgb_dots_count: NEW_LED_BAR_DOTS,
        },
    ]})

    const onFieldChange = (index: number, field: Field, value: string) => {
        const number = parseInt(value, 10)
        // Let the field be empty or incomplete while typing
        if (Number.isNaN(number)) return
        updateLedBar(index, { [field.key]: Math.min(field.max, Math.max(1, number)) })
    }

    // An empty field removes the value, and a bar without any keeps no style at all
    const onStyleFieldChange = (index: number, key: keyof LedBarStyle, value: string) => {
        const style: LedBarStyle = { ...ledBars[index].style }
        if (value.trim()) style[key] = value.trim()
        else delete style[key]

        const ledBar: LedBarConfig = { ...ledBars[index], style }
        if (Object.keys(style).length == 0) delete ledBar.style
        updateDmxScene({ led_bars: ledBars.map((current, i) => i == index ? ledBar : current) })
    }

    return <div className='dmx-scene-editor'>
        { ledBars.map((ledBar, index) => (
            // The inputs keep what's typed: rebuild the rows when bars are added or removed,
            // so no row shows the values of the bar that was at its place before
            <div key={`${ledBars.length}-${index}`} className='led-bar-row'>
                <div className='led-bar-preview'>
                    <span className='led-bar-index'>#{index + 1}</span>
                    <LedBar
                        className='flat'
                        dmxHexSignal={dmxHexSignal}
                        size={ledBar.rgb_dots_count}
                        channel={ledBar.channel}
                        selectedRedChannels={[]}
                        onSelectRedChannels={() => undefined}/>
                </div>
                <div className='led-bar-fields'>
                    { FIELDS.map(field => (
                        <label key={field.key} className='led-bar-field'>
                            <span>{field.label}</span>
                            <input
                                type='number'
                                defaultValue={ledBar[field.key]}
                                min={1}
                                max={field.max}
                                step={1}
                                onChange={(e) => onFieldChange(index, field, e.target.value)}
                                // Show the value actually kept (bounded, rounded) once done typing
                                onBlur={(e) => { e.target.value = String(ledBar[field.key]) }}/>
                        </label>
                    ))}
                    <div className='led-bar-delete' title='Delete this LED bar' onClick={() => deleteLedBar(index)}>×</div>
                </div>
                <div className='led-bar-fields'>
                    { STYLE_FIELDS.map(({ key, label }) => (
                        <label key={key} className={`led-bar-field style-field ${key}`}>
                            <span>{label}</span>
                            <input
                                type='text'
                                spellCheck={false}
                                defaultValue={ledBar.style?.[key] ?? ''}
                                onChange={(e) => onStyleFieldChange(index, key, e.target.value)}/>
                        </label>
                    ))}
                </div>
            </div>
        ))}
        <div className='empty-btn led-bar-add' onClick={addLedBar}>+ Add LED bar</div>
    </div>
}

export default DmxSceneEditor
