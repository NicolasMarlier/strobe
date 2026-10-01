export const colorHexToArray: (colorHex: string) => [number, number, number] = (colorHex: string) => {
    return [
        Number(`0x${colorHex.slice(1, 3)}`) || 0,
        Number(`0x${colorHex.slice(3, 5)}`) || 0,
        Number(`0x${colorHex.slice(5, 7)}`) || 0
    ]
}

export const getDmxSignalAt = (dmxHexSignal: DmxHexSignal, channel: number) => (
    parseInt(dmxHexSignal.slice(2*channel, 2*channel + 2), 16) || 0
)

export const setDmxAt = (dmxHexSignal: string, channel: number, value: number) => {
    const hexValue = value.toString(16).padStart(2, '0')
    return dmxHexSignal.slice(0, channel*2) + hexValue + dmxHexSignal.slice(channel*2 + 2)
}