import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const execAsync = promisify(exec)
const USER_AGENT =
  process.env.YTDLP_USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

export interface DownloadResult {
  id: string
  filename: string
  filepath: string
  title: string
  duration: number
  thumbnail?: string
  url: string
}

export async function downloadVideo(url: string): Promise<DownloadResult> {
  const id = uuidv4()
  const outputDir = path.join(process.cwd(), 'uploads')
  const outputTemplate = path.join(outputDir, `${id}.%(ext)s`)
  const jsRuntime = process.env.YTDLP_JS_RUNTIME || 'node'

  // Get video info first
  const infoCmd = `yt-dlp --dump-json --no-playlist --js-runtimes ${jsRuntime} "${url}"`
  let info: Record<string, unknown> = {}
  try {
    const { stdout } = await execAsync(infoCmd, { timeout: 30000 })
    info = JSON.parse(stdout)
  } catch {
    // Continue even if info fails
  }

  // Download video (max 10 minutes, best quality under 720p)
  const maxDuration = Number(process.env.YTDLP_MAX_DURATION_SEC || 600)
  const format = process.env.YTDLP_FORMAT ||
    'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[ext=mp4]/best'

  const dlCmd = [
    'yt-dlp',
    '--no-playlist',
    '--js-runtimes', jsRuntime,
    '--match-filter', `"duration < ${maxDuration}"`,
    '-f', `"${format}"`,
    '--merge-output-format', 'mp4',
    '-o', `"${outputTemplate}"`,
    `"${url}"`
  ].join(' ')

  try {
    await execAsync(dlCmd, { timeout: 120000 })
  } catch (err: any) {
    if (err.code === 'ENOENT' || err.message.includes('not recognized')) {
      throw new Error('yt-dlp not found on system. Please install it or use docker-compose.')
    }
    const stderr = String(err.stderr || '')
    if (
      stderr.includes('Unsupported URL') ||
      stderr.includes('login.php') ||
      stderr.toLowerCase().includes('private') ||
      stderr.toLowerCase().includes('sign in')
    ) {
      throw new Error('Unsupported or private URL. Please use a public video/reel link.')
    }
    throw err
  }

  // Find downloaded file
  const files = fs.readdirSync(outputDir).filter(f => f.startsWith(id))
  if (files.length === 0) throw new Error('Download failed: no file produced')

  const filename = files[0]
  const filepath = path.join(outputDir, filename)

  return {
    id,
    filename,
    filepath,
    title: (info.title as string) || filename,
    duration: (info.duration as number) || 0,
    thumbnail: info.thumbnail as string | undefined,
    url: `/uploads/${filename}`,
  }
}

export async function getVideoInfo(url: string): Promise<Record<string, unknown>> {
  const jsRuntime = process.env.YTDLP_JS_RUNTIME || 'node'
  const { stdout } = await execAsync(`yt-dlp --dump-json --no-playlist --js-runtimes ${jsRuntime} "${url}"`, { timeout: 20000 })
  return JSON.parse(stdout)
}

export async function checkYtdlp(): Promise<boolean> {
  try {
    await execAsync('yt-dlp --version')
    return true
  } catch {
    return false
  }
}
export async function downloadAudio(url: string): Promise<{ id: string; filename: string; url: string }> {
  const id = uuidv4()
  const outputDir = path.join(process.cwd(), 'uploads')
  const outputTemplate = path.join(outputDir, `audio_${id}.%(ext)s`)
  const jsRuntime = process.env.YTDLP_JS_RUNTIME || 'node'

  const dlCmd = [
    'yt-dlp',
    '--no-playlist',
    '--js-runtimes', jsRuntime,
    '--user-agent', `"${USER_AGENT}"`,
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '0',
    '-o', `"${outputTemplate}"`,
    `"${url}"`
  ].join(' ')

  try {
    await execAsync(dlCmd, { timeout: 120000 })
  } catch (err: any) {
    if (err.code === 'ENOENT' || err.message.includes('not recognized')) {
      throw new Error('yt-dlp not found on system.')
    }
    const stderr = String(err.stderr || '')
    if (stderr.includes('Unsupported URL') || stderr.toLowerCase().includes('private')) {
      throw new Error('Unsupported or private URL.')
    }
    throw err
  }

  const files = fs.readdirSync(outputDir).filter(f => f.startsWith(`audio_${id}`))
  if (files.length === 0) throw new Error('Audio download failed: no file produced')

  const filename = files[0]
  return { id, filename, url: `/uploads/${filename}` }
}
