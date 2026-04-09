import { FastifyInstance } from 'fastify'
import { cutVideo, splitVideo, mergeVideos, mergeSegments, mergeAudio, burnSubtitles, exportVideo, getVideoMeta, cleanupTempPreviews } from '../utils/ffmpeg'
import path from 'path'
import fs from 'fs'

export async function processRoute(app: FastifyInstance) {
  const resolveMediaPath = (filename: string) => {
    const candidates = [
      path.join(process.cwd(), 'uploads', filename),
      path.join(process.cwd(), 'outputs', filename),
      path.join(process.cwd(), 'temp', filename),
    ]

    return candidates.find(candidate => fs.existsSync(candidate)) || null
  }

  // Get video metadata
  app.post('/meta', async (req, reply) => {
    const { filename } = req.body as { filename: string }
    const filepath = resolveMediaPath(filename)
    if (!filepath) return reply.code(404).send({ error: 'File not found' })

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

    const inputPath = resolveMediaPath(filename)
    if (!inputPath) return reply.code(404).send({ error: 'File not found' })

    try {
      const outPath = await cutVideo({ inputPath, startTime, endTime })
      return { url: `/outputs/${path.basename(outPath)}`, filename: path.basename(outPath) }
    } catch (err: unknown) {
      app.log.error(err)
      const message = err instanceof Error ? err.message : 'Cut failed'
      return reply.code(500).send({ error: message })
    }
  })

  app.post('/split-video', async (req, reply) => {
    const { filename, segments } = req.body as {
      filename: string
      segments: { startTime: number; endTime: number; label?: string }[]
    }

    const inputPath = resolveMediaPath(filename)
    if (!inputPath) return reply.code(404).send({ error: 'File not found' })
    if (!Array.isArray(segments) || segments.length === 0) {
      return reply.code(400).send({ error: 'No segments provided' })
    }

    const invalidSegment = segments.find(segment => (
      typeof segment.startTime !== 'number'
      || typeof segment.endTime !== 'number'
      || segment.endTime <= segment.startTime
    ))
    if (invalidSegment) {
      return reply.code(400).send({ error: 'Invalid segment range' })
    }

    try {
      const outPaths = await splitVideo(inputPath, segments)
      return {
        segments: outPaths.map((outPath, index) => ({
          filename: path.basename(outPath),
          url: `/outputs/${path.basename(outPath)}`,
          label: segments[index]?.label,
        })),
      }
    } catch (err: unknown) {
      app.log.error(err)
      const message = err instanceof Error ? err.message : 'Split failed'
      return reply.code(500).send({ error: message })
    }
  })

  app.post('/merge-videos', async (req, reply) => {
    const { filenames } = req.body as { filenames: string[] }
    if (!Array.isArray(filenames) || filenames.length < 2) {
      return reply.code(400).send({ error: 'At least two segments are required' })
    }

    const inputPaths = filenames.map(resolveMediaPath)
    if (inputPaths.some(inputPath => !inputPath)) {
      return reply.code(404).send({ error: 'One or more segments were not found' })
    }

    try {
      const outPath = await mergeVideos({ inputPaths: inputPaths as string[] })
      return { url: `/outputs/${path.basename(outPath)}`, filename: path.basename(outPath) }
    } catch (err: unknown) {
      app.log.error(err)
      const message = err instanceof Error ? err.message : 'Merge failed'
      return reply.code(500).send({ error: message })
    }
  })

  app.post('/merge-segments', async (req, reply) => {
    const { filename, segments } = req.body as {
      filename: string
      segments: { startTime: number; endTime: number; label?: string }[]
    }

    const inputPath = resolveMediaPath(filename)
    if (!inputPath) return reply.code(404).send({ error: 'File not found' })
    if (!Array.isArray(segments) || segments.length < 2) {
      return reply.code(400).send({ error: 'At least two segments are required' })
    }

    const invalidSegment = segments.find(segment => (
      typeof segment.startTime !== 'number'
      || typeof segment.endTime !== 'number'
      || segment.endTime <= segment.startTime
    ))
    if (invalidSegment) {
      return reply.code(400).send({ error: 'Invalid segment range' })
    }

    try {
      const outPath = await mergeSegments({ inputPath, segments })
      return { url: `/outputs/${path.basename(outPath)}`, filename: path.basename(outPath) }
    } catch (err: unknown) {
      app.log.error(err)
      const message = err instanceof Error ? err.message : 'Merge failed'
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

    const inputPath = resolveMediaPath(videoFilename)
    const audioPath = resolveMediaPath(audioFilename)

    if (!inputPath) return reply.code(404).send({ error: 'Video not found' })
    if (!audioPath) return reply.code(404).send({ error: 'Audio not found' })

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
      aspectRatio?: 'original' | '16:9' | '9:16' | '1:1' | '4:5' | '5:4' | '4:3' | '3:2'
      outputName?: string
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
        frameMode?: 'inside' | 'outside'
        x?: number
        y?: number
      }
      borderStyle?: {
        enabled?: boolean
        sizeX?: number
        sizeY?: number
        color?: string
        mode?: 'inside' | 'outside'
      }
      logoFilename?: string
      logoSize?: number
      logoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
      replaceOriginal?: boolean
      audioVolume?: number
    }

    const inputPath = resolveMediaPath(body.filename)
    if (!inputPath) return reply.code(404).send({ error: 'File not found' })

    const audioPath = body.audioFilename
      ? resolveMediaPath(body.audioFilename) || path.join(process.cwd(), 'uploads', body.audioFilename)
      : undefined

    const subtitlePath = body.subtitleFilename
      ? resolveMediaPath(body.subtitleFilename) || path.join(process.cwd(), 'uploads', body.subtitleFilename)
      : undefined

    const logoPath = body.logoFilename
      ? resolveMediaPath(body.logoFilename) || path.join(process.cwd(), 'uploads', body.logoFilename)
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
        aspectRatio: body.aspectRatio,
        outputName: body.outputName,
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
      aspectRatio?: 'original' | '16:9' | '9:16' | '1:1' | '4:5' | '5:4' | '4:3' | '3:2'
      outputName?: string
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
        frameMode?: 'inside' | 'outside'
        x?: number
        y?: number
      }
      borderStyle?: {
        enabled?: boolean
        sizeX?: number
        sizeY?: number
        color?: string
        mode?: 'inside' | 'outside'
      }
      logoFilename?: string
      logoSize?: number
      logoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
      replaceOriginal?: boolean
      audioVolume?: number
    }

    const inputPath = resolveMediaPath(body.filename)
    if (!inputPath) return reply.code(404).send({ error: 'File not found' })

    const audioPath = body.audioFilename
      ? resolveMediaPath(body.audioFilename) || path.join(process.cwd(), 'uploads', body.audioFilename)
      : undefined

    const subtitlePath = body.subtitleFilename
      ? resolveMediaPath(body.subtitleFilename) || path.join(process.cwd(), 'uploads', body.subtitleFilename)
      : undefined

    const logoPath = body.logoFilename
      ? resolveMediaPath(body.logoFilename) || path.join(process.cwd(), 'uploads', body.logoFilename)
      : undefined

    if (logoPath && !fs.existsSync(logoPath)) {
      return reply.code(404).send({ error: 'Logo image not found' })
    }

    try {
      cleanupTempPreviews()
      const outPath = await exportVideo({
        inputPath,
        quality: body.quality || '720p',
        aspectRatio: body.aspectRatio,
        outputName: body.outputName,
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
