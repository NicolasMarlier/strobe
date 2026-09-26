import { deleteTrack, selectTrack, updateTrack } from '../../ApiClient'
import { useDmxButtonsContext } from '../../contexts/DmxButtonsContext'
import './TrackSelectOption.scss'
import { useEffect, useState } from "react"

interface Props {
    track: Track
    isEditing: boolean
    setEditingTrackId: (id: number | undefined) => void
}
const TrackSelectOption = (props: Props) => {
    const { syncTracks } = useDmxButtonsContext()
    const { track, isEditing, setEditingTrackId } = props

    const [name, setName] = useState(track.name)
    const [id, setId] = useState(track.id)
    const [bpm, setBpm] = useState(track.bpm)

    useEffect(() => {
        setName(track.name)
        setId(track.id)
        setBpm(track.bpm)
    }, [track])

    

    const updateTrackAndSync = (id: number, params: TrackUpdateParams) => (
        updateTrack(id, params).then(syncTracks)
    )
    

    const deleteTrackAndSync = (id: number) => deleteTrack(id).then(syncTracks)

    const onSave = () => {
        setEditingTrackId(undefined)
        updateTrackAndSync(track.id, {id, name, bpm})
    }

    return <div
        className={`picker-option ${isEditing ? 'editing' : ''}`}>
            <input
                className='id'
                disabled={!isEditing}
                type="number"
                value={id}
                onChange={(e) => setId(parseInt(e.target.value, 10))}
                />
            <div className="separator"/>
            <input className='name'
                disabled={!isEditing}
                value={name}
                onChange={(e) => setName(e.target.value)}/>
            <div className="separator"/>
            <input
                className='bpm'
                disabled={!isEditing}
                type="number"
                placeholder="BPM"
                value={bpm ?? ''}
                onChange={(e) => setBpm(e.target.value ? parseInt(e.target.value, 10) : 60)}/>
            <div className="navigate-button" onClick={() => selectTrack(track.id)}/>
            <div className="edit-btn btn" onClick={() => setEditingTrackId(track.id)}>Edit</div>
            <div className="delete-btn btn" onClick={() => deleteTrackAndSync(track.id)}>Delete</div>
            <div className="save-btn btn" onClick={() => onSave()}>Save</div>
            <div className="blur-on-top"/>
    </div>
}
export default TrackSelectOption