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

const listAudioFiles = (audio: string) => fs.existsSync(audio)
    ? fs.readdirSync(audio).filter(isTrackAudioFile)
    : []

// The id a track's audio file is named after: audio/track_<id>.<ext>
export const audioFileId = (track: Track) => track.audio_id ?? track.id

// The track's audio file in the first of these audio folders that has it
export const findAudioFile = (audioDirs: (string | null)[], fileId: number): string | null => {
    for (const audio of audioDirs) {
        const name = audio && listAudioFiles(audio).find(f => f.startsWith(`track_${fileId}.`))
        if (name) return path.join(audio, name)
    }
    return null
}

// An id no audio file of the show uses, in any of these folders, so a new file never replaces another track's
export const newAudioFileId = (tracks: Track[], audioDirs: (string | null)[]) => 1 + Math.max(0,
    ...tracks.flatMap(t => [t.id, t.audio_id ?? 0]),
    ...audioDirs.flatMap(audio => audio ? listAudioFiles(audio) : []).map(f => Number(/^track_(\d+)\./.exec(f)![1])),
)

// Rename across volumes too (the pending folder is in the system's temporary folder)
const moveFile = (from: string, to: string) => {
    try {
        fs.renameSync(from, to)
    } catch (e) {
        if ((e as NodeJS.ErrnoException).code != 'EXDEV') throw e
        fs.copyFileSync(from, to, fs.constants.COPYFILE_FICLONE)
        fs.unlinkSync(from)
    }
}

// Writes the show into `dir`, with the audio files of its tracks and no other.
// Each file is taken from `pendingDir` (imported since the last save: moved in) or else from the show
// it was opened from, `fromDir` (`dir` itself for a save in place, another show for a Save As).
// Files no track plays any more are moved to `pendingDir` on a save in place, so an undo still finds them
export const writeShow = (dir: string, data: ShowData, fromDir: string | null, pendingDir: string | null = null) => {
    if (fs.existsSync(dir) && !isShowDir(dir) && fs.readdirSync(dir).length > 0) {
        throw new ShowFileError(`${path.basename(dir)} already exists and is not a show`)
    }
    const audio = audioDir(dir)
    fs.mkdirSync(audio, { recursive: true })
    const inPlace = !!fromDir && path.resolve(fromDir) == path.resolve(dir)

    // Copies of a track play the same file
    const fileIds = new Set(data.tracks.filter(t => t.audio_filename).map(audioFileId))
    const kept = new Set<string>()
    fileIds.forEach(fileId => {
        const source = findAudioFile([pendingDir, fromDir && audioDir(fromDir)], fileId)
        if (!source) return
        const target = path.join(audio, path.basename(source))
        kept.add(path.basename(source))
        if (path.resolve(source) == path.resolve(target)) return
        if (pendingDir && path.dirname(source) == pendingDir) moveFile(source, target)
        // Clone on APFS (instant, no extra disk space), plain copy elsewhere
        else fs.copyFileSync(source, target, fs.constants.COPYFILE_FICLONE)
    })

    // Write then rename, so a failed save never leaves a half-written show.json
    const file: ShowFile = { format: FORMAT, version: VERSION, ...data }
    const tmpPath = `${showJsonPath(dir)}.tmp`
    fs.writeFileSync(tmpPath, JSON.stringify(file, null, 2))
    fs.renameSync(tmpPath, showJsonPath(dir))

    // A show replaced by a Save As takes its audio with it
    listAudioFiles(audio).filter(f => !kept.has(f)).forEach(f => inPlace && pendingDir
        ? moveFile(path.join(audio, f), path.join(pendingDir, f))
        : fs.unlinkSync(path.join(audio, f)))
}
