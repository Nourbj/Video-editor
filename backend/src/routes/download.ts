import { FastifyInstance } from 'fastify'
import { downloadVideo, getVideoInfo } from '../utils/ytdlp'
import { getVideoMeta, generateThumbnail } from '../utils/ffmpeg'
import path from 'path'

export async function downloadRoute(app: FastifyInstance) {
  // Check video info before download
  app.post('/info', async (req, reply) => {
    const { url } = req.body as { url: string }
    if (!url) return reply.code(400).send({ error: 'URL required' })

    try {
      const info = await getVideoInfo(url)
      return {
        title: info.title,
        duration: info.duration,
        thumbnail: info.thumbnail,
        uploader: info.uploader,
        platform: info.extractor,
      }
    } catch (err) {
      return reply.code(400).send({ error: 'Cannot fetch video info. Check the URL.' })
    }
  })

  // Download video from URL
  app.post('/download', async (req, reply) => {
    const { url } = req.body as { url: string }
    if (!url) return reply.code(400).send({ error: 'URL required' })

    // Validate URL is from supported platform
    const supportedDomains = ['youtube.com', 'youtu.be', 'instagram.com', 'facebook.com', 'fb.com', 'tiktok.com']
    const isSupported = supportedDomains.some(d => url.includes(d))
    if (!isSupported) {
      return reply.code(400).send({ error: 'Unsupported platform. Supported: YouTube, Instagram, Facebook, TikTok' })
    }

    try {
      const result = await downloadVideo(url)

      // Get metadata
      let duration = result.duration
      try {
        const meta = await getVideoMeta(result.filepath)
        duration = meta.format.duration || duration
      } catch { /* use yt-dlp duration */ }

      // Generate thumbnail
      let thumbnailUrl: string | null = null
      try {
        const thumbPath = await generateThumbnail(result.filepath, 2)
        thumbnailUrl = `/outputs/${path.basename(thumbPath)}`
      } catch { /* thumbnail optional */ }

      return {
        id: result.id,
        title: result.title,
        duration,
        url: result.url,
        thumbnail: thumbnailUrl || result.thumbnail,
        filename: result.filename,
      }
    } catch (err: unknown) {
      app.log.error(err)
      const message = err instanceof Error ? err.message : 'Download failed'
      const isClientError = message.toLowerCase().includes('unsupported') || message.toLowerCase().includes('private')
      return reply.code(isClientError ? 400 : 500).send({ error: message })
    }
  })
}
