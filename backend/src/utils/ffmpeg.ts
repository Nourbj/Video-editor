import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'

const outputDir = path.join(process.cwd(), 'outputs')
const tempDir = path.join(process.cwd(), 'temp')

export interface CutOptions {
  inputPath: string
  startTime: number   // seconds
  endTime: number     // seconds
}

export interface AudioOptions {
  inputPath: string
  audioPath: string
  volume?: number     // 0-2, default 1
  replaceOriginal?: boolean
}

export interface SubtitleOptions {
  inputPath: string
  subtitlePath: string // .srt file path
}

export interface ExportOptions {
  inputPath: string
  quality?: '480p' | '720p' | '1080p'
  audioPath?: string
  subtitlePath?: string
  startTime?: number
  endTime?: number
}

// Get video metadata
export function getVideoMeta(inputPath: string): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) {
        if ((err as any).code === 'ENOENT') {
          reject(new Error('ffprobe not found on system. Please install ffmpeg or use docker-compose.'))
        } else {
          reject(err)
        }
      }
      else resolve(data)
    })
  })
}

// Cut video between start and end
export function cutVideo({ inputPath, startTime, endTime }: CutOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const outFile = path.join(outputDir, `cut_${uuidv4()}.mp4`)
    const duration = endTime - startTime

    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(['-avoid_negative_ts', 'make_zero'])
      .output(outFile)
      .on('end', () => resolve(outFile))
      .on('error', reject)
      .run()
  })
}

// Add / replace audio track
export function mergeAudio({ inputPath, audioPath, volume = 1, replaceOriginal = false }: AudioOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const outFile = path.join(outputDir, `audio_${uuidv4()}.mp4`)

    const cmd = ffmpeg(inputPath).input(audioPath)

    if (replaceOriginal) {
      cmd
        .outputOptions([
          '-map 0:v:0',
          '-map 1:a:0',
          `-filter:a volume=${volume}`,
          '-c:v copy',
          '-c:a aac',
          '-shortest',
        ])
    } else {
      // Mix original audio with new audio
      cmd.complexFilter([
        `[0:a]volume=1[a0]`,
        `[1:a]volume=${volume}[a1]`,
        `[a0][a1]amix=inputs=2:duration=first[aout]`,
      ], 'aout')
        .outputOptions(['-map 0:v', '-c:v copy', '-c:a aac'])
    }

    cmd
      .output(outFile)
      .on('end', () => resolve(outFile))
      .on('error', reject)
      .run()
  })
}

// Burn subtitles into video
export function burnSubtitles({ inputPath, subtitlePath }: SubtitleOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const outFile = path.join(outputDir, `sub_${uuidv4()}.mp4`)
    // Escape path for FFmpeg filter
    const escapedSrt = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:')

    ffmpeg(inputPath)
      .videoFilter(`subtitles='${escapedSrt}':force_style='FontName=Arial,FontSize=20,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=2'`)
      .videoCodec('libx264')
      .audioCodec('copy')
      .output(outFile)
      .on('end', () => resolve(outFile))
      .on('error', reject)
      .run()
  })
}

// Full export pipeline: cut + audio + subtitles + quality
export function exportVideo(options: ExportOptions, onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const outFile = path.join(outputDir, `export_${uuidv4()}.mp4`)
    const { inputPath, quality = '720p', startTime, endTime, audioPath, subtitlePath } = options

    const scaleMap = { '480p': 854, '720p': 1280, '1080p': 1920 }
    const targetWidth = scaleMap[quality]

    let cmd = ffmpeg(inputPath)

    if (startTime !== undefined && endTime !== undefined) {
      cmd = cmd.setStartTime(startTime).setDuration(endTime - startTime)
    }

    const filters: string[] = [`scale=${targetWidth}:-2`]

    if (subtitlePath && fs.existsSync(subtitlePath)) {
      const escapedSrt = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:')
      filters.push(`subtitles='${escapedSrt}':force_style='FontName=Arial,FontSize=22,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=2'`)
    }

    cmd.videoFilter(filters)
    cmd.videoCodec('libx264')
    cmd.addOption('-crf', '23')
    cmd.addOption('-preset', 'fast')

    if (audioPath && fs.existsSync(audioPath)) {
      cmd.input(audioPath)
      // Build a single audio mix output labeled "aout"
      cmd.complexFilter(['[0:a][1:a]amix=inputs=2:duration=first[aout]'])
      // Map video from input 0 and mixed audio from filter graph
      cmd.outputOptions(['-map 0:v', '-map [aout]', '-c:a aac'])
    } else {
      cmd.audioCodec('aac')
    }

    cmd
      .output(outFile)
      .on('progress', p => onProgress?.(Math.round(p.percent || 0)))
      .on('end', () => resolve(outFile))
      .on('error', reject)
      .run()
  })
}

// Generate thumbnail
export function generateThumbnail(inputPath: string, atSecond = 1): Promise<string> {
  return new Promise((resolve, reject) => {
    const outFile = path.join(tempDir, `thumb_${uuidv4()}.jpg`)
    ffmpeg(inputPath)
      .screenshots({ timestamps: [atSecond], filename: path.basename(outFile), folder: path.dirname(outFile), size: '640x?' })
      .on('end', () => resolve(outFile))
      .on('error', reject)
  })
}

// Generate waveform data for audio visualization
export function getWaveformData(inputPath: string, samples = 200): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(tempDir, `wave_${uuidv4()}.raw`)
    ffmpeg(inputPath)
      .audioChannels(1)
      .audioFrequency(8000)
      .format('s16le')
      .output(tempFile)
      .on('end', () => {
        try {
          const buf = fs.readFileSync(tempFile)
          const data: number[] = []
          const step = Math.floor(buf.length / 2 / samples)
          for (let i = 0; i < samples; i++) {
            const offset = i * step * 2
            const val = Math.abs(buf.readInt16LE(offset)) / 32768
            data.push(Math.round(val * 100) / 100)
          }
          fs.unlinkSync(tempFile)
          resolve(data)
        } catch (e) {
          reject(e)
        }
      })
      .on('error', reject)
      .run()
  })
}

export function checkFfmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err) => {
      resolve(!err)
    })
  })
}

export function checkFfprobe(): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe('', (err) => {
      // ffprobe will error with empty input, but if it's found it returns a specific error
      // if not found, it returns "spawn ffprobe ENOENT"
      if (err && (err as any).code === 'ENOENT') {
        resolve(false)
      } else {
        resolve(true)
      }
    })
  })
}
