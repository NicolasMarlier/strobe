import { useState } from 'react'

const OPTIONS: { key: 'show_beams' | 'show_grid' | 'camera_motion', label: string }[] = [
    { key: 'show_beams', label: 'Show beams' },
    { key: 'show_grid', label: 'Show grid' },
    { key: 'camera_motion', label: 'Camera motion while playing' },
]

interface Props {
    display: DmxSceneDisplay
    onChange: (changes: Partial<DmxSceneDisplay>) => void
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
                        onChange={(e) => onChange({ [key]: e.target.checked })}/>
                    {label}
                </label>
            ))}
        </div> }
    </div>
}

export default SceneSettings
