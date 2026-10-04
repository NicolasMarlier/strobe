// import multer from "multer"
import path from "path"
import fs from "fs"
import { Store } from "../store/Store"
import { handleErrors, NotFoundError } from "./application.controller"
import { currentAudioDir, savedAudioDir } from "../show/document"

// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
//   filename: (req, _file, cb) => {
//     const ext = path.extname(_file.originalname)
//     cb(null, `track_${req.params.id}${ext}`)
//   },
// })

// export const audioUpload = multer({ storage })

const getTrack = async (track_id: number) => Store.getInstance().getTrack(track_id)

// Audio lives in the open show's audio/ folder; an unsaved show has none
// Served by the protocol in src/main/init/audio_protocol.ts
export const AUDIO_SCHEME = 'show-audio'

// The version changes when the file does, so the renderer doesn't reuse a stale cached copy
const trackAudioUrl = (trackId: number, filePath: string) =>
  `${AUDIO_SCHEME}://track/${trackId}?v=${Math.round(fs.statSync(filePath).mtimeMs)}`

export const existingAudioPath = (trackId: number): string | null => {
  const dir = currentAudioDir()
  if (!dir || !fs.existsSync(dir)) return null

  const fileId = Store.getInstance().findTrack(trackId)?.audio_id ?? trackId
  const candidates = fs.readdirSync(dir).filter(f => f.startsWith(`track_${fileId}.`))
  return candidates.length > 0 ? path.join(dir, candidates[0]!) : null
}


export class TracksAudioController {

  static upload = (track_id: number) => handleErrors(async() => {
      // if (!req.file) {
      //   res.status(400).json({ error: "No file provided" })
      //   return
      // }

      const track = await getTrack(track_id)

      // // Delete any old file with a different extension than the one just saved
      // fs.readdirSync(UPLOADS_DIR)
      //   .filter(f => f.startsWith(`track_${track.id}.`) && f !== req.file!.filename)
      //   .forEach(f => fs.unlinkSync(path.join(UPLOADS_DIR, f)))

      // await track.update({ audio_filename: req.file.originalname })
      return track
  })

  static reset = async(track_id: number) => handleErrors(async () => {
    const track = await getTrack(track_id)

    // The example show's audio, bundled with the app, is left alone: only the track forgets it
    const existing = existingAudioPath(track.id)
    const saved = savedAudioDir()
    if (existing && saved && path.dirname(existing) == saved) fs.unlinkSync(existing)

    return Store.getInstance().updateTrack(track.id, { audio_filename: null })
  })

  

  static getAudio = async(track_id: number) => handleErrors(async () => {
    const track = await getTrack(track_id)

    const filePath = existingAudioPath(track.id)
    if (!filePath) throw new NotFoundError("No audio file for this track")

    return trackAudioUrl(track.id, filePath)
  })
}
