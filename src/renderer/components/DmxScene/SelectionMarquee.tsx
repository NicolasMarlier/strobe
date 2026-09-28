import { Line } from '@react-three/drei'

// Inside each lens, so the rectangles of two selected neighbors stay apart, just in front of it (meters)
const INSET = 0.008
const Z_OFFSET = 0.004
// In pixels, whatever the zoom
const LINE_WIDTH = 2.5

interface Props {
    // Which of the bar's dots are selected, in order along the bar
    selected: boolean[]
    // X of each dot's center along the bar, and the lenses' size (meters)
    dotX: (index: number) => number
    lensWidth: number
    lensHeight: number
    // The lenses' front, in the bar's space
    lensZ: number
}

type LensProps = Omit<Props, 'selected'> & { index: number, opacity?: number }

// Rectangle over one lens, in the bar's space
const LensRectangle = ({ index, dotX, lensWidth, lensHeight, lensZ, opacity = 1 }: LensProps) => {
    const x = dotX(index)
    const left = x - lensWidth / 2 + INSET
    const right = x + lensWidth / 2 - INSET
    const top = lensHeight / 2 - INSET
    const z = lensZ + Z_OFFSET
    return <Line
        points={[[left, -top, z], [right, -top, z], [right, top, z], [left, top, z], [left, -top, z]]}
        color='#fff'
        transparent={opacity < 1}
        opacity={opacity}
        lineWidth={LINE_WIDTH}
        raycast={() => null}/>
}

// Hovering a lens while assigning: a half-tinted rectangle, about to change.
// When it's selected, the selection is drawn without it (see LedBar)
const HOVER_OPACITY = 0.5

export const LensHoverPreview = (props: Omit<LensProps, 'opacity'>) =>
    <LensRectangle {...props} opacity={HOVER_OPACITY}/>

// A rectangle over each of a LED bar's selected lenses, in the bar's space
const SelectionMarquee = ({ selected, ...lens }: Props) => {
    return <>
        { selected.map((isSelected, index) => isSelected && <LensRectangle key={index} index={index} {...lens}/>) }
    </>
}

export default SelectionMarquee
