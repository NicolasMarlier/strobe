export const dmxHexToArrayBuffer = (str: string) => {
  const uint8array = new Uint8Array(Math.ceil(str.length / 2));
  for (let i = 0; i < str.length; i += 2)
    uint8array[i / 2] = parseInt(str.slice(i, i + 2), 16);
  return uint8array.buffer;
}

export const emptyDmxHexString = () => Array.from({ length: 513 }, (_) => '00').join('')
