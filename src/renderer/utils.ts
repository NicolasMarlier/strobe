export const MUSIC_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', "A", 'A#', 'B']

export const humanizeMidiKey = (midiKey: MidiKey) => {
    const musicKey = MUSIC_KEYS[midiKey % MUSIC_KEYS.length]
    const midiLevel = Math.floor(midiKey / MUSIC_KEYS.length) - 2

    return [musicKey, midiLevel].join('')
}