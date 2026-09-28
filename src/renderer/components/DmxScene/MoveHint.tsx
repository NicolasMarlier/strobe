interface Props {
    shift: boolean
    alt: boolean
}

// Over the scene's bottom-left corner while a LED bar is selected: how to move and rotate it
// (see useBarDrag, and the rotation rings in LedBar). The held key lights up
const MoveHint = ({ shift, alt }: Props) => {
    return <div className='move-hint'>
        <span>Drag to move</span>
        <span className='separator'>·</span>
        <span className={`key ${shift && !alt ? 'held' : ''}`}>⇧ Shift</span>
        <span>{ shift && !alt ? 'Moving vertically' : 'to move vertically' }</span>
        <span className='separator'>·</span>
        <span className={`key ${alt ? 'held' : ''}`}>⌥ Alt</span>
        <span>{ alt ? 'Rotating: drag a ring' : 'to rotate' }</span>
    </div>
}

export default MoveHint
