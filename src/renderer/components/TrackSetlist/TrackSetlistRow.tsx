import InlineInput from '../DesignSystem/InlineInput/InlineInput'

export type RowEditing = 'name' | 'program' | 'bpm' | undefined

interface Props {
    track: Track
    isCurrent: boolean
    editing: RowEditing
    error: string | undefined
    isDragged: boolean
    onSelect: () => void
    onStartRename: () => void
    onCommitName: (name: string) => void
    onCommitProgram: (program: string) => void
    onStartBpm: () => void
    onCommitBpm: (bpm: string) => void
    onCancelEditing: () => void
    onContextMenu: (e: React.MouseEvent) => void
    onMouseDown: (e: React.MouseEvent) => void
}

// One track of the setlist: its MIDI program, name, audio and tempo.
// Click selects it, double-click renames it (or changes its BPM, on the BPM), drag moves it
const TrackSetlistRow = (props: Props) => {
    const { track, isCurrent, editing, error, isDragged } = props

    return <div
        className={`setlist-row ${isCurrent ? 'current' : ''} ${isDragged ? 'dragged' : ''} ${editing ? 'editing' : ''}`}
        onMouseDown={props.onMouseDown}
        onClick={props.onSelect}
        onDoubleClick={props.onStartRename}
        onContextMenu={props.onContextMenu}>

        { editing == 'program'
            ? <InlineInput
                className='program'
                type='number'
                initialValue={String(track.id)}
                onCommit={props.onCommitProgram}
                onCancel={props.onCancelEditing}/>
            : <span className='program' title={`Selected by MIDI program ${track.id}`}>{track.id}</span> }

        { editing == 'name'
            ? <InlineInput
                className='name'
                initialValue={track.name}
                onCommit={props.onCommitName}
                onCancel={props.onCancelEditing}/>
            : <span className='name' title={track.name}>{track.name}</span> }

        <span className='meta'>
            { track.audio_filename && <svg className='audio' viewBox='0 0 24 24' aria-label='Has audio'>
                <path d='M9 3v12.3A4 4 0 1 0 11 19V8h8V3z'/>
            </svg> }
            { editing == 'bpm'
                ? <InlineInput
                    className='bpm'
                    type='number'
                    initialValue={String(track.bpm)}
                    onCommit={props.onCommitBpm}
                    onCancel={props.onCancelEditing}/>
                : <span
                    className='bpm'
                    title='BPM (double-click to change)'
                    onDoubleClick={(e) => { e.stopPropagation(); props.onStartBpm() }}>{track.bpm}</span> }
        </span>

        { error && <div className='setlist-row-error'>{error}</div> }
    </div>
}

export default TrackSetlistRow
