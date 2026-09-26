import { protocol } from "electron"
import fs from "fs"
import path from "path"
import { Readable } from "stream"
import { AUDIO_SCHEME, existingAudioPath } from "../controllers/programs_audio.controller"

const MIME_TYPES: { [ext: string]: string } = {
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.aif': 'audio/aiff',
    '.aiff': 'audio/aiff',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4',
}

// Serves the open show's audio files to the renderer as show-audio://program/<id>,
// so it can stream them instead of receiving whole files as base64 over IPC.
// Must run before the app is ready
export const registerAudioScheme = () => protocol.registerSchemesAsPrivileged([{
    scheme: AUDIO_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
}])

const fileStream = (filePath: string, start: number, end: number) =>
    Readable.toWeb(fs.createReadStream(filePath, { start, end })) as ReadableStream

export const initAudioProtocol = () => protocol.handle(AUDIO_SCHEME, (request) => {
    const url = new URL(request.url)
    const programId = Number(url.pathname.replace(/^\//, ''))
    const filePath = url.hostname == 'program' && Number.isInteger(programId) ? existingAudioPath(programId) : null
    if (!filePath) return new Response('Not found', { status: 404 })

    const size = fs.statSync(filePath).size
    const headers = {
        'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream',
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
    }

    // <audio> seeks with range requests
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('Range') ?? '')
    if (range && (range[1] || range[2])) {
        const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]))
        const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1
        if (start >= size || start > end) {
            return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${size}` } })
        }
        return new Response(fileStream(filePath, start, end), {
            status: 206,
            headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': `${end - start + 1}` },
        })
    }

    return new Response(fileStream(filePath, 0, size - 1), {
        status: 200,
        headers: { ...headers, 'Content-Length': `${size}` },
    })
})
