import type { ReactNode } from 'react'
import './SmallButton.scss'

interface Props {
    value?: boolean
    onClick?: () => void
    disabled?: boolean
    className?: string
    children: ReactNode
}

const SmallButton = (props: Props) => {
    const { value, onClick, children, disabled, className } = props
    return <div
                className={`small-button ${value ? 'active' : ''} ${disabled ? 'disabled' : 'enabled'} ${className}`}
                onClick={!disabled && onClick || (() => {})}>
                { children }
        </div>
}
export default SmallButton