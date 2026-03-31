import { FastifyInstance } from 'fastify'
import { pipeline } from 'stream/promises'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { getVideoMeta, generateThumbnail } from '../utils/ffmpeg'
import { validateCookiesFile } from '../utils/ytdlp'

export async function uploadRoute(app: FastifyInstance) {
  app.post('/upload', async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'No file uploaded' })

    const ext = path.extname(data.filename) || '.mp4'
    const id = uuidv4()
    const filename = `${id}${ext}`
    const filepath = path.join(process.cwd(), 'uploads', filename)

    await pipeline(data.file, fs.createWriteStream(filepath))

    // Get metadata
    let duration = 0
    try {
      const meta = await getVideoMeta(filepath)
      duration = meta.format.duration || 0
    } catch { /* ignore */ }

    // Generate thumbnail
    let thumbnailUrl: string | null = null
    try {
      const thumbPath = await generateThumbnail(filepath, 1)
      thumbnailUrl = `/outputs/${path.basename(thumbPath)}`
    } catch { /* optional */ }

    return {
      id,
      title: data.filename,
      duration,
      url: `/uploads/${filename}`,
      thumbnail: thumbnailUrl,
      filename,
    }
  })

  // Upload audio file
  app.post('/upload-audio', async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'No file uploaded' })

    const ext = path.extname(data.filename) || '.mp3'
    const id = uuidv4()
    const filename = `audio_${id}${ext}`
    const filepath = path.join(process.cwd(), 'uploads', filename)

    await pipeline(data.file, fs.createWriteStream(filepath))

    return {
      id,
      filename,
      url: `/uploads/${filename}`,
    }
  })

  // Upload image file (logo/watermark)
  app.post('/upload-image', async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'No file uploaded' })

    if (!data.mimetype.startsWith('image/')) {
      return reply.code(400).send({ error: 'Please upload an image file' })
    }

    const ext = path.extname(data.filename) || '.png'
    const id = uuidv4()
    const filename = `img_${id}${ext}`
    const filepath = path.join(process.cwd(), 'uploads', filename)

    await pipeline(data.file, fs.createWriteStream(filepath))

    return {
      id,
      filename,
      url: `/uploads/${filename}`,
    }
  })

  // Upload yt-dlp cookies file (public)
  app.post('/cookies/upload', async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'No file uploaded' })

    const ext = path.extname(data.filename || '').toLowerCase()
    if (ext && ext !== '.txt') {
      return reply.code(400).send({ error: 'Please upload a .txt cookies file' })
    }

    const envPath = process.env.YTDLP_COOKIES
    let targetPath = envPath
      ? envPath
      : path.join(process.cwd(), 'cookies', 'ytdlp_cookies.txt')
    if (targetPath && fs.existsSync(targetPath)) {
      try {
        const stat = fs.statSync(targetPath)
        if (stat.isDirectory()) {
          targetPath = path.join(targetPath, 'ytdlp_cookies.txt')
        }
      } catch { /* ignore */ }
    }
    if (targetPath && !path.extname(targetPath)) {
      // If env points to a directory path string
      targetPath = path.join(targetPath, 'ytdlp_cookies.txt')
    }

    const targetDir = path.dirname(targetPath)
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })

    // If targetPath is mistakenly a directory, remove it so we can write the file
    if (fs.existsSync(targetPath)) {
      try {
        const stat = fs.statSync(targetPath)
        if (stat.isDirectory()) {
          fs.rmSync(targetPath, { recursive: true, force: true })
        }
      } catch { /* ignore */ }
    }

    await pipeline(data.file, fs.createWriteStream(targetPath))

    const validationError = validateCookiesFile(targetPath)
    if (validationError) {
      try { fs.unlinkSync(targetPath) } catch { /* ignore */ }
      return reply.code(400).send({ error: validationError })
    }

    return { ok: true, path: targetPath }
  })
}
