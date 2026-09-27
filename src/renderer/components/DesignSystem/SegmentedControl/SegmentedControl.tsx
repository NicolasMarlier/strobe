import type { ReactNode } from 'react'
import './SegmentedControl.scss'

interface Option<T> {
    value: T
    label: ReactNode
}

interface Props<T> {
    options: Option<T>[]
    value: T
    onChange: (value: T) => void
    className?: string
}

// Picks one of a few options, shown side by side (e.g. the scene's Display / Edit)
const SegmentedControl = <T,>(props: Props<T>) => {
    const { options, value, onChange, className } = props
    return <div className={`segmented-control ${className ?? ''}`}>
        { options.map((option, index) => (
            <div
                key={index}
                className={`segmented-control-option ${option.value == value ? 'active' : ''}`}
                onClick={() => onChange(option.value)}>
                { option.label }
            </div>
        ))}
    </div>
}
export default SegmentedControl
