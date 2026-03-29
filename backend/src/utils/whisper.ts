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

  const wavPath = path.join(tempDir, `whisper_${uuidv4()}.wav`)
  const outputBase = path.join(tempDir, `whisper_${uuidv4()}`)

  const whisperBin = process.env.WHISPER_CPP_BIN || 'whisper-cpp'
  const modelName = model
  const modelPath = process.env.WHISPER_CPP_MODEL || path.join(process.cwd(), 'models', `ggml-${modelName}.bin`)

  if (!fs.existsSync(modelPath)) {
    throw new Error(`Whisper.cpp model not found: ${modelPath}`)
  }

  // Extract mono 16k WAV (whisper.cpp expects wav input)
  const ffmpegArgs = [
    '-y',
    '-i', inputPath,
    '-ac', '1',
    '-ar', '16000',
    '-vn',
    wavPath,
  ]

  const timeoutMs = Number(process.env.WHISPER_TIMEOUT_MS || 20 * 60 * 1000)
  try {
    await execFileAsync('ffmpeg', ffmpegArgs, { timeout: timeoutMs })
  } catch (err: any) {
    throw new Error('Failed to extract audio for subtitles')
  }

  const args = [
    '-m', modelPath,
    '-f', wavPath,
    '-of', outputBase,
    '-osrt',
  ]

  if (language && language !== 'auto') {
    args.push('-l', language)
  }

  try {
    await execFileAsync(whisperBin, args, { timeout: timeoutMs })
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new Error('whisper.cpp binary not found. Please install whisper.cpp.')
    }
    throw err
  }

  const tempSrt = `${outputBase}.srt`
  if (!fs.existsSync(tempSrt)) {
    throw new Error('Auto subtitles failed: no SRT produced')
  }

  const id = uuidv4()
  const outFilename = `sub_${id}.srt`
  const outPath = path.join(uploadsDir, outFilename)

  fs.renameSync(tempSrt, outPath)
  if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath)

  return { id, filename: outFilename, filepath: outPath }
}
