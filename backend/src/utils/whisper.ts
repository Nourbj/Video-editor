import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const execFileAsync = promisify(execFile)

export async function generateSrtWithWhisper(params: {
  inputPath: string
  language?: string
  model?: 'tiny' | 'base' | 'small' | 'medium' | 'large'
}) {
  const { inputPath, language, model = 'small' } = params

  const tempDir = path.join(process.cwd(), 'temp')
  const uploadsDir = path.join(process.cwd(), 'uploads')
  const ext = path.extname(inputPath)
  const tempInput = path.join(tempDir, `whisper_${uuidv4()}${ext}`)

  fs.copyFileSync(inputPath, tempInput)

  const args = [
    tempInput,
    '--model', model,
    '--output_format', 'srt',
    '--output_dir', tempDir,
    '--task', 'transcribe',
    '--fp16', 'False',
  ]

  if (language) {
    args.push('--language', language)
  }

  const timeoutMs = Number(process.env.WHISPER_TIMEOUT_MS || 20 * 60 * 1000)
  try {
    await execFileAsync('whisper', args, { timeout: timeoutMs })
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new Error('Whisper CLI not found. Install openai-whisper locally to enable auto subtitles.')
    }
    throw err
  }

  const base = path.basename(tempInput, ext)
  const tempSrt = path.join(tempDir, `${base}.srt`)
  if (!fs.existsSync(tempSrt)) {
    throw new Error('Auto subtitles failed: no SRT produced')
  }

  const id = uuidv4()
  const outFilename = `sub_${id}.srt`
  const outPath = path.join(uploadsDir, outFilename)

  fs.renameSync(tempSrt, outPath)
  fs.unlinkSync(tempInput)

  return { id, filename: outFilename, filepath: outPath }
}
