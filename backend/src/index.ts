import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import path from 'path'
import fs from 'fs'
import { downloadRoute } from './routes/download'
import { processRoute } from './routes/process'
import { subtitleRoute } from './routes/subtitles'
import { uploadRoute } from './routes/upload'
import { checkYtdlp } from './utils/ytdlp'
import { checkFfmpeg, checkFfprobe } from './utils/ffmpeg'

const app = Fastify({ logger: true })

async function checkDependencies() {
  const ytdlpOk = await checkYtdlp()
  const ffmpegOk = await checkFfmpeg()
  const ffprobeOk = await checkFfprobe()

  if (!ytdlpOk) app.log.warn('⚠️ yt-dlp not found! Video downloads will fail.')
  if (!ffmpegOk) app.log.warn('⚠️ ffmpeg not found! Video processing will fail.')
  if (!ffprobeOk) app.log.warn('⚠️ ffprobe not found! Metadata extraction will fail.')
  
  if (!ytdlpOk || !ffmpegOk || !ffprobeOk) {
    app.log.warn('Please install missing dependencies or run with docker-compose.')
  }
}

// Ensure directories exist
const dirs = ['uploads', 'outputs', 'temp']
dirs.forEach(d => {
  const p = path.join(process.cwd(), d)
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
})

app.register(cors, { origin: '*' })
app.register(multipart, { limits: { fileSize: 500 * 1024 * 1024 } }) // 500MB

app.register(swagger, {
  openapi: {
    info: {
      title: 'Video Editor API',
      version: '1.0.0',
    },
  },
})

app.register(swaggerUi, {
  routePrefix: '/docs',
})

app.register(staticFiles, {
  root: path.join(process.cwd(), 'outputs'),
  prefix: '/outputs/',
})

app.register(staticFiles, {
  root: path.join(process.cwd(), 'uploads'),
  prefix: '/uploads/',
  decorateReply: false,
})

// Health check
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

// Routes
app.register(downloadRoute, { prefix: '/api' })
app.register(processRoute, { prefix: '/api' })
app.register(subtitleRoute, { prefix: '/api' })
app.register(uploadRoute, { prefix: '/api' })

const start = async () => {
  try {
    await checkDependencies()
    await app.listen({ port: 3001, host: '0.0.0.0' })
    console.log('🚀 Backend running on http://localhost:3001')
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
