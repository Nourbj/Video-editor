import { FastifyInstance } from 'fastify'
import { cutVideo, mergeAudio, burnSubtitles, exportVideo, getVideoMeta, cleanupTempPreviews } from '../utils/ffmpeg'
import path from 'path'
import fs from 'fs'

export async function processRoute(app: FastifyInstance) {
  // Get video metadata
  app.post('/meta', async (req, reply) => {
    const { filename } = req.body as { filename: string }
    const filepath = path.join(process.cwd(), 'uploads', filename)

    if (!fs.existsSync(filepath)) {
      // Try outputs
      const outPath = path.join(process.cwd(), 'outputs', filename)
      if (!fs.existsSync(outPath)) return reply.code(404).send({ error: 'File not found' })
    }

    try {
      const meta = await getVideoMeta(filepath)
      const video = meta.streams.find(s => s.codec_type === 'video')
      const audio = meta.streams.find(s => s.codec_type === 'audio')
      return {
        duration: meta.format.duration,
        size: meta.format.size,
        bitrate: meta.format.bit_rate,
        video: video ? {
          codec: video.codec_name,
          width: video.width,
          height: video.height,
          fps: video.r_frame_rate,
        } : null,
        audio: audio ? {
          codec: audio.codec_name,
          sampleRate: audio.sample_rate,
          channels: audio.channels,
        } : null,
      }
    } catch (err) {
      app.log.error(err)
      return reply.code(500).send({ error: 'Cannot read video metadata' })
    }
  })

  // Cut video
  app.post('/cut', async (req, reply) => {
    const { filename, startTime, endTime } = req.body as {
      filename: string
      startTime: number
      endTime: number
    }

    const inputPath = path.join(process.cwd(), 'uploads', filename)
    if (!fs.existsSync(inputPath)) return reply.code(404).send({ error: 'File not found' })

    try {
      const outPath = await cutVideo({ inputPath, startTime, endTime })
      return { url: `/outputs/${path.basename(outPath)}`, filename: path.basename(outPath) }
    } catch (err: unknown) {
      app.log.error(err)
      const message = err instanceof Error ? err.message : 'Cut failed'
      return reply.code(500).send({ error: message })
    }
  })

  // Merge audio
  app.post('/merge-audio', async (req, reply) => {
    const { videoFilename, audioFilename, volume, replaceOriginal } = req.body as {
      videoFilename: string
      audioFilename: string
      volume?: number
      replaceOriginal?: boolean
    }

    const inputPath = path.join(process.cwd(), 'uploads', videoFilename)
    const audioPath = path.join(process.cwd(), 'uploads', audioFilename)

    if (!fs.existsSync(inputPath)) return reply.code(404).send({ error: 'Video not found' })
    if (!fs.existsSync(audioPath)) return reply.code(404).send({ error: 'Audio not found' })

    try {
      const outPath = await mergeAudio({ inputPath, audioPath, volume, replaceOriginal })
      return { url: `/outputs/${path.basename(outPath)}`, filename: path.basename(outPath) }
    } catch (err: unknown) {
      app.log.error(err)
      const message = err instanceof Error ? err.message : 'Audio merge failed'
      return reply.code(500).send({ error: message })
    }
  })

  // Full export
  app.post('/export', async (req, reply) => {
    const body = req.body as {
      filename: string
      quality?: '480p' | '720p' | '1080p'
      startTime?: number
      endTime?: number
      audioFilename?: string
      audioStartTime?: number
      audioEndTime?: number
      subtitleFilename?: string
      subtitleStyle?: {
        size?: number
        color?: string
        position?: 'bottom' | 'middle' | 'top'
      }
      titleStyle?: {
        text?: string
        font?: string
        size?: number
        color?: string
        position?: 'top-left' | 'top' | 'top-right' | 'middle-left' | 'middle' | 'middle-right' | 'bottom-left' | 'bottom' | 'bottom-right'
      }
      borderStyle?: {
        enabled?: boolean
        size?: number
        color?: string
      }
      logoFilename?: string
      logoSize?: number
      logoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
      replaceOriginal?: boolean
      audioVolume?: number
    }

    const inputPath = path.join(process.cwd(), 'uploads', body.filename)
    if (!fs.existsSync(inputPath)) return reply.code(404).send({ error: 'File not found' })

    const audioPath = body.audioFilename
      ? path.join(process.cwd(), 'uploads', body.audioFilename)
      : undefined

    const subtitlePath = body.subtitleFilename
      ? path.join(process.cwd(), 'uploads', body.subtitleFilename)
      : undefined

    const logoPath = body.logoFilename
      ? path.join(process.cwd(), 'uploads', body.logoFilename)
      : undefined

    if (logoPath && !fs.existsSync(logoPath)) {
      return reply.code(404).send({ error: 'Logo image not found' })
    }

    try {
      console.log('--- POST /api/export ---')
      console.log('body:', JSON.stringify({
        filename: body.filename,
        audioFilename: body.audioFilename,
        replaceOriginal: body.replaceOriginal,
        audioVolume: body.audioVolume,
        logoFilename: body.logoFilename,
        logoSize: body.logoSize,
        logoPosition: body.logoPosition,
      }))
      const outPath = await exportVideo({
        inputPath,
        quality: body.quality || '720p',
        startTime: body.startTime,
        endTime: body.endTime,
        audioPath,
        audioStartTime: body.audioStartTime,
        audioEndTime: body.audioEndTime,
        subtitlePath,
        subtitleStyle: body.subtitleStyle,
        titleStyle: body.titleStyle,
        borderStyle: body.borderStyle,
        logoPath,
        logoSize: body.logoSize,
        logoPosition: body.logoPosition,
        replaceOriginal: body.replaceOriginal,
        audioVolume: body.audioVolume,
      })
      return { url: `/outputs/${path.basename(outPath)}`, filename: path.basename(outPath) }
    } catch (err: unknown) {
      app.log.error(err)
      const message = err instanceof Error ? err.message : 'Export failed'
      return reply.code(500).send({ error: message })
    }
  })

  // Preview (renders to temp)
  app.post('/preview', async (req, reply) => {
    const body = req.body as {
      filename: string
      quality?: '480p' | '720p' | '1080p'
      startTime?: number
      endTime?: number
      audioFilename?: string
      audioStartTime?: number
      audioEndTime?: number
      subtitleFilename?: string
      subtitleStyle?: {
        size?: number
        color?: string
        position?: 'bottom' | 'middle' | 'top'
      }
      titleStyle?: {
        text?: string
        font?: string
        size?: number
        color?: string
        position?: 'top-left' | 'top' | 'top-right' | 'middle-left' | 'middle' | 'middle-right' | 'bottom-left' | 'bottom' | 'bottom-right'
      }
      borderStyle?: {
        enabled?: boolean
        size?: number
        color?: string
      }
      logoFilename?: string
      logoSize?: number
      logoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
      replaceOriginal?: boolean
      audioVolume?: number
    }

    const inputPath = path.join(process.cwd(), 'uploads', body.filename)
    if (!fs.existsSync(inputPath)) return reply.code(404).send({ error: 'File not found' })

    const audioPath = body.audioFilename
      ? path.join(process.cwd(), 'uploads', body.audioFilename)
      : undefined

    const subtitlePath = body.subtitleFilename
      ? path.join(process.cwd(), 'uploads', body.subtitleFilename)
      : undefined

    const logoPath = body.logoFilename
      ? path.join(process.cwd(), 'uploads', body.logoFilename)
      : undefined

    if (logoPath && !fs.existsSync(logoPath)) {
      return reply.code(404).send({ error: 'Logo image not found' })
    }

    try {
      cleanupTempPreviews()
      const outPath = await exportVideo({
        inputPath,
        quality: body.quality || '720p',
        startTime: body.startTime,
        endTime: body.endTime,
        audioPath,
        audioStartTime: body.audioStartTime,
        audioEndTime: body.audioEndTime,
        subtitlePath,
        subtitleStyle: body.subtitleStyle,
        titleStyle: body.titleStyle,
        borderStyle: body.borderStyle,
        logoPath,
        logoSize: body.logoSize,
        logoPosition: body.logoPosition,
        replaceOriginal: body.replaceOriginal,
        audioVolume: body.audioVolume,
        outputDir: path.join(process.cwd(), 'temp'),
      })
      return { url: `/temp/${path.basename(outPath)}`, filename: path.basename(outPath) }
    } catch (err: unknown) {
      app.log.error(err)
      const message = err instanceof Error ? err.message : 'Preview failed'
      return reply.code(500).send({ error: message })
    }
  })
}
