import path from "path"
import fs from "fs"
import { execFile } from "child_process"
import { promisify } from "util"
import { BrowserWindow, dialog } from "electron"
import { Store } from "../store/Store"
import { handleErrors, NotFoundError } from "./application.controller"
import { audioDirs, pendingAudioDir } from "../show/document"
import { audioFileId, findAudioFile, newAudioFileId } from "../show/show_file"

const getTrack = async (track_id: number) => Store.getInstance().getTrack(track_id)

// Audio lives in the open show's audio/ folder, or in the pending folder until the show is saved
// Served by the protocol in src/main/init/audio_protocol.ts
export const AUDIO_SCHEME = 'show-audio'

// What the window plays as they are
const PLAYABLE = ['.wav', '.mp3', '.m4a', '.aac', '.flac', '.ogg', '.opus']
// What it can't play (AIFF, often exported from Logic or MainStage): turned into WAV on import, by macOS
const CONVERTED = ['.aif', '.aiff', '.aifc', '.caf']
export const AUDIO_EXTENSIONS = [...PLAYABLE, ...CONVERTED].map(ext => ext.slice(1))

// The version changes when the file does, so the renderer doesn't reuse a stale cached copy
const trackAudioUrl = (trackId: number, filePath: string) =>
  `${AUDIO_SCHEME}://track/${trackId}?v=${Math.round(fs.statSync(filePath).mtimeMs)}`

export const existingAudioPath = (trackId: number): string | null => {
  const track = Store.getInstance().findTrack(trackId)
  // A track without audio never plays a file left behind by another
  if (!track?.audio_filename) return null
  return findAudioFile(audioDirs(), audioFileId(track))
}

// Whether the track has an audio file it can't find (moved or deleted outside Strobe)
export const isAudioMissing = (track: Track) => !!track.audio_filename && !existingAudioPath(track.id)

// Copies the file into the pending folder under a new id, so the tracks sharing the old file keep it,
// and the show only changes on disk when it's saved
const importAudio = async(win: BrowserWindow, trackId: number, filePath: string): Promise<Track | null> => {
  const track = await getTrack(trackId)
  const ext = path.extname(filePath).toLowerCase()
  if (![...PLAYABLE, ...CONVERTED].includes(ext)) {
    await dialog.showMessageBox(win, {
      type: 'warning',
      message: `“${path.basename(filePath)}” is not an audio file Strobe can play`,
      detail: 'Use a WAV, AIFF, MP3, M4A, FLAC or OGG file.',
    })
    return null
  }

  const store = Store.getInstance()
  const pending = pendingAudioDir()
  const fileId = newAudioFileId(store.listTracks(), audioDirs())
  try {
    if (CONVERTED.includes(ext)) {
      await promisify(execFile)('afconvert', ['-f', 'WAVE', '-d', 'LEI24', filePath, path.join(pending, `track_${fileId}.wav`)])
    } else {
      // Clone on APFS (instant, no extra disk space), plain copy elsewhere
      fs.copyFileSync(filePath, path.join(pending, `track_${fileId}${ext}`), fs.constants.COPYFILE_FICLONE)
    }
  } catch (e) {
    console.error(e)
    await dialog.showMessageBox(win, {
      type: 'warning',
      message: `Could not import “${path.basename(filePath)}”`,
      detail: (e as Error).message,
    })
    return null
  }

  return store.updateTrack(track.id, { audio_filename: path.basename(filePath), audio_id: fileId })
}

export class TracksAudioController {

  // A file dropped on the track: its path on disk
  static upload = (win: BrowserWindow, track_id: number, filePath: string) => handleErrors(() =>
    importAudio(win, track_id, filePath)
  )

  // Choose Audio File…: null if cancelled
  static choose = (win: BrowserWindow, track_id: number) => handleErrors(async() => {
    const track = await getTrack(track_id)
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: `Audio File for “${track.name}”`,
      properties: ['openFile'],
      filters: [{ name: 'Audio', extensions: AUDIO_EXTENSIONS }],
    })
    if (canceled || !filePaths[0]) return null
    return importAudio(win, track.id, filePaths[0])
  })

  // The track forgets its audio. The file stays until the show is saved, so an undo brings it back
  static reset = async(track_id: number) => handleErrors(async () => {
    const track = await getTrack(track_id)
    return Store.getInstance().updateTrack(track.id, { audio_filename: null })
  })

  static getAudio = async(track_id: number) => handleErrors(async () => {
    const track = await getTrack(track_id)

    const filePath = existingAudioPath(track.id)
    if (!filePath) throw new NotFoundError("No audio file for this track")

    return trackAudioUrl(track.id, filePath)
  })
}
