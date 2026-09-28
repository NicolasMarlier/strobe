import { useState } from 'react'

export interface SceneDisplay {
    showBeams: boolean
    showGrid: boolean
}

const OPTIONS: { key: keyof SceneDisplay, label: string }[] = [
    { key: 'showBeams', label: 'Show beams' },
    { key: 'showGrid', label: 'Show grid' },
]

interface Props {
    display: SceneDisplay
    onChange: (display: SceneDisplay) => void
}

// Small menu over the scene's top-left corner: what the scene shows
const SceneSettings = ({ display, onChange }: Props) => {
    const [open, setOpen] = useState(false)

    return <div className={`scene-settings ${open ? 'open' : ''}`}>
        <div className='scene-settings-button' title='Display settings' onClick={() => setOpen(!open)}>
            <svg viewBox='0 0 18 18' width='18' height='18'>
                <path d='M3 4.5h12M3 9h12M3 13.5h12' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/>
            </svg>
        </div>

        { open && <div className='scene-settings-menu'>
            { OPTIONS.map(({ key, label }) => (
                <label key={key}>
                    <input
                        type='checkbox'
                        checked={display[key]}
                        onChange={(e) => onChange({ ...display, [key]: e.target.checked })}/>
                    {label}
                </label>
            ))}
        </div> }
    </div>
}

export default SceneSettings
