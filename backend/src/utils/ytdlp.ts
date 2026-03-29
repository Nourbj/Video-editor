import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const execAsync = promisify(exec)

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

  // Get video info first
  const infoCmd = `yt-dlp --dump-json --no-playlist "${url}"`
  let info: Record<string, unknown> = {}
  try {
    const { stdout } = await execAsync(infoCmd, { timeout: 30000 })
    info = JSON.parse(stdout)
  } catch {
    // Continue even if info fails
  }

  // Download video (max 10 minutes, best quality under 720p)
  const dlCmd = [
    'yt-dlp',
    '--no-playlist',
    '--match-filter', '"duration < 600"',
    '-f', '"bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[ext=mp4]/best"',
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
  const { stdout } = await execAsync(`yt-dlp --dump-json --no-playlist "${url}"`, { timeout: 20000 })
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
