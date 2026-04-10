import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const execAsync = promisify(exec)
const USER_AGENT =
  process.env.YTDLP_USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

export function validateCookiesFile(filePath: string): string | null {
  try {
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      return `Cookies path is a directory, expected a file: ${filePath}`
    }
    const buf = fs.readFileSync(filePath)
    const text = buf.toString('utf8')
    const firstLine = text.split(/\r?\n/, 1)[0]?.trim() || ''
    const okHeader = firstLine === '# Netscape HTTP Cookie File' || firstLine === '# HTTP Cookie File'
    if (!okHeader) {
      return 'Invalid cookies file format. First line must be "# Netscape HTTP Cookie File".'
    }
    if (text.includes('\r') && !text.includes('\r\n')) {
      return 'Invalid cookies file newlines. Please use standard CRLF (Windows) or LF (Linux/macOS).'
    }
    return null
  } catch (e: any) {
    return `Cannot read cookies file: ${e?.message || 'unknown error'}`
  }
}

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
  const ytdlpTimeoutMs = Number(process.env.YTDLP_TIMEOUT_MS || 15 * 60 * 1000)
  let cookiesPath = process.env.YTDLP_COOKIES || ''
  if (cookiesPath && fs.existsSync(cookiesPath) && fs.statSync(cookiesPath).isDirectory()) {
    cookiesPath = path.join(cookiesPath, 'ytdlp_cookies.txt')
  }
  const hasCookies = cookiesPath && fs.existsSync(cookiesPath)
  const cookiesFromBrowser = process.env.YTDLP_COOKIES_FROM_BROWSER || ''
  const debug = String(process.env.YTDLP_DEBUG || '').toLowerCase() === 'true'

  if (hasCookies) {
    const cookiesError = validateCookiesFile(cookiesPath)
    if (cookiesError) throw new Error(cookiesError)
  }

  // Get video info first
  const cookiesFlags = hasCookies
    ? [`--cookies "${cookiesPath}"`]
    : cookiesFromBrowser
      ? [`--cookies-from-browser ${cookiesFromBrowser}`]
      : []

  const infoCmd = [
    'yt-dlp',
    '--dump-json',
    '--no-playlist',
    '--js-runtimes', jsRuntime,
    '--user-agent', `"${USER_AGENT}"`,
    '--geo-bypass',
    ...cookiesFlags,
    `"${url}"`
  ].filter(Boolean).join(' ')
  let info: Record<string, unknown> = {}
  try {
    const { stdout } = await execAsync(infoCmd, { timeout: 30000 })
    info = JSON.parse(stdout)
  } catch {
    // Continue even if info fails
  }

  // Download video in the best available compatible format under 720p
  const format = process.env.YTDLP_FORMAT ||
    'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[ext=mp4]/best'

  const dlCmd = [
    'yt-dlp',
    '--no-playlist',
    '--js-runtimes', jsRuntime,
    '--user-agent', `"${USER_AGENT}"`,
    '--geo-bypass',
    ...cookiesFlags,
    '-f', `"${format}"`,
    '--merge-output-format', 'mp4',
    '-o', `"${outputTemplate}"`,
    `"${url}"`
  ].join(' ')

  try {
    await execAsync(dlCmd, { timeout: ytdlpTimeoutMs })
  } catch (err: any) {
    if (err.code === 'ENOENT' || err.message.includes('not recognized')) {
      throw new Error('yt-dlp not found on system. Please install it or use docker-compose.')
    }
    const isTimeout =
      err.code === 'ETIMEDOUT' ||
      err.killed === true ||
      err.signal === 'SIGTERM' ||
      String(err.message || '').toLowerCase().includes('timed out')
    if (isTimeout) {
      const seconds = Math.max(1, Math.round(ytdlpTimeoutMs / 1000))
      throw new Error(
        `yt-dlp timed out after ${seconds}s. Try again or increase YTDLP_TIMEOUT_MS for large/slow downloads.`
      )
    }
    const stderr = String(err.stderr || '')
    const stdout = String(err.stdout || '')
    const combined = `${stderr}\n${stdout}`
    if (combined.trim()) {
      console.error('[yt-dlp] download error:', combined.slice(0, 2000))
    }
    const combinedLower = combined.toLowerCase()
    if (combinedLower.includes('cookies') || combinedLower.includes('cookie')) {
      const baseMsg = 'Invalid cookies file. Please export cookies in Netscape format (first line must be "# Netscape HTTP Cookie File").'
      const detail = debug && combined ? ` | ytdlp: ${combined.slice(0, 800)}` : ''
      throw new Error(`${baseMsg}${detail}`)
    }
    if (
      combined.includes('Unsupported URL') ||
      combined.includes('login.php') ||
      combinedLower.includes('private') ||
      combinedLower.includes('sign in') ||
      combinedLower.includes('confirm you') ||
      combinedLower.includes('not available')
    ) {
      const baseMsg = 'Video is unavailable or requires sign-in. If this is a public video, try again or provide cookies via YTDLP_COOKIES or YTDLP_COOKIES_FROM_BROWSER.'
      const detail = debug && combined ? ` | ytdlp: ${combined.slice(0, 800)}` : ''
      throw new Error(`${baseMsg}${detail}`)
    }
    if (debug && combined) {
      throw new Error(`yt-dlp error: ${combined.slice(0, 800)}`)
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
  let cookiesPath = process.env.YTDLP_COOKIES || ''
  if (cookiesPath && fs.existsSync(cookiesPath) && fs.statSync(cookiesPath).isDirectory()) {
    cookiesPath = path.join(cookiesPath, 'ytdlp_cookies.txt')
  }
  const hasCookies = cookiesPath && fs.existsSync(cookiesPath)
  const cookiesFromBrowser = process.env.YTDLP_COOKIES_FROM_BROWSER || ''
  const debug = String(process.env.YTDLP_DEBUG || '').toLowerCase() === 'true'
  if (hasCookies) {
    const cookiesError = validateCookiesFile(cookiesPath)
    if (cookiesError) throw new Error(cookiesError)
  }
  const cmd = [
    'yt-dlp',
    '--dump-json',
    '--no-playlist',
    '--js-runtimes', jsRuntime,
    '--user-agent', `"${USER_AGENT}"`,
    '--geo-bypass',
    ...(hasCookies
      ? [`--cookies "${cookiesPath}"`]
      : cookiesFromBrowser
        ? [`--cookies-from-browser ${cookiesFromBrowser}`]
        : []),
    `"${url}"`
  ].filter(Boolean).join(' ')
  try {
    const { stdout } = await execAsync(cmd, { timeout: 20000 })
    return JSON.parse(stdout)
  } catch (err: any) {
    const stderr = String(err.stderr || '')
    const stdout = String(err.stdout || '')
    const combined = `${stderr}\n${stdout}`
    if (debug && combined) {
      throw new Error(`yt-dlp info error: ${combined.slice(0, 800)}`)
    }
    throw err
  }
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
  const ytdlpTimeoutMs = Number(process.env.YTDLP_TIMEOUT_MS || 15 * 60 * 1000)

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
    await execAsync(dlCmd, { timeout: ytdlpTimeoutMs })
  } catch (err: any) {
    if (err.code === 'ENOENT' || err.message.includes('not recognized')) {
      throw new Error('yt-dlp not found on system.')
    }
    const isTimeout =
      err.code === 'ETIMEDOUT' ||
      err.killed === true ||
      err.signal === 'SIGTERM' ||
      String(err.message || '').toLowerCase().includes('timed out')
    if (isTimeout) {
      const seconds = Math.max(1, Math.round(ytdlpTimeoutMs / 1000))
      throw new Error(
        `yt-dlp timed out after ${seconds}s. Try again or increase YTDLP_TIMEOUT_MS for large/slow downloads.`
      )
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
