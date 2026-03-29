import { FastifyInstance } from 'fastify'
import { pipeline } from 'stream/promises'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { burnSubtitles } from '../utils/ffmpeg'
import { generateSrtWithWhisper } from '../utils/whisper'

export interface SubtitleEntry {
  index: number
  startTime: string  // "00:00:01,000"
  endTime: string
  text: string
}

function parseSRT(content: string): SubtitleEntry[] {
  const blocks = content.trim().split(/\n\n+/)
  return blocks.map(block => {
    const lines = block.trim().split('\n')
    const index = parseInt(lines[0])
    const [startTime, endTime] = lines[1].split(' --> ')
    const text = lines.slice(2).join('\n')
    return { index, startTime: startTime.trim(), endTime: endTime.trim(), text }
  }).filter(e => !isNaN(e.index))
}

function generateSRT(entries: SubtitleEntry[]): string {
  return entries.map(e =>
    `${e.index}\n${e.startTime} --> ${e.endTime}\n${e.text}`
  ).join('\n\n')
}

export async function subtitleRoute(app: FastifyInstance) {
  // Upload .srt file
  app.post('/subtitle/upload', async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'No file' })

    const id = uuidv4()
    const filename = `sub_${id}.srt`
    const filepath = path.join(process.cwd(), 'uploads', filename)

    await pipeline(data.file, fs.createWriteStream(filepath))

    const content = fs.readFileSync(filepath, 'utf-8')
    const entries = parseSRT(content)

    return { id, filename, entries }
  })

  // Create SRT from JSON entries (from the editor)
  app.post('/subtitle/create', async (req, reply) => {
    const { entries } = req.body as { entries: SubtitleEntry[] }

    const id = uuidv4()
    const filename = `sub_${id}.srt`
    const filepath = path.join(process.cwd(), 'uploads', filename)

    const content = generateSRT(entries)
    fs.writeFileSync(filepath, content, 'utf-8')

    return { id, filename, url: `/uploads/${filename}` }
  })

  // Burn subtitles into video
  app.post('/subtitle/burn', async (req, reply) => {
    const { videoFilename, subtitleFilename, style } = req.body as {
      videoFilename: string
      subtitleFilename: string
      style?: {
        size?: number
        color?: string
        position?: 'bottom' | 'middle' | 'top'
      }
    }

    const inputPath = path.join(process.cwd(), 'uploads', videoFilename)
    const subtitlePath = path.join(process.cwd(), 'uploads', subtitleFilename)

    if (!fs.existsSync(inputPath)) return reply.code(404).send({ error: 'Video not found' })
    if (!fs.existsSync(subtitlePath)) return reply.code(404).send({ error: 'Subtitle not found' })

    try {
      const outPath = await burnSubtitles({ inputPath, subtitlePath, style })
      return { url: `/outputs/${path.basename(outPath)}`, filename: path.basename(outPath) }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Subtitle burn failed'
      return reply.code(500).send({ error: message })
    }
  })

  // Auto-generate subtitles using local Whisper
  app.post('/subtitle/auto', async (req, reply) => {
    const { videoFilename, language, model } = req.body as {
      videoFilename: string
      language?: string
      model?: 'tiny' | 'base' | 'small' | 'medium' | 'large'
    }

    const inputPath = path.join(process.cwd(), 'uploads', videoFilename)
    if (!fs.existsSync(inputPath)) return reply.code(404).send({ error: 'Video not found' })

    try {
      const { id, filename, filepath } = await generateSrtWithWhisper({ inputPath, language, model })
      const content = fs.readFileSync(filepath, 'utf-8')
      const entries = parseSRT(content)
      return { id, filename, entries }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Auto subtitles failed'
      return reply.code(500).send({ error: message })
    }
  })
}
