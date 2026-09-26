import { getTrackAudio } from '../../ApiClient'
import { computeWave } from './utils_audio'
import { PPQ } from './utils'

// Waveforms take ~100-250 ms to compute: they are computed once per audio file and BPM,
// in the background for every track of the show, so switching tracks doesn't wait for them.
// The audio URL changes when its file does, so a new file gets a new waveform.
const waves = new Map<string, Promise<Uint8Array>>()

export const getWave = (audioUrl: string, bpm: number) => {
    const key = `${bpm}|${audioUrl}`
    let wave = waves.get(key)
    if(!wave) {
        wave = computeWave(audioUrl, bpm, PPQ)
        // Don't keep failures: try again next time
        wave.catch(() => waves.delete(key))
        waves.set(key, wave)
    }
    return wave
}

// Computes the tracks' waveforms one after the other
export const precomputeWaves = async(tracks: Track[], isCancelled: () => boolean) => {
    for(const track of tracks) {
        if(isCancelled()) return
        if(!track.audio_filename) continue

        const audioUrl = await getTrackAudio(track.id)
        if(typeof audioUrl != 'string') continue
        await getWave(audioUrl, track.bpm).catch((e) => console.warn(`Could not compute the waveform of ${track.name}`, e))
    }
}
