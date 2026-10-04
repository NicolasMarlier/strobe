import type { ContextMenuItem } from './components/DesignSystem/ContextMenu/ContextMenu'

// A track's audio in a right-click menu: in the setlist's, and the waveform's
export const audioMenuItems = (
    track: Track,
    choose: (trackId: number) => void,
    remove: (trackId: number) => void,
): ContextMenuItem[] => track.audio_filename
    ? [
        { label: 'Replace Audio File…', action: () => choose(track.id) },
        { label: 'Remove Audio', action: () => remove(track.id) },
    ]
    : [{ label: 'Choose Audio File…', action: () => choose(track.id) }]
