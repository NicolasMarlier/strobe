const sampleSignal = (signal: Float32Array, blockSize=10) => {
    const samples = Math.ceil(signal.length / blockSize)
    const dataArray = new Uint8Array(samples)

    signal.forEach((dataPoint, i) => {
        dataArray[Math.round(i/blockSize)] = Math.max(
            dataArray[Math.round(i/blockSize)],
            Math.round(Math.abs(dataPoint) * 255)
        )
    })
    return dataArray
}

export const computeWave = async(audioUrl: string, bpm: number, ppq: number) => {
    const audioCtx = new window.AudioContext()
    const response = await fetch(audioUrl)
    const arrayBuffer = await response.arrayBuffer()                                                                                                                                                       
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)                                                                                                                                        
    // audioBuffer.sampleRate is 44_100 or 48_000 (Hz), ie signal per second

    // 1 second = SAMPLE_RATE datapoints
    // BPM beats = 60 seconds
    // 1 beat = PPQ ticks
    // 1 tick = 60  * SAMPLE_RATE / (PPQ * BPM) datapoints

    const dataPointsPerTick = 60 * audioBuffer.sampleRate / (ppq * bpm)

    
    const channelDataLeft = audioBuffer.getChannelData(0)
    const channelDataRight = audioBuffer.getChannelData(1)
    const channelData = channelDataLeft.map((e, i) => (e + channelDataRight[i])/2);

    return sampleSignal(channelData, dataPointsPerTick)
}