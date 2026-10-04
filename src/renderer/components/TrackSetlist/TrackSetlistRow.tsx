import { useEffect, useRef, useState } from 'react'

export type RowEditing = 'name' | 'program' | 'bpm' | undefined

interface InlineInputProps {
    className: string
    initialValue: string
    type?: string
    onCommit: (value: string) => void
    onCancel: () => void
}

// Selected when it opens. Enter or leaving it saves, Escape cancels
const InlineInput = ({ className, initialValue, type = 'text', onCommit, onCancel }: InlineInputProps) => {
    const [value, setValue] = useState(initialValue)
    const ref = useRef<HTMLInputElement>(null)
    // Escape also blurs the field: that blur must not save
    const done = useRef(false)

    useEffect(() => ref.current?.select(), [])

    const commit = () => {
        if (done.current) return
        done.current = true
        onCommit(value)
    }

    return <input
        ref={ref}
        className={className}
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
            // Keeps the app's shortcuts (Space to play, arrows to switch tracks…) out of the typing
            e.stopPropagation()
            if (e.key == 'Enter') commit()
            if (e.key == 'Escape') { done.current = true; onCancel() }
        }}
        onBlur={commit}/>
}

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
            { track.audio_filename && <span
                className={`audio ${track.audio_missing ? 'missing' : ''}`}
                title={track.audio_missing ? `Audio file not found: ${track.audio_filename}` : track.audio_filename}>
                <svg viewBox='0 0 24 24' aria-label={track.audio_missing ? 'Audio file not found' : 'Has audio'}>
                    <path d='M9 3v12.3A4 4 0 1 0 11 19V8h8V3z'/>
                </svg>
            </span> }
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
