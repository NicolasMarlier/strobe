// The wave only needs a few samples per tick (about 12 per tick at 85 BPM):
// decoding at a low sample rate is faster and gives far fewer samples to go through
const WAVE_SAMPLE_RATE = 8000

// Peak amplitude (0-255) of the audio for each tick
export const computeWave = async(audioUrl: string, bpm: number, ppq: number) => {
    const response = await fetch(audioUrl)
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await new OfflineAudioContext(1, 1, WAVE_SAMPLE_RATE).decodeAudioData(arrayBuffer)

    // 1 beat = ppq ticks, bpm beats = 60 seconds
    const samplesPerTick = 60 * audioBuffer.sampleRate / (ppq * bpm)

    const left = audioBuffer.getChannelData(0)
    const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left

    const wave = new Uint8Array(Math.round(left.length / samplesPerTick) + 1)
    for(let i = 0; i < left.length; i++) {
        const amplitude = Math.round(Math.abs((left[i] + right[i]) / 2) * 255)
        const tick = Math.round(i / samplesPerTick)
        if(amplitude > wave[tick]) wave[tick] = amplitude
    }
    return wave
}
