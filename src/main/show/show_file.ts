import fs from "fs"
import path from "path"

// A show is a folder:
//   MyShow.strobe/
//   ├── show.json
//   └── audio/track_<id>.<ext>

export const SHOW_EXTENSION = '.strobe'
const FORMAT = 'strobe-show'
// 2: programs renamed to tracks (tracks, track_id, audio/track_<id>.<ext>)
const VERSION = 2

type ShowFile = ShowData & {
    format: typeof FORMAT
    version: number
}

export class ShowFileError extends Error {}

export const showJsonPath = (dir: string) => path.join(dir, 'show.json')
export const audioDir = (dir: string) => path.join(dir, 'audio')

export const isShowDir = (dir: string) => fs.existsSync(showJsonPath(dir))

export const readShow = (dir: string): ShowData => {
    if (!isShowDir(dir)) throw new ShowFileError(`${path.basename(dir)} is not a show (show.json is missing)`)

    let file: ShowFile
    try {
        file = JSON.parse(fs.readFileSync(showJsonPath(dir), 'utf8'))
    } catch (e) {
        throw new ShowFileError(`show.json is not valid JSON: ${(e as Error).message}`)
    }

    if (file.format != FORMAT) throw new ShowFileError('show.json is not a Strobe show')
    if (file.version > VERSION) throw new ShowFileError('This show was made by a newer version of Strobe')
    if (file.version < VERSION) throw new ShowFileError('This show uses an older format (programs instead of tracks) that this version of Strobe does not open')
    if (!Array.isArray(file.tracks) || !Array.isArray(file.dmx_buttons) || !Array.isArray(file.dmx_midis)) {
        throw new ShowFileError('show.json is missing tracks, dmx_buttons or dmx_midis')
    }
    if (file.dmx_scene !== undefined && !Array.isArray(file.dmx_scene?.led_bars)) {
        throw new ShowFileError('show.json has a dmx_scene without led_bars')
    }

    return {
        tracks: file.tracks,
        dmx_buttons: file.dmx_buttons,
        dmx_midis: file.dmx_midis,
        // Shows made before the scene was part of the show have none
        dmx_scene: file.dmx_scene ?? { led_bars: [] },
    }
}

const isTrackAudioFile = (filename: string) => /^track_\d+\.\w+$/.test(filename)

const listAudioFiles = (dir: string) => fs.existsSync(audioDir(dir))
    ? fs.readdirSync(audioDir(dir)).filter(isTrackAudioFile)
    : []

// Writes the show into `dir`. When `fromDir` is another show (Save As), its audio is copied along.
export const writeShow = (dir: string, data: ShowData, fromDir: string | null) => {
    if (fs.existsSync(dir) && !isShowDir(dir) && fs.readdirSync(dir).length > 0) {
        throw new ShowFileError(`${path.basename(dir)} already exists and is not a show`)
    }
    fs.mkdirSync(audioDir(dir), { recursive: true })

    if (fromDir && path.resolve(fromDir) != path.resolve(dir)) {
        // Replacing another show: drop its audio so it doesn't leak into this one
        listAudioFiles(dir).forEach(f => fs.unlinkSync(path.join(audioDir(dir), f)))

        // Clone on APFS (instant, no extra disk space), plain copy elsewhere
        listAudioFiles(fromDir).forEach(f => fs.copyFileSync(
            path.join(audioDir(fromDir), f),
            path.join(audioDir(dir), f),
            fs.constants.COPYFILE_FICLONE
        ))
    }

    // Write then rename, so a failed save never leaves a half-written show.json
    const file: ShowFile = { format: FORMAT, version: VERSION, ...data }
    const tmpPath = `${showJsonPath(dir)}.tmp`
    fs.writeFileSync(tmpPath, JSON.stringify(file, null, 2))
    fs.renameSync(tmpPath, showJsonPath(dir))
}
