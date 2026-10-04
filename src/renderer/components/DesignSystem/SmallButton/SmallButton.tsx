import type { ReactNode } from 'react'
import './SmallButton.scss'

interface Props {
    value?: boolean
    onClick?: () => void
    disabled?: boolean
    className?: string
    // Shown right away under the button on hover (macOS' native title tooltips are slow, or don't show)
    title?: string
    children: ReactNode
}

const SmallButton = (props: Props) => {
    const { value, onClick, children, disabled, className, title } = props
    return <div
                data-tooltip={title}
                className={`small-button ${value ? 'active' : ''} ${disabled ? 'disabled' : 'enabled'} ${className}`}
                onClick={disabled ? undefined : onClick}>
                { children }
        </div>
}
export default SmallButton