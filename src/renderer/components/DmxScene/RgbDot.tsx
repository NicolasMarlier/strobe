import './RgbDot.scss'

interface Props {
    red: number
    green: number
    blue: number,
    selected: boolean
    onClick: () => void
}
const RgbDot = (props: Props) => {
    const {red, green, blue, selected, onClick} = props
    
    return <div
        className={`rgb-dot ${selected ? 'selected' : ''}`}
        onClick={() => onClick()}>
            <div className='content'
                style={{background: `rgb(${red}, ${green}, ${blue})`}}/>
        </div>
}
export default RgbDot