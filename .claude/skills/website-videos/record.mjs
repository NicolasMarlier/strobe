// The website's videos of Strobe, recorded with nobody at the keyboard:
// node record.mjs <Strobe.app> <outDir> [seconds] [only]
//
// It runs its own Strobe (the given app, its own profile: no usage statistics nor crash reports, the user's
// recent shows and settings untouched, the sound muted), next to the user's if one is open, and plays the
// example show (assets/Example.strobe, a copy). First a scouting pass over the whole track picks its liveliest
// `seconds` (10 by default) in the scene without flashing faster than the website allows; then each video is
// recorded from there, the page laid out at its size by emulation and filmed through the Chrome DevTools
// protocol's screencast, at 2x. Out: <name>.mp4 (H.264, 60 fps), <name>.webp (its first frame, the poster),
// <name>-sheet.png (4 of its frames, to look at) for overview, scene, cues and narrow, and report.json.
// The cues video is another story, with the track stopped: a button edited, a drawn mouse pointer clicking it
// and changing its color, the scene showing each try (see editButton).
// `only`: a comma-separated list of the videos to record, all of them by default.
import { spawn, execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [app, outArg, secondsArg, onlyArg] = process.argv.slice(2)
if (!app || !outArg) {
    console.error('node record.mjs <Strobe.app> <outDir> [seconds] [only]')
    process.exit(1)
}
const out = resolve(outArg)
const seconds = Number(secondsArg ?? 10)
const PORT = 9223
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

// Each video: the page laid out at width×height (CSS px), the elements matching `selectors` (the box around
// them all) or the whole page, scaled to `scale` of its 2x size. Filmed during the passage picked by scouting,
// or acting out `story`
const SHOTS = [
    { name: 'overview', width: 1440, height: 900, scale: 2048 / 2880 },
    { name: 'scene', width: 1680, height: 1050, selectors: ['#app .section.scene'], scale: 1 },
    { name: 'cues', width: 1680, height: 860, selectors: ['#app .section.buttons', '#app .section.scene'], scale: 1, story: 'editButton' },
    { name: 'narrow', width: 560, height: 900, scale: 1 },
].filter(shot => !onlyArg || onlyArg.split(',').includes(shot.name))
// The website's rule (see script.js in strobe-website): no flashing faster than about twice a second, i.e. at
// most 4 swings of the scene's brightness in any second. A swing: a change of FLASH_SWING (out of 255) or more
const FLASH_SWING = 8
const MAX_SWINGS_PER_SECOND = 4

const wait = s => new Promise(r => setTimeout(r, s * 1000))
const log = (...args) => console.log(new Date().toISOString().slice(11, 19), ...args)

// Its own Strobe
const work = join(out, 'work')
rmSync(work, { recursive: true, force: true })
mkdirSync(join(work, 'profile'), { recursive: true })
writeFileSync(join(work, 'profile', 'telemetry.json'), JSON.stringify({ installId: 'website-videos', enabled: false }))
cpSync(join(repo, 'assets', 'Example.strobe'), join(work, 'Example.strobe'), { recursive: true })

if (await fetch(`http://127.0.0.1:${PORT}/json/version`).then(() => true, () => false)) {
    console.error(`Port ${PORT} is taken: another recording running?`)
    process.exit(1)
}
const strobe = spawn(join(app, 'Contents', 'MacOS', 'Strobe'), [
    `--user-data-dir=${join(work, 'profile')}`, `--remote-debugging-port=${PORT}`, '--mute-audio',
    // Keeps rendering while other windows cover it
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling',
], { stdio: 'ignore' })
const quit = () => { try { strobe.kill() } catch {} }
process.on('exit', quit)
process.on('SIGINT', () => process.exit(130))

// The Chrome DevTools protocol, on its window
const connect = async () => {
    for (let i = 0; i < 60; i++) {
        const targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then(r => r.json(), () => [])
        const page = targets.find(t => t.type == 'page' && t.title.startsWith('STROBE'))
        if (page) {
            const ws = new WebSocket(page.webSocketDebuggerUrl)
            await new Promise((ok, ko) => { ws.addEventListener('open', ok); ws.addEventListener('error', ko) })
            return ws
        }
        await wait(0.5)
    }
    throw new Error('Strobe\'s window never showed')
}
const ws = await connect()
let nextId = 1
const pending = new Map()
let onFrame = null
ws.addEventListener('message', ({ data }) => {
    const m = JSON.parse(data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
    else if (m.method == 'Page.screencastFrame') {
        send('Page.screencastFrameAck', { sessionId: m.params.sessionId })
        onFrame?.(m.params)
    }
})
ws.addEventListener('close', () => { if (!done) { console.error('Strobe closed during the recording'); process.exit(1) } })
let done = false
const send = (method, params = {}) => new Promise((ok, ko) => {
    const id = nextId++
    pending.set(id, m => m.error ? ko(new Error(`${method}: ${m.error.message}`)) : ok(m.result))
    ws.send(JSON.stringify({ id, method, params }))
})
const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(`${expression}: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`)
    return r.result.value
}
const key = async (key, code, keyCode) => {
    for (const type of ['keyDown', 'keyUp']) {
        await send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: keyCode, text: type == 'keyDown' && key.length == 1 ? key : undefined })
    }
}
const click = async (x, y) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
    await wait(0.2)
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 })
}
// A mouse pointer drawn in the page, since the screencast doesn't show macOS's: it glides to a point, and
// clicks with a ring. Only in this recording's Strobe
const POINTER = `(() => {
    if (document.getElementById('recording-pointer')) return
    const pointer = document.createElement('div')
    pointer.id = 'recording-pointer'
    pointer.innerHTML = '<svg width="18" height="26" viewBox="0 0 18 26"><path d="M1.5 1.5v19.5l5-4.6 3.4 7.6 3.3-1.5-3.3-7.4h6.6z" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/></svg>'
    Object.assign(pointer.style, { position: 'fixed', left: '0px', top: '0px', zIndex: 2147483647, pointerEvents: 'none',
        filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5))' })
    document.body.appendChild(pointer)
    const style = document.createElement('style')
    style.textContent = '.recording-click { position: fixed; width: 28px; height: 28px; margin: -14px 0 0 -14px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.85); pointer-events: none; z-index: 2147483646; animation: recording-click 0.45s ease-out forwards } @keyframes recording-click { from { transform: scale(0.3); opacity: 1 } to { transform: scale(1.2); opacity: 0 } }'
    document.head.appendChild(style)
})()`
const pointerTo = async (x, y, glide = true) => {
    const transition = glide ? 'left 0.7s cubic-bezier(0.45, 0, 0.25, 1), top 0.7s cubic-bezier(0.45, 0, 0.25, 1)' : 'none'
    await evaluate(`(() => { const p = document.getElementById('recording-pointer'); p.style.transition = '${transition}'; p.style.left = '${x}px'; p.style.top = '${y}px' })()`)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
    if (glide) await wait(0.8)
}
// The ring; `real`: a click the app gets too
const pointerClick = async (x, y, real = true) => {
    await evaluate(`(() => { const ring = document.createElement('div'); ring.className = 'recording-click'; ring.style.left = '${x}px'; ring.style.top = '${y}px'; document.body.appendChild(ring); setTimeout(() => ring.remove(), 600) })()`)
    if (real) for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 })
}
const centerOf = async selector => (([x, y, w, h]) => [x + w / 2, y + h / 2])(await rectOf(selector))

// The cues video: a button clicked (its settings open, it plays), then its color changed twice, played each time,
// and the settings closed, as at the start, for the loop. The color input opens macOS's color panel, a window the
// screencast doesn't see: the pointer clicks it without the app getting the click, and the color is set as the
// panel would
const editButton = async () => {
    const button = await evaluate(`(() => { const b = [...document.querySelectorAll('.dmx-button')].find(b => b.querySelector('.triggering-midi-key')?.textContent.trim() == 'D#1'); b.id = 'recording-button'; return !!b })()`)
    if (!button) throw new Error('The example show has no D#1 button')
    const [bx, by] = await centerOf('#recording-button')
    await wait(0.6)
    await pointerTo(bx, by)
    await pointerClick(bx, by)
    await wait(2.4)
    for (const color of ['#ff2bd6', '#ffb000']) {
        const [cx, cy] = await centerOf('.dmx-button-details label.color')
        await pointerTo(cx, cy)
        await pointerClick(cx, cy, false)
        await wait(0.3)
        await evaluate(`(() => { const input = document.querySelector('.dmx-button-details input[type=color]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '${color}'); input.dispatchEvent(new Event('input', { bubbles: true })) })()`)
        await wait(0.5)
        await pointerTo(bx, by)
        await pointerClick(bx, by)
        await wait(2.4)
    }
    // An empty spot of the buttons' section, nearest its middle: the settings close
    const [ex, ey] = await evaluate(`(() => {
        const body = document.querySelector('#app .section.buttons .section-body')
        const r = body.getBoundingClientRect()
        const spots = []
        for (let y = r.top + 10; y < r.bottom - 10; y += 10) for (let x = r.left + 10; x < r.right - 10; x += 10) {
            const hit = document.elementFromPoint(x, y)
            if (body.contains(hit) && !hit.closest('.btn, .details-panel, input, select, label')) spots.push([x, y])
        }
        const [cx, cy] = [r.left + r.width * 0.4, r.top + r.height * 0.6]
        return spots.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy))[0]
    })()`)
    await pointerTo(ex, ey)
    await pointerClick(ex, ey)
    await wait(1)
}
const STORIES = { editButton }

const layout = async (width, height) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: false })
    await wait(1.5)
}
const rectOf = selector => evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return [r.x, r.y, r.width, r.height] })()`)
const isPlaying = () => evaluate(`!document.querySelector('audio').paused`)
// From the start of the track, playing
const playFromStart = async () => {
    if (await isPlaying()) await key(' ', 'Space', 32)
    await key('Enter', 'Enter', 13)
    await wait(0.5)
    await key(' ', 'Space', 32)
    for (let i = 0; i < 20 && !await isPlaying(); i++) await wait(0.1)
    if (!await isPlaying()) throw new Error('The playback did not start')
    return Date.now() / 1000
}
const pause = async () => { if (await isPlaying()) await key(' ', 'Space', 32) }

// Frames as JPEGs with their times, from `from` (epoch seconds) for `duration` seconds, or until the time
// `duration()` returns, once it returns one
const film = async (dir, from, duration) => {
    const end = () => typeof duration == 'function' ? duration() : from + duration
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(dir, { recursive: true })
    const frames = []
    while (Date.now() / 1000 < from - 0.4) await wait(0.05)
    onFrame = ({ data, metadata }) => {
        const file = join(dir, `${String(frames.length).padStart(5, '0')}.jpg`)
        writeFileSync(file, Buffer.from(data, 'base64'))
        frames.push({ file, time: metadata.timestamp })
    }
    await send('Page.startScreencast', { format: 'jpeg', quality: 92 })
    while (end() == null || Date.now() / 1000 < end() + 0.2) await wait(0.05)
    await send('Page.stopScreencast')
    onFrame = null
    // The ones in [from, from + duration]; the last before `from` too, shown until the next one
    const firstIn = frames.findIndex(f => f.time >= from)
    const kept = frames.slice(Math.max(0, firstIn - 1)).filter(f => f.time <= end())
    if (kept.length < (end() - from) * 10) throw new Error(`Only ${kept.length} frames for ${(end() - from).toFixed(1)} s`)
    return kept.map((f, i) => ({ ...f, time: i == 0 ? from : f.time }))
}

// H.264 at FPS, on a regular grid: each of its frames is the captured one nearest to its time. The screencast
// sends frames when it can, irregularly (8 to 30 ms apart, the screen running at 120 Hz): taking the last one
// before each time instead makes the motion judder
const FPS = 60
const encode = (frames, from, duration, crop, scale, file) => {
    let j = 0
    const picked = Array.from({ length: Math.round(duration * FPS) }, (_, k) => {
        const t = from + k / FPS
        while (j + 1 < frames.length && Math.abs(frames[j + 1].time - t) <= Math.abs(frames[j].time - t)) j++
        return frames[j]
    })
    const list = picked.map(f => `file '${f.file}'\nduration ${(1 / FPS).toFixed(6)}`).join('\n') + `\nfile '${picked.at(-1).file}'\n`
    const listFile = join(dirname(frames[0].file), 'list.txt')
    writeFileSync(listFile, list)
    const even = n => Math.floor(n / 2) * 2
    const [x, y, w, h] = crop.map(v => Math.max(0, Math.round(v * 2)))
    const filters = [`crop=${even(w)}:${even(h)}:${x}:${y}`]
    if (scale != 1) filters.push(`scale=${even(w * scale)}:${even(h * scale)}:flags=lanczos`)
    filters.push(`fps=${FPS}`)
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile,
        '-vf', filters.join(','), '-t', String(duration),
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', file])
    // How smooth: the share of its frames within 5 ms of their time
    return picked.filter((f, k) => Math.abs(f.time - (from + k / FPS)) <= 0.005).length / picked.length
}

// The mean brightness (0–255) of each frame of a video, at 30 fps, within `crop` (in the video's pixels) if given
const brightness = (file, crop) => {
    const filters = [crop && `crop=${crop.join(':')}`, 'fps=30', 'scale=160:-2', 'signalstats', 'metadata=print:key=lavfi.signalstats.YAVG:file=-'].filter(Boolean)
    return execFileSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-vf', filters.join(','), '-f', 'null', '-'], { maxBuffer: 1 << 26 })
        .toString().split('\n').filter(l => l.includes('YAVG')).map(l => Number(l.split('=')[1]))
}
// Swings: changes of FLASH_SWING or more between two frames, as frame indices
const swings = values => values.flatMap((v, i) => i > 0 && Math.abs(v - values[i - 1]) >= FLASH_SWING ? [i] : [])
const maxSwingsPerSecond = values => {
    const at = swings(values)
    return Math.max(0, ...at.map(i => at.filter(j => j >= i && j < i + 30).length))
}

const contactSheet = (video, duration, file) => {
    const stills = [0.1, 0.35, 0.6, 0.85].map((t, i) => {
        const still = join(work, `still-${i}.png`)
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(t * duration), '-i', video, '-frames:v', '1', '-vf', 'scale=800:-2', still])
        return still
    })
    execFileSync('magick', ['montage', ...stills, '-tile', '2x2', '-geometry', '+6+6', '-background', '#111', file])
}

try {
    mkdirSync(out, { recursive: true })
    for (let i = 0; i < 40 && !await evaluate(`!!window.strobe`).catch(() => false); i++) await wait(0.5)
    await wait(2)
    await evaluate(`window.strobe.api.invoke('show:open_recent', ${JSON.stringify(join(work, 'Example.strobe'))})`)
    await wait(2)
    const duration = await evaluate(`new Promise(r => { const a = document.querySelector('audio'); if (a.duration) r(a.duration); else a.addEventListener('loadedmetadata', () => r(a.duration)) })`)
    log(`Example show open, ${duration.toFixed(0)} s`)

    const report = { app, videos: {} }
    const record = async (shot, film) => {
        await layout(shot.width, shot.height)
        const margin = 14  // A bit around a section, so its title on the top border shows whole
        let crop = [0, 0, shot.width, shot.height]
        if (shot.selectors) {
            const rects = await Promise.all(shot.selectors.map(rectOf))
            const [left, top] = [Math.min(...rects.map(r => r[0])), Math.min(...rects.map(r => r[1]))]
            const [right, bottom] = [Math.max(...rects.map(r => r[0] + r[2])), Math.max(...rects.map(r => r[1] + r[3]))]
            crop = [left - margin, top - margin, right - left + 2 * margin, bottom - top + 2 * margin]
        }
        const { frames, from, length } = await film()
        const video = join(out, `${shot.name}.mp4`)
        const onTime = encode(frames, from, length, crop, shot.scale, video)
        const poster = join(work, `${shot.name}-poster.png`)
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-frames:v', '1', poster])
        execFileSync('cwebp', ['-quiet', '-q', '85', poster, '-o', join(out, `${shot.name}.webp`)])
        contactSheet(video, length, join(out, `${shot.name}-sheet.png`))
        const [width, height] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', video]).toString().trim().split(',').map(Number)
        report.videos[shot.name] = {
            width, height, seconds: Number(length.toFixed(1)),
            capturedFps: Number((frames.length / length).toFixed(1)),
            framesOnTime: Number(onTime.toFixed(2)),
            bytes: Number(execFileSync('stat', ['-f', '%z', video]).toString()),
            maxSwingsPerSecond: maxSwingsPerSecond(brightness(video)),
        }
        log(shot.name, JSON.stringify(report.videos[shot.name]))
    }

    // The stories, the track stopped
    for (const shot of SHOTS.filter(shot => shot.story)) {
        await record(shot, async () => {
            await evaluate(POINTER)
            const [x, y] = await centerOf('#app .section.buttons')
            await pointerTo(x, y + 200, false)
            // Filmed until the story ends: its length, rounded up to a whole frame
            const from = Date.now() / 1000 + 0.5
            const story = STORIES[shot.story]
            let ended = null
            const filming = film(join(work, shot.name), from, () => ended)
            await wait(0.5)
            await story()
            ended = Date.now() / 1000
            const frames = await filming
            await evaluate(`document.getElementById('recording-pointer')?.remove()`)
            return { frames, from, length: ended - from }
        })
    }

    const passageShots = SHOTS.filter(shot => !shot.story)
    if (passageShots.length) {
    // Its first pattern selected, so the overview shows the note editor
    await layout(1440, 900)
    const [tx, ty, tw, th] = await rectOf('#app .section.midi canvas')
    await click(tx + tw * 0.2, ty + th * 0.4)
    await wait(0.5)

    // Scouting: the whole track, at the overview's layout; the scene's brightness every frame
    log('Scouting the whole track')
    const sceneRect = await rectOf('#app .section.scene')
    const start = await playFromStart()
    const scoutLength = duration - 1
    const scoutFrames = await film(join(work, 'scout'), start + 0.5, scoutLength - 0.5)
    await pause()
    const scout = join(work, 'scout.mp4')
    encode(scoutFrames, start + 0.5, scoutLength - 0.5, sceneRect, 0.25, scout)
    const scene = brightness(scout)

    // The liveliest window that keeps to the rule: the brightest on average, the lights moving counting too
    const length = seconds * 30
    let best = null
    for (let i = 0; i + length <= scene.length; i += 15) {
        const values = scene.slice(i, i + length)
        if (maxSwingsPerSecond(values) > MAX_SWINGS_PER_SECOND) continue
        const mean = values.reduce((a, b) => a + b, 0) / values.length
        const motion = values.slice(1).reduce((a, v, j) => a + Math.abs(v - values[j]), 0) / values.length
        const score = mean + 4 * motion
        if (!best || score > best.score) best = { at: 0.5 + i / 30, score }
    }
    if (!best) throw new Error('No passage of the example show keeps to the flashing rule')
    log(`Passage: ${best.at.toFixed(1)} s to ${(best.at + seconds).toFixed(1)} s`)

    // Each video, from the start of that passage
    report.passage = [best.at, best.at + seconds]
    for (const shot of passageShots) {
        await record(shot, async () => {
            const start = await playFromStart()
            const frames = await film(join(work, shot.name), start + best.at, seconds)
            await pause()
            return { frames, from: start + best.at, length: seconds }
        })
    }
    }
    await send('Emulation.clearDeviceMetricsOverride')
    writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2))
    log(`Done: ${out}`)
} finally {
    done = true
    ws.close()
    quit()
}
