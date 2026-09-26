import './Toggle.scss'

interface Props {
    value: boolean
    onChange?: (value: boolean) => void
    disabled?: boolean
}

const Toggle = (props: Props) => {
    const { value, onChange, disabled } = props
    return <div
                className={`toggle ${value ? 'active' : ''} ${disabled ? 'disabled' : 'enabled'}`}
                onClick={() => !disabled && onChange && onChange(!value)}>
            <div className='toggle-pin'/>
        </div>
}
export default Toggle