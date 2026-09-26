import { getProgramAudio } from '../../ApiClient'
import { computeWave } from './utils_audio'
import { PPQ } from './utils'

// Waveforms take ~100-250 ms to compute: they are computed once per audio file and BPM,
// in the background for every program of the show, so switching programs doesn't wait for them.
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

// Computes the programs' waveforms one after the other
export const precomputeWaves = async(programs: Program[], isCancelled: () => boolean) => {
    for(const program of programs) {
        if(isCancelled()) return
        if(!program.audio_filename) continue

        const audioUrl = await getProgramAudio(program.id)
        if(typeof audioUrl != 'string') continue
        await getWave(audioUrl, program.bpm).catch((e) => console.warn(`Could not compute the waveform of ${program.name}`, e))
    }
}
