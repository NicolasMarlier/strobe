import { useEffect, useState } from 'react'
import { getWave } from './waves'
import { PPQ } from './utils'

// A track with neither a length set by hand nor audio: 64 bars
export const DEFAULT_LENGTH_TICKS = 64 * 4 * PPQ

// The audio's end, in ticks: none without audio, or until its waveform is computed
export const useAudioEndTick = (track: Track | undefined, audioUrl: string | undefined) => {
    const [audioEndTick, setAudioEndTick] = useState<number | null>(null)
    useEffect(() => {
        setAudioEndTick(null)
        if(!audioUrl || !track) return
        let cancelled = false
        getWave(audioUrl, track.bpm)
            .then(wave => { if(!cancelled) setAudioEndTick(wave.length - 1) })
            .catch(() => { /* No audio end: the default length */ })
        return () => { cancelled = true }
    }, [audioUrl, track?.bpm])
    return audioEndTick
}

// The track's end: its length set by hand, else its audio's, else the default one
export const trackEndTick = (track: Track | undefined, audioEndTick: number | null) =>
    track?.length_ticks ?? audioEndTick ?? DEFAULT_LENGTH_TICKS
