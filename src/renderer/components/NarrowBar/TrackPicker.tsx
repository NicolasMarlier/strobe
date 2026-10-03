import './NarrowBar.scss'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDmxButtonsContext } from '../../contexts/DmxButtonsContext'
import { selectTrack } from '../../ApiClient'
import { ChevronIcon } from '../TrackSetlist/TrackSetlistCompact'

// In a narrow window, the setlist has no room for its column: the current track shows in the top bar,
// and a click on it drops the setlist down to switch tracks
const TrackPicker = () => {
    const { tracks, track, currentTrackId } = useDmxButtonsContext()
    const [menuPosition, setMenuPosition] = useState(undefined as { left: number, top: number } | undefined)
    const buttonRef = useRef<HTMLDivElement>(null)

    const close = () => setMenuPosition(undefined)

    const toggle = () => {
        if (menuPosition || !buttonRef.current) return close()
        const rect = buttonRef.current.getBoundingClientRect()
        setMenuPosition({ left: rect.left, top: rect.bottom + 6 })
    }

    // Closes on Escape, a click anywhere else, or the window losing focus
    useEffect(() => {
        if (!menuPosition) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key != 'Escape') return
            e.stopPropagation()
            close()
        }
        window.addEventListener('keydown', onKeyDown, true)
        window.addEventListener('mousedown', close)
        window.addEventListener('blur', close)
        window.addEventListener('resize', close)
        return () => {
            window.removeEventListener('keydown', onKeyDown, true)
            window.removeEventListener('mousedown', close)
            window.removeEventListener('blur', close)
            window.removeEventListener('resize', close)
        }
    }, [menuPosition])

    return <>
        <div
            ref={buttonRef}
            className={`track-picker narrow-only ${menuPosition ? 'open' : ''}`}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={toggle}
            title='Switch tracks'>
            { track
                ? <>
                    <span className='track-picker-program'>P{track.id}</span>
                    <span className='track-picker-name'>{track.name}</span>
                    <span className='track-picker-bpm'>{track.bpm} BPM</span>
                </>
                : <span className='track-picker-program'>No track</span> }
            <ChevronIcon/>
        </div>

        {/* Out of the top bar, which clips its content */}
        { menuPosition && createPortal(
            <div className='setlist-menu track-picker-menu' style={menuPosition} onMouseDown={(e) => e.stopPropagation()}>
                { tracks.map(t => <div
                    key={t.id}
                    className={`setlist-menu-item ${t.id == currentTrackId ? 'current' : ''}`}
                    onClick={() => {
                        close()
                        if (t.id != currentTrackId) selectTrack(t.id)
                    }}>
                    <span className='track-picker-program'>P{t.id}</span>
                    <span className='track-picker-name'>{t.name}</span>
                    <span className='track-picker-bpm'>{t.bpm}</span>
                </div>) }
                { tracks.length == 0 && <div className='track-picker-empty'>No tracks yet</div> }
            </div>,
            document.body,
        ) }
    </>
}

export default TrackPicker
