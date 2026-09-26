// import multer from "multer"
import path from "path"
import fs from "fs"
import { Store } from "../store/Store"
import { handleErrors, NotFoundError } from "./application.controller"
import { currentAudioDir } from "../show/document"

// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
//   filename: (req, _file, cb) => {
//     const ext = path.extname(_file.originalname)
//     cb(null, `program_${req.params.id}${ext}`)
//   },
// })

// export const audioUpload = multer({ storage })

const getProgram = async (program_id: number) => Store.getInstance().getProgram(program_id)

// Audio lives in the open show's audio/ folder; an unsaved show has none
// Served by the protocol in src/main/init/audio_protocol.ts
export const AUDIO_SCHEME = 'show-audio'

// The version changes when the file does, so the renderer doesn't reuse a stale cached copy
const programAudioUrl = (programId: number, filePath: string) =>
  `${AUDIO_SCHEME}://program/${programId}?v=${Math.round(fs.statSync(filePath).mtimeMs)}`

export const existingAudioPath = (programId: number): string | null => {
  const dir = currentAudioDir()
  if (!dir || !fs.existsSync(dir)) return null

  const candidates = fs.readdirSync(dir).filter(f => f.startsWith(`program_${programId}.`))
  return candidates.length > 0 ? path.join(dir, candidates[0]!) : null
}


export class ProgramsAudioController {

  static upload = (program_id: number) => handleErrors(async() => {
      // if (!req.file) {
      //   res.status(400).json({ error: "No file provided" })
      //   return
      // }

      const program = await getProgram(program_id)

      // // Delete any old file with a different extension than the one just saved
      // fs.readdirSync(UPLOADS_DIR)
      //   .filter(f => f.startsWith(`program_${program.id}.`) && f !== req.file!.filename)
      //   .forEach(f => fs.unlinkSync(path.join(UPLOADS_DIR, f)))

      // await program.update({ audio_filename: req.file.originalname })
      return program
  })

  static reset = async(program_id: number) => handleErrors(async () => {
    const program = await getProgram(program_id)

    const existing = existingAudioPath(program.id)
    if (existing) fs.unlinkSync(existing)

    return Store.getInstance().updateProgram(program.id, { audio_filename: null })
  })

  

  static getAudio = async(program_id: number) => handleErrors(async () => {
    const program = await getProgram(program_id)

    const filePath = existingAudioPath(program.id)
    if (!filePath) throw new NotFoundError("No audio file for this program")

    return programAudioUrl(program.id, filePath)
  })
}
