import { FastifyInstance } from 'fastify'
import { pipeline } from 'stream/promises'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { getVideoMeta, generateThumbnail } from '../utils/ffmpeg'

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
}
