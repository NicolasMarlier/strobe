import './TrackSelect.scss'

import { useDmxButtonsContext } from '../../contexts/DmxButtonsContext'
import { useEffect, useRef, useState } from 'react'
import TrackSelectOption from './TrackSelectOption'
import { createTrack, selectTrack } from '../../ApiClient'

const KEY_DOWN_ARROW_DOWN = 'ArrowDown'
const KEY_DOWN_ARROW_UP = 'ArrowUp'
const TrackSelect = () => {
    const { track, tracks, syncTracks, currentTrackId } = useDmxButtonsContext()

    const lastTrackId = useRef(currentTrackId)
    const [showPicker, setShowPicker] = useState(false)

    const [editingTrackId, setEditingTrackId] = useState(undefined as number | undefined)

    const createTrackAndSync = async(name?: string) => {
        const newTrack = await createTrack({name: name || 'New track'})
        await syncTracks()
        selectTrack(newTrack.id)
    }
    const clickBackground = (e: any) => {
        if(e.target == e.currentTarget) {
            setShowPicker(false)
        }
    }

    const relativeTrackId = (index: number) => {
        return tracks[Math.max(
            0,
            Math.min(
                tracks.findIndex((p) => p.id == currentTrackId) + index,
                tracks.length - 1
            )
        )].id
    }
    

    const handleKeyDown = (e: any) => {
        if(tracks.length == 0) { return }
        
        if(e.code === KEY_DOWN_ARROW_DOWN) {
            selectTrack(relativeTrackId(1))
        }
        else if(e.code === KEY_DOWN_ARROW_UP) {
            selectTrack(relativeTrackId(-1))
        }
    }

    useEffect(() => {
        if(!showPicker) {
            setEditingTrackId(undefined)
        }
    }, [showPicker])

    useEffect(() => {
        if(lastTrackId.current != currentTrackId) {
            lastTrackId.current = currentTrackId
            setShowPicker(false)
        }
    }, [currentTrackId])

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [track, tracks, currentTrackId])
    return <>
            { track && <div
                className="btn"
                onClick={() => setShowPicker(true)}>{track.id} | {track.name}
            </div> }
            { !track && <div
                className="current-track  "
                onClick={() => setShowPicker(true)}>
                Pick a track
            </div>}

            { showPicker && <div className="picker-background" onClick={clickBackground}>
                <div className={`picker ${editingTrackId ? 'editing' : 'not-editing'}`}>
                { tracks.map((p) => <TrackSelectOption
                    key={p.id}
                    track={p}
                    isEditing={editingTrackId == p.id}
                    setEditingTrackId={setEditingTrackId}/>)}        
                <div className='picker-option new-track' onClick={() => createTrackAndSync()}>New track</div>
                
                </div>
                <div className='picker-bottom-shadow'/>
            </div>}
    </>
}

export default TrackSelect