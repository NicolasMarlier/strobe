// Several rounds of the website's screenshots, through the Chrome DevTools protocol
// (Strobe launched with --remote-debugging-port=9222): node capture.mjs <outDir> <rounds> <secondsBetween>.
// Each round: the whole window (overview), the scene and the buttons sections (cropped from a wide window)
// and the narrow window, all at 2x
import { mkdirSync, writeFileSync } from 'node:fs'

const [outDir, rounds, pause] = [process.argv[2], Number(process.argv[3] ?? 4), Number(process.argv[4] ?? 3)]
mkdirSync(outDir, { recursive: true })

const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json()
const page = targets.find(t => t.type == 'page' && t.title == 'STROBE')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(resolve => ws.addEventListener('open', resolve))

let nextId = 1
const pending = new Map()
ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id && pending.has(message.id)) {
        pending.get(message.id)(message)
        pending.delete(message.id)
    }
})
const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, m => m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result))
    ws.send(JSON.stringify({ id, method, params }))
})
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value
const wait = seconds => new Promise(resolve => setTimeout(resolve, seconds * 1000))

// The page laid out at width×height (CSS px), at 2x; the whole page, or the element matching `selector`
const capture = async (file, width, height, selector) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: false })
    await wait(1.2)
    let clip
    if (selector) {
        const rect = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return [r.x, r.y, r.width, r.height] })()`)
        // A bit around the section, so its title on the top border shows whole
        const margin = 14
        clip = { x: rect[0] - margin, y: rect[1] - margin, width: rect[2] + 2 * margin, height: rect[3] + 2 * margin, scale: 1 }
    }
    const shot = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) })
    writeFileSync(`${outDir}/${file}`, Buffer.from(shot.data, 'base64'))
    console.log(file)
}

for (let round = 1; round <= rounds; round++) {
    await capture(`overview-${round}.png`, 1440, 900)
    await capture(`scene-${round}.png`, 1680, 1050, '#app .section.scene')
    await capture(`cues-${round}.png`, 1680, 1050, '#app .section.buttons')
    await capture(`narrow-${round}.png`, 560, 900)
    if (round < rounds) await wait(pause)
}

await send('Emulation.clearDeviceMetricsOverride')
ws.close()
