import fs from "fs"
import path from "path"
import { defaultPosition, LED_BAR } from "../../shared/fixtures"

// A show is a folder:
//   MyShow.strobe/
//   ├── show.json
//   └── audio/track_<id>.<ext>

export const SHOW_EXTENSION = '.strobe'
const FORMAT = 'strobe-show'
// 2: programs renamed to tracks (tracks, track_id, audio/track_<id>.<ext>)
// 3: the scene's LED bars became elements of any fixture (dmx_scene.elements)
const VERSION = 3

type ShowFile = ShowData & {
    format: typeof FORMAT
    version: number
}

// A LED bar of a version 2 show: rgb_dots_count dots from `channel`. The first ones, placed with CSS, had no position
type LedBarV2 = {
    channel: number
    rgb_dots_count: number
    position?: Vector3Tuple
    rotation?: Vector3Tuple
}

// Version 2 scenes only had LED bars: they become LED bar elements, laid out in rows when they had no position
const migrateSceneV2 = (scene: { led_bars: LedBarV2[], display?: DmxSceneDisplay }): DmxScene => ({
    elements: scene.led_bars.map(({ channel, rgb_dots_count, position, rotation }, index) => ({
        fixture: LED_BAR.id,
        channel,
        cells: rgb_dots_count,
        position: position ?? defaultPosition(index, LED_BAR),
        rotation: rotation ?? [0, 0, 0],
    })),
    ...(scene.display && { display: scene.display }),
})

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
    if (file.version < 2) throw new ShowFileError('This show uses an older format (programs instead of tracks) that this version of Strobe does not open')
    if (!Array.isArray(file.tracks) || !Array.isArray(file.dmx_buttons) || !Array.isArray(file.dmx_midis)) {
        throw new ShowFileError('show.json is missing tracks, dmx_buttons or dmx_midis')
    }

    return {
        tracks: file.tracks,
        dmx_buttons: file.dmx_buttons,
        dmx_midis: file.dmx_midis,
        dmx_scene: readScene(file),
    }
}

const readScene = (file: ShowFile): DmxScene => {
    // Shows made before the scene was part of the show have none
    if (file.dmx_scene === undefined) return { elements: [] }

    if (file.version == 2) {
        const scene = file.dmx_scene as unknown as { led_bars?: LedBarV2[] }
        if (!Array.isArray(scene?.led_bars)) throw new ShowFileError('show.json has a dmx_scene without led_bars')
        return migrateSceneV2(scene as { led_bars: LedBarV2[] })
    }

    if (!Array.isArray(file.dmx_scene?.elements)) throw new ShowFileError('show.json has a dmx_scene without elements')
    return file.dmx_scene
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
