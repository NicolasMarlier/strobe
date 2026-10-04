import type { ReactNode } from 'react'
import './SmallButton.scss'

interface Props {
    value?: boolean
    onClick?: () => void
    disabled?: boolean
    className?: string
    title?: string
    children: ReactNode
}

const SmallButton = (props: Props) => {
    const { value, onClick, children, disabled, className, title } = props
    return <div
                title={title}
                className={`small-button ${value ? 'active' : ''} ${disabled ? 'disabled' : 'enabled'} ${className}`}
                onClick={disabled ? undefined : onClick}>
                { children }
        </div>
}
export default SmallButton