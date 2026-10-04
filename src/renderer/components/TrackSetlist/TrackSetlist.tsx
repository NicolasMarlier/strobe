import './TrackSetlist.scss'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDmxButtonsContext } from '../../contexts/DmxButtonsContext'
import { createTrack, deleteTrack, duplicateTrack, reorderTracks, selectTrack, updateTrack } from '../../ApiClient'
import ConfirmModal from '../DesignSystem/ConfirmModal/ConfirmModal'
import TrackSetlistRow, { type RowEditing } from './TrackSetlistRow'
import { ChevronIcon } from './TrackSetlistCompact'

// How far the pointer moves before a press on a row becomes a drag
const DRAG_THRESHOLD_PX = 4

// MIDI programs go from 1 to 128 (Program Change values 0 to 127)
const MAX_PROGRAM = 128

const MIN_BPM = 20
const MAX_BPM = 400

// How long an error stays under its row
const ERROR_MS = 3000

interface ContextMenuState {
    trackId: number
    x: number
    y: number
}

interface ContextMenuProps extends ContextMenuState {
    trackName: string
    onClose: () => void
    onRename: () => void
    onChangeProgram: () => void
    onChangeBpm: () => void
    onDuplicate: () => void
    onDelete: () => void
}

// The right-click menu of a row. Closes on Escape or a click anywhere else
const ContextMenu = ({ x, y, trackName, onClose, onRename, onChangeProgram, onChangeBpm, onDuplicate, onDelete }: ContextMenuProps) => {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key == 'Escape') onClose()
            e.stopPropagation()
        }
        window.addEventListener('keydown', onKeyDown, true)
        window.addEventListener('mousedown', onClose)
        window.addEventListener('blur', onClose)
        return () => {
            window.removeEventListener('keydown', onKeyDown, true)
            window.removeEventListener('mousedown', onClose)
            window.removeEventListener('blur', onClose)
        }
    }, [onClose])

    const item = (label: string, action: () => void, className = '') => <div
        className={`setlist-menu-item ${className}`}
        onClick={() => { onClose(); action() }}>{label}</div>

    // Out of the section, which clips its content
    return createPortal(
        <div className='setlist-menu' style={{ left: x, top: y }} onMouseDown={(e) => e.stopPropagation()}>
            { item('Rename', onRename) }
            { item('Change MIDI program…', onChangeProgram) }
            { item('Change BPM…', onChangeBpm) }
            { item('Duplicate', onDuplicate) }
            <div className='setlist-menu-separator'/>
            { item(`Delete “${trackName}”…`, onDelete, 'danger') }
        </div>,
        document.body,
    )
}

// The show's tracks in MIDI program order, in a column on the left of the window.
// Collapsed (by its title or Cmd+\\), only the current track shows, next to the interfaces (TrackSetlistCompact).
// Click selects a track, double-click renames it, drag reorders (renumbering the programs 1, 2, 3…),
// right-click for the rest
interface Props {
    collapse: () => void
}

const TrackSetlist = ({ collapse }: Props) => {
    const { tracks, currentTrackId, syncTracks } = useDmxButtonsContext()

    const [editing, setEditing] = useState(undefined as { trackId: number, field: RowEditing } | undefined)
    const [menu, setMenu] = useState(undefined as ContextMenuState | undefined)
    const [deletingTrackId, setDeletingTrackId] = useState(undefined as number | undefined)
    const [error, setError] = useState(undefined as { trackId: number, message: string } | undefined)
    const [drag, setDrag] = useState(undefined as { trackId: number, dropIndex: number } | undefined)

    useEffect(() => {
        if (!error) return
        const timeout = setTimeout(() => setError(undefined), ERROR_MS)
        return () => clearTimeout(timeout)
    }, [error])

    // For the drag's handlers, registered when it starts
    const tracksRef = useRef(tracks)
    tracksRef.current = tracks

    const stopEditing = () => setEditing(undefined)

    const commitName = async (track: Track, name: string) => {
        stopEditing()
        const trimmed = name.trim()
        if (!trimmed || trimmed == track.name) return
        await updateTrack(track.id, { name: trimmed })
        syncTracks()
    }

    const commitProgram = async (track: Track, value: string) => {
        stopEditing()
        const program = Number(value)
        if (program == track.id) return
        if (!Number.isInteger(program) || program < 1 || program > MAX_PROGRAM) {
            setError({ trackId: track.id, message: `A MIDI program goes from 1 to ${MAX_PROGRAM}` })
            return
        }
        const other = tracks.find(p => p.id == program)
        if (other) {
            setError({ trackId: track.id, message: `Program ${program} is already “${other.name}”` })
            return
        }
        await updateTrack(track.id, { id: program })
        syncTracks()
    }

    const commitBpm = async (track: Track, value: string) => {
        stopEditing()
        const bpm = Number(value)
        if (bpm == track.bpm) return
        if (!value.trim() || !Number.isFinite(bpm) || bpm < MIN_BPM || bpm > MAX_BPM) {
            setError({ trackId: track.id, message: `A tempo goes from ${MIN_BPM} to ${MAX_BPM} BPM` })
            return
        }
        await updateTrack(track.id, { bpm })
        syncTracks()
    }

    const createAndRename = async () => {
        const track = await createTrack({ name: 'New track' })
        await syncTracks()
        selectTrack(track.id)
        setEditing({ trackId: track.id, field: 'name' })
    }

    const duplicate = async (trackId: number) => {
        const track = await duplicateTrack(trackId)
        await syncTracks()
        selectTrack(track.id)
    }

    const confirmDelete = async () => {
        const trackId = deletingTrackId
        setDeletingTrackId(undefined)
        if (trackId == undefined) return
        await deleteTrack(trackId)
        syncTracks()
    }

    // Dragging, with the mouse events: Electron's native drag and drop doesn't always drop.
    // The row follows the pointer once it moved a few pixels; before that, it's a click

    const rowsRef = useRef<HTMLDivElement>(null)
    // The click that ends a drag doesn't select the dragged track
    const justDragged = useRef(false)

    // Dropped before the first row whose middle is below the pointer
    const dropIndexAt = (clientY: number) => {
        const rows = [...(rowsRef.current?.querySelectorAll('.setlist-row') ?? [])]
        const index = rows.findIndex(row => {
            const rect = row.getBoundingClientRect()
            return clientY < rect.top + rect.height / 2
        })
        return index == -1 ? rows.length : index
    }

    const onRowMouseDown = (e: React.MouseEvent, trackId: number) => {
        if (e.button != 0 || editing) return
        const startY = e.clientY
        let dropIndex: number | undefined

        const onMove = (e: MouseEvent) => {
            if (dropIndex == undefined && Math.abs(e.clientY - startY) < DRAG_THRESHOLD_PX) return
            dropIndex = dropIndexAt(e.clientY)
            setDrag({ trackId, dropIndex })
        }
        const stop = () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
            window.removeEventListener('keydown', onKeyDown, true)
            setDrag(undefined)
        }
        const onUp = () => {
            stop()
            if (dropIndex == undefined) return
            justDragged.current = true
            setTimeout(() => { justDragged.current = false })
            moveTrack(trackId, dropIndex)
        }
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key != 'Escape') return
            e.stopPropagation()
            stop()
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        window.addEventListener('keydown', onKeyDown, true)
    }

    const moveTrack = async (trackId: number, dropIndex: number) => {
        const tracks = tracksRef.current
        const from = tracks.findIndex(p => p.id == trackId)
        if (from == -1 || dropIndex == from || dropIndex == from + 1) return

        const ids = tracks.map(p => p.id).filter(id => id != trackId)
        ids.splice(dropIndex > from ? dropIndex - 1 : dropIndex, 0, trackId)
        const result = await reorderTracks(ids) as Track[] | { error: string }
        if ('error' in result) setError({ trackId, message: result.error })
        syncTracks()
    }

    const draggedIndex = drag ? tracks.findIndex(p => p.id == drag.trackId) : -1
    // Dropping a row right above or below itself changes nothing: no line there
    const dropIndex = drag && drag.dropIndex != draggedIndex && drag.dropIndex != draggedIndex + 1
        ? drag.dropIndex
        : undefined

    const menuTrack = menu && tracks.find(p => p.id == menu.trackId)
    const deletingTrack = tracks.find(p => p.id == deletingTrackId)

    return <div className='section setlist'>
        <div className='section-title setlist-title' onClick={collapse} title='Collapse (⌘\\)'>
            Setlist
            <ChevronIcon/>
        </div>
        {/* Also in the Playback menu */}
        <div className='section-hint'><span><kbd>↑</kbd> <kbd>↓</kbd> switch</span></div>
        <div className='section-body'>
            <div className={`setlist-rows ${drag ? 'dragging' : ''}`} ref={rowsRef}>
                { tracks.map((track, index) => <div key={track.id} className='setlist-slot'>
                    { dropIndex == index && <div className='setlist-drop-line'/> }
                    <TrackSetlistRow
                        track={track}
                        isCurrent={track.id == currentTrackId}
                        editing={editing?.trackId == track.id ? editing.field : undefined}
                        error={error?.trackId == track.id ? error.message : undefined}
                        isDragged={drag?.trackId == track.id}
                        onSelect={() => !justDragged.current && track.id != currentTrackId && selectTrack(track.id)}
                        onStartRename={() => setEditing({ trackId: track.id, field: 'name' })}
                        onCommitName={(name) => commitName(track, name)}
                        onCommitProgram={(program) => commitProgram(track, program)}
                        onStartBpm={() => setEditing({ trackId: track.id, field: 'bpm' })}
                        onCommitBpm={(bpm) => commitBpm(track, bpm)}
                        onCancelEditing={stopEditing}
                        onContextMenu={(e) => {
                            e.preventDefault()
                            setMenu({ trackId: track.id, x: e.clientX, y: e.clientY })
                        }}
                        onMouseDown={(e) => onRowMouseDown(e, track.id)}/>
                </div>) }
                { dropIndex == tracks.length && <div className='setlist-drop-line'/> }

                { tracks.length == 0 && <div className='setlist-empty'>No tracks yet</div> }
            </div>

            <div className='setlist-new' onClick={createAndRename}>+ New track</div>
        </div>

        { menu && menuTrack && <ContextMenu
            {...menu}
            trackName={menuTrack.name}
            onClose={() => setMenu(undefined)}
            onRename={() => setEditing({ trackId: menuTrack.id, field: 'name' })}
            onChangeProgram={() => setEditing({ trackId: menuTrack.id, field: 'program' })}
            onChangeBpm={() => setEditing({ trackId: menuTrack.id, field: 'bpm' })}
            onDuplicate={() => duplicate(menuTrack.id)}
            onDelete={() => setDeletingTrackId(menuTrack.id)}/> }

        { deletingTrack && <ConfirmModal
            title={`Delete “${deletingTrack.name}”?`}
            message='Its buttons and its automation go with it.'
            confirmLabel='Delete'
            onConfirm={confirmDelete}
            onCancel={() => setDeletingTrackId(undefined)}/> }
    </div>
}

export default TrackSetlist
