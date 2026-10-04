import { useDmxButtonsContext } from '../../contexts/DmxButtonsContext'

export const ChevronIcon = () => <svg className='chevron' viewBox='0 0 10 10' width='8' height='8'>
    <path d='M2 3.5 5 6.5 8 3.5' fill='none' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round'/>
</svg>

interface Props {
    expand: () => void
}

// The collapsed setlist, on the left of the interfaces: the current track only.
// A click expands it back into the column (as does Cmd+\)
const TrackSetlistCompact = ({ expand }: Props) => {
    const { track } = useDmxButtonsContext()

    return <div className='section setlist-compact' onClick={expand} title='Show the setlist (⌘\)'>
        <div className='section-title setlist-title'>
            Setlist
            <ChevronIcon/>
        </div>
        <div className='section-body'>
            { track
                ? <>
                    <span className='setlist-compact-program'>Program {track.id}</span>
                    <span className='setlist-compact-name' title={track.name}>{track.name}</span>
                    <span className='setlist-compact-bpm'>{track.bpm} BPM</span>
                </>
                : <span className='setlist-compact-program'>No track</span> }
        </div>
    </div>
}

export default TrackSetlistCompact
