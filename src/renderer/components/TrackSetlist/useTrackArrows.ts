import { useEffect, useRef } from 'react'
import { useDmxButtonsContext } from '../../contexts/DmxButtonsContext'
import { selectTrack } from '../../ApiClient'
import { useMenuMessage } from '../../useEditMenu'

// Up and down arrows switch to the previous and next track in the setlist's order, unless typing,
// whether the setlist shows or not. Also Playback > Previous Track and Next Track
export const useTrackArrows = () => {
    const { tracks, currentTrackId } = useDmxButtonsContext()
    const tracksRef = useRef(tracks)
    tracksRef.current = tracks
    const currentTrackIdRef = useRef(currentTrackId)
    currentTrackIdRef.current = currentTrackId

    const isTyping = () => ['input', 'textarea', 'select'].includes(document.activeElement?.localName ?? '')

    const step = (delta: 1 | -1) => {
        const tracks = tracksRef.current
        if (tracks.length == 0) return
        const index = tracks.findIndex(p => p.id == currentTrackIdRef.current)
        const next = tracks[Math.max(0, Math.min(index + delta, tracks.length - 1))]!
        if (next.id != currentTrackIdRef.current) selectTrack(next.id)
    }

    useMenuMessage('tracks:previous', () => { if (!isTyping()) step(-1) })
    useMenuMessage('tracks:next', () => { if (!isTyping()) step(1) })

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key != 'ArrowDown' && e.key != 'ArrowUp') return
            if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || isTyping()) return
            // Taken here, so that macOS doesn't pass it on to the menu, which would do it again
            e.preventDefault()
            step(e.key == 'ArrowDown' ? 1 : -1)
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [])
}
