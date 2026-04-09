import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'

const outputDir = path.join(process.cwd(), 'outputs')
const tempDir = path.join(process.cwd(), 'temp')

export interface CutOptions {
  inputPath: string
  startTime: number   // seconds
  endTime: number     // seconds
}

export interface SegmentDefinition {
  startTime: number
  endTime: number
  label?: string
}

export interface MergeVideosOptions {
  inputPaths: string[]
}

export interface MergeSegmentsOptions {
  inputPath: string
  segments: SegmentDefinition[]
}

export interface AudioOptions {
  inputPath: string
  audioPath: string
  volume?: number     // 0-2, default 1
  replaceOriginal?: boolean
}

export interface SubtitleOptions {
  inputPath: string
  subtitlePath: string // .srt file path
  style?: SubtitleStyle
}

export interface ExportOptions {
  inputPath: string
  quality?: '480p' | '720p' | '1080p'
  aspectRatio?: 'original' | '16:9' | '9:16' | '1:1' | '4:5' | '5:4' | '4:3' | '3:2'
  outputName?: string
  audioPath?: string
  subtitlePath?: string
  subtitleStyle?: SubtitleStyle
  titleStyle?: TitleStyle
  borderStyle?: BorderStyle
  logoPath?: string
  logoSize?: number // percent of video width (5-60)
  logoX?: number
  logoY?: number
  outputDir?: string
  startTime?: number
  endTime?: number
  replaceOriginal?: boolean
  audioVolume?: number
  audioStartTime?: number
  audioEndTime?: number
}

export interface SubtitleStyle {
  size?: number
  color?: string // hex like #ffffff
  position?: 'bottom' | 'middle' | 'top'
}

export type TitlePosition =
  | 'top-left' | 'top' | 'top-right'
  | 'middle-left' | 'middle' | 'middle-right'
  | 'bottom-left' | 'bottom' | 'bottom-right'

export interface TitleStyle {
  text?: string
  font?: string
  size?: number
  color?: string // hex
  bgColor?: string // hex
  borderColor?: string // hex
  borderWidth?: number
  frameColor?: string // hex
  frameWidth?: number
  padding?: number
  position?: TitlePosition
  frameMode?: 'inside' | 'outside'
  x?: number
  y?: number
}

export interface BorderStyle {
  enabled?: boolean
  sizeX?: number
  sizeY?: number
  color?: string // hex
  mode?: 'inside' | 'outside'
}

const aspectRatioMap: Record<NonNullable<ExportOptions['aspectRatio']>, { w: number; h: number }> = {
  original: { w: 16, h: 9 },
  '16:9': { w: 16, h: 9 },
  '9:16': { w: 9, h: 16 },
  '1:1': { w: 1, h: 1 },
  '4:5': { w: 4, h: 5 },
  '5:4': { w: 5, h: 4 },
  '4:3': { w: 4, h: 3 },
  '3:2': { w: 3, h: 2 },
}

function makeEven(n: number) {
  const next = Math.max(2, Math.round(n))
  return next % 2 === 0 ? next : next - 1
}

function sanitizeBasename(name: string) {
  const cleaned = name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '_')
  return cleaned.slice(0, 80)
}

function normalizeFontName(name: string) {
  return name.toLowerCase().replace(/[\s_\-]+/g, '')
}

function resolveFontFile(fontName?: string) {
  if (!fontName) return null
  const fontsDir = path.join(process.cwd(), 'fonts')
  try {
    const target = normalizeFontName(fontName)
    const entries = fs.readdirSync(fontsDir)
    for (const file of entries) {
      const ext = path.extname(file).toLowerCase()
      if (ext !== '.ttf' && ext !== '.otf') continue
      const base = normalizeFontName(path.basename(file, ext))
      if (base === target) return path.join(fontsDir, file)
    }
  } catch {
    // ignore if fonts dir missing
  }
  return null
}

function escapeFontFile(p: string) {
  return p.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'")
}

function buildScaleFilter(quality: NonNullable<ExportOptions['quality']>, aspectRatio?: ExportOptions['aspectRatio']) {
  const scaleMap = { '480p': 854, '720p': 1280, '1080p': 1920 }
  const baseLong = scaleMap[quality]
  if (!aspectRatio || aspectRatio === 'original') {
    return `scale=${baseLong}:-2`
  }

  const { w, h } = aspectRatioMap[aspectRatio] || aspectRatioMap['16:9']
  const ratio = w / h
  let targetWidth = baseLong
  let targetHeight = baseLong
  if (ratio >= 1) {
    targetWidth = makeEven(baseLong)
    targetHeight = makeEven(baseLong / ratio)
  } else {
    targetHeight = makeEven(baseLong)
    targetWidth = makeEven(baseLong * ratio)
  }

  return `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}`
}

function toAssColor(hex?: string) {
  if (!hex) return '&Hffffff'
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return '&Hffffff'
  const r = clean.slice(0, 2)
  const g = clean.slice(2, 4)
  const b = clean.slice(4, 6)
  return `&H${b}${g}${r}`
}

function buildSubtitleStyle(style?: SubtitleStyle) {
  const defaultSize = Number(process.env.SUBTITLE_DEFAULT_SIZE || 22)
  const defaultColor = process.env.SUBTITLE_DEFAULT_COLOR || '#ffffff'
  const defaultPosition = (process.env.SUBTITLE_DEFAULT_POSITION as SubtitleStyle['position']) || 'bottom'

  const size = style?.size ?? defaultSize
  const color = toAssColor(style?.color || defaultColor)
  const position = style?.position ?? defaultPosition
  const alignment = position === 'top' ? 8 : position === 'middle' ? 5 : 2
  const marginV = position === 'top' ? 24 : position === 'middle' ? 0 : 24
  return `FontName=Arial,FontSize=${size},PrimaryColour=${color},OutlineColour=&H000000,Outline=2,Alignment=${alignment},MarginV=${marginV}`
}

function escapeDrawtext(text: string) {
  // Escape characters for FFmpeg drawtext
  return text
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
}

function buildTitleDrawtext(style?: TitleStyle, borderStyle?: BorderStyle) {
  const text = (style?.text || '').trim()
  if (!text) return null

  const font = style?.font || 'Arial'
  const fontFile = resolveFontFile(font)
  const size = clamp(Number(style?.size ?? 42), 10, 200)
  const color = style?.color || '#ffffff'
  const bgColor = style?.bgColor || '#000000'
  const borderColor = style?.borderColor || '#000000'
  const borderWidth = clamp(Number(style?.borderWidth ?? 0), 0, 20)
  const frameColor = style?.frameColor || '#000000'
  const frameWidth = clamp(Number(style?.frameWidth ?? 0), 0, 30)
  const padding = clamp(Number(style?.padding ?? (process.env.TITLE_PADDING || 8)), 0, 40)
  const position = style?.position || 'top'
  const margin = Number(process.env.TITLE_MARGIN || 36)
  const frameMode = style?.frameMode || 'inside'
  const padX = borderStyle?.mode === 'outside' ? clamp(Number(borderStyle?.sizeX ?? 0), 0, 300) : 0
  const padY = borderStyle?.mode === 'outside' ? clamp(Number(borderStyle?.sizeY ?? 0), 0, 300) : 0

  const outsideXLeft = `max((${padX}-text_w)/2,0)`
  const outsideXRight = `w-${padX}+max((${padX}-text_w)/2,0)`
  const outsideYTop = `max((${padY}-text_h)/2,0)`
  const outsideYBottom = `h-${padY}+max((${padY}-text_h)/2,0)`

  const insidePosMap: Record<TitlePosition, { x: string; y: string }> = {
    'top-left': { x: `${margin}`, y: `${margin}` },
    'top': { x: `(w-text_w)/2`, y: `${margin}` },
    'top-right': { x: `w-text_w-${margin}`, y: `${margin}` },
    'middle-left': { x: `${margin}`, y: `(h-text_h)/2` },
    'middle': { x: `(w-text_w)/2`, y: `(h-text_h)/2` },
    'middle-right': { x: `w-text_w-${margin}`, y: `(h-text_h)/2` },
    'bottom-left': { x: `${margin}`, y: `h-text_h-${margin}` },
    'bottom': { x: `(w-text_w)/2`, y: `h-text_h-${margin}` },
    'bottom-right': { x: `w-text_w-${margin}`, y: `h-text_h-${margin}` },
  }

  const outsidePosMap: Record<TitlePosition, { x: string; y: string }> = {
    'top-left': { x: outsideXLeft, y: outsideYTop },
    'top': { x: `(w-text_w)/2`, y: outsideYTop },
    'top-right': { x: outsideXRight, y: outsideYTop },
    'middle-left': { x: outsideXLeft, y: `(h-text_h)/2` },
    'middle': { x: `(w-text_w)/2`, y: `(h-text_h)/2` },
    'middle-right': { x: outsideXRight, y: `(h-text_h)/2` },
    'bottom-left': { x: outsideXLeft, y: outsideYBottom },
    'bottom': { x: `(w-text_w)/2`, y: outsideYBottom },
    'bottom-right': { x: outsideXRight, y: outsideYBottom },
  }

  if (typeof style?.x === 'number' && typeof style?.y === 'number') {
    const safeX = clamp(style.x, 0, 1)
    const safeY = clamp(style.y, 0, 1)
    const x = `(${safeX}*w-text_w/2)`
    const y = `(${safeY}*h-text_h/2)`
    const safeText = escapeDrawtext(text)
    const safeFont = font.includes(' ') ? `'${font.replace(/'/g, "\\'")}'` : font
    const fontArg = fontFile ? `fontfile='${escapeFontFile(fontFile)}'` : `font=${safeFont}`
    const base = `drawtext=text='${safeText}':${fontArg}:fontsize=${size}:fontcolor=${color}:x=${x}:y=${y}:box=1:boxcolor=${bgColor}@0.6:boxborderw=${padding}:borderw=${borderWidth}:bordercolor=${borderColor}`
    if (frameWidth <= 0) return base
    const frameLayer = `drawtext=text='${safeText}':${fontArg}:fontsize=${size}:fontcolor=${color}@0:x=${x}:y=${y}:box=1:boxcolor=${frameColor}@1:boxborderw=${padding + frameWidth}:borderw=0`
    return `${frameLayer},${base}`
  }

  const normalizedPosition = frameMode === 'outside'
    ? (position.startsWith('top')
        ? 'top'
        : position.startsWith('bottom')
          ? 'bottom'
          : 'middle')
    : position

  const posMap = frameMode === 'outside' ? outsidePosMap : insidePosMap
  const { x, y } = posMap[normalizedPosition as TitlePosition]
  const safeText = escapeDrawtext(text)

  const safeFont = font.includes(' ') ? `'${font.replace(/'/g, "\\'")}'` : font
  const fontArg = fontFile ? `fontfile='${escapeFontFile(fontFile)}'` : `font=${safeFont}`
  const base = `drawtext=text='${safeText}':${fontArg}:fontsize=${size}:fontcolor=${color}:x=${x}:y=${y}:box=1:boxcolor=${bgColor}@0.6:boxborderw=${padding}:borderw=${borderWidth}:bordercolor=${borderColor}`
  if (frameWidth <= 0) return base
  const frameLayer = `drawtext=text='${safeText}':${fontArg}:fontsize=${size}:fontcolor=${color}@0:x=${x}:y=${y}:box=1:boxcolor=${frameColor}@1:boxborderw=${padding + frameWidth}:borderw=0`
  return `${frameLayer},${base}`
}

function buildBorderFilter(style?: BorderStyle) {
  if (!style?.enabled) return null
  const sizeX = clamp(Number(style.sizeX ?? 0), 0, 300)
  const sizeY = clamp(Number(style.sizeY ?? 0), 0, 300)
  if (sizeX <= 0 && sizeY <= 0) return null
  const color = style.color || '#ffffff'
  const mode = style.mode || 'inside'
  if (mode === 'outside') {
    return `pad=iw+${sizeX * 2}:ih+${sizeY * 2}:${sizeX}:${sizeY}:color=${color}`
  }
  // Crop edges, then pad back to original size
  const sx = sizeX
  const sy = sizeY
  const safeX = `min(${sx}\\,max(iw/2-2\\,0))`
  const safeY = `min(${sy}\\,max(ih/2-2\\,0))`
  return `crop=iw-2*${safeX}:ih-2*${safeY}:${safeX}:${safeY},pad=iw+${sx * 2}:ih+${sy * 2}:${sx}:${sy}:color=${color}`
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function buildLogoOverlayFilters(params: {
  logoInputIndex: number
  baseLabel: string
  size?: number
  x?: number
  y?: number
}) {
  const sizePct = clamp(params.size ?? 15, 5, 60)

  const logoIn = `[${params.logoInputIndex}:v]`
  const x = `((${clamp(params.x ?? 0.9, 0, 1)}*main_w)-(overlay_w/2))`
  const y = `((${clamp(params.y ?? 0.1, 0, 1)}*main_h)-(overlay_h/2))`

  return [
    `${logoIn}format=rgba[logo]`,
    `[logo][${params.baseLabel}]scale2ref=w=main_w*${sizePct}/100:h=-1[logo_s][vref]`,
    `[vref][logo_s]overlay=${x}:${y}:shortest=1[vout]`,
  ]
}

// Get video metadata
export function getVideoMeta(inputPath: string): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) {
        if ((err as any).code === 'ENOENT') {
          reject(new Error('ffprobe not found on system. Please install ffmpeg or use docker-compose.'))
        } else {
          reject(err)
        }
      }
      else resolve(data)
    })
  })
}

// Cut video between start and end
export function cutVideo({ inputPath, startTime, endTime }: CutOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const outFile = path.join(outputDir, `cut_${uuidv4()}.mp4`)
    const duration = endTime - startTime

    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(['-avoid_negative_ts', 'make_zero'])
      .output(outFile)
      .on('end', () => resolve(outFile))
      .on('error', reject)
      .run()
  })
}

export async function splitVideo(inputPath: string, segments: SegmentDefinition[]): Promise<string[]> {
  const outputs: string[] = []
  for (const segment of segments) {
    const outPath = await cutVideo({
      inputPath,
      startTime: segment.startTime,
      endTime: segment.endTime,
    })
    outputs.push(outPath)
  }
  return outputs
}

export function mergeVideos({ inputPaths }: MergeVideosOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!inputPaths.length) {
      reject(new Error('No segments provided for merge'))
      return
    }

    const listFile = path.join(tempDir, `concat_${uuidv4()}.txt`)
    const outFile = path.join(outputDir, `merge_${uuidv4()}.mp4`)
    const fileList = inputPaths
      .map(filePath => `file '${filePath.replace(/'/g, "'\\''").replace(/\\/g, '/')}'`)
      .join('\n')

    fs.writeFileSync(listFile, fileList, 'utf8')

    ffmpeg()
      .input(listFile)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c copy'])
      .output(outFile)
      .on('end', () => {
        try {
          fs.unlinkSync(listFile)
        } catch {
          // ignore cleanup error
        }
        resolve(outFile)
      })
      .on('error', (err) => {
        try {
          fs.unlinkSync(listFile)
        } catch {
          // ignore cleanup error
        }
        reject(err)
      })
      .run()
  })
}

export async function mergeSegments({ inputPath, segments }: MergeSegmentsOptions): Promise<string> {
  if (!segments.length) {
    throw new Error('No segments provided for merge')
  }
  const outputs = await splitVideo(inputPath, segments)
  return mergeVideos({ inputPaths: outputs })
}

// Add / replace audio track
export function mergeAudio({ inputPath, audioPath, volume = 1, replaceOriginal = false }: AudioOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const outFile = path.join(outputDir, `audio_${uuidv4()}.mp4`)

    const cmd = ffmpeg(inputPath).input(audioPath)

    if (replaceOriginal) {
      cmd
        .outputOptions([
          '-map 0:v:0',
          '-map 1:a:0',
          `-filter:a volume=${volume}`,
          '-c:v copy',
          '-c:a aac',
          '-shortest',
        ])
    } else {
      // Mix original audio with new audio
      cmd.complexFilter([
        `[0:a]volume=1[a0]`,
        `[1:a]volume=${volume}[a1]`,
        `[a0][a1]amix=inputs=2:duration=first[aout]`,
      ], 'aout')
        .outputOptions(['-map 0:v', '-c:v copy', '-c:a aac'])
    }

    cmd
      .output(outFile)
      .on('end', () => resolve(outFile))
      .on('error', reject)
      .run()
  })
}

// Burn subtitles into video
export function burnSubtitles({ inputPath, subtitlePath, style }: SubtitleOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const outFile = path.join(outputDir, `sub_${uuidv4()}.mp4`)
    // Escape path for FFmpeg filter
    const escapedSrt = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:')
    const forceStyle = buildSubtitleStyle(style)

    ffmpeg(inputPath)
      .videoFilter(`subtitles='${escapedSrt}':force_style='${forceStyle}'`)
      .videoCodec('libx264')
      .audioCodec('copy')
      .output(outFile)
      .on('end', () => resolve(outFile))
      .on('error', reject)
      .run()
  })
}

// Full export pipeline: cut + audio + subtitles + quality
export function exportVideo(options: ExportOptions, onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const outDir = options.outputDir || outputDir
    const baseName = options.outputName ? sanitizeBasename(options.outputName) : ''
    const initialName = baseName ? `${baseName}.mp4` : `export_${uuidv4()}.mp4`
    let outFile = path.join(outDir, initialName)
    if (fs.existsSync(outFile)) {
      const fallback = baseName ? `${baseName}_${uuidv4()}.mp4` : `export_${uuidv4()}.mp4`
      outFile = path.join(outDir, fallback)
    }
    const {
      inputPath,
      quality = '720p',
      aspectRatio,
      startTime,
      endTime,
      audioPath,
      subtitlePath,
      replaceOriginal,
      audioVolume,
      audioStartTime,
      audioEndTime,
      titleStyle,
      borderStyle,
      logoPath,
      logoSize,
      logoX,
      logoY,
    } = options

    console.log('[exportVideo] options:', {
      quality,
      aspectRatio,
      audioPath: !!audioPath,
      replaceOriginal,
      audioVolume,
      logoPath: !!logoPath,
      logoX,
      logoY,
    })

    const scaleFilter = buildScaleFilter(quality, aspectRatio)
    const vol = audioVolume ?? 1

    let cmd = ffmpeg(inputPath)

    if (startTime !== undefined && endTime !== undefined) {
      cmd = cmd.setStartTime(startTime).setDuration(endTime - startTime)
    }

    const crf = process.env.FFMPEG_CRF || '23'
    const preset = process.env.FFMPEG_PRESET || 'fast'
    cmd.videoCodec('libx264')
    cmd.addOption('-crf', crf)
    cmd.addOption('-preset', preset)

    const hasAudio = !!(audioPath && fs.existsSync(audioPath))
    const hasLogo = !!(logoPath && fs.existsSync(logoPath))
    const titleFilter = buildTitleDrawtext(titleStyle, borderStyle)
    const borderFilter = buildBorderFilter(borderStyle)
    const hasAudioTrim = audioStartTime !== undefined && audioEndTime !== undefined && audioEndTime > audioStartTime
    const audioTrimFilter = hasAudioTrim ? `atrim=start=${audioStartTime}:end=${audioEndTime},asetpts=PTS-STARTPTS` : null

    if (hasAudio) cmd.input(audioPath!)
    if (hasLogo) cmd.input(logoPath!).inputOptions(['-loop 1'])

    const subtitleFilter = subtitlePath && fs.existsSync(subtitlePath)
      ? (() => {
        const escapedSrt = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:')
        const forceStyle = buildSubtitleStyle(options.subtitleStyle)
        return `,subtitles='${escapedSrt}':force_style='${forceStyle}'`
      })()
      : ''

    if (hasAudio || hasLogo) {
      const filters: string[] = []
      const baseLabel = hasLogo ? 'vbase' : 'vout'
      const vfParts: string[] = [scaleFilter]
      if (borderFilter) vfParts.push(borderFilter)
      if (subtitleFilter) vfParts.push(subtitleFilter.slice(1))
      if (titleFilter) vfParts.push(titleFilter)
      filters.push(`[0:v]${vfParts.join(',')}[${baseLabel}]`)

      if (hasLogo) {
        const logoInputIndex = hasAudio ? 2 : 1
        filters.push(...buildLogoOverlayFilters({
          logoInputIndex,
          baseLabel,
          size: logoSize,
          x: options.logoX,
          y: options.logoY,
        }))
      }

      if (hasAudio) {
        if (replaceOriginal) {
          const chain = `${hasAudioTrim ? `${audioTrimFilter},` : ''}volume=${vol}`
          filters.push(`[1:a]${chain}[aout]`)
          cmd.outputOptions(['-map [vout]', '-map [aout]', '-c:a aac'])
        } else {
          filters.push(`[0:a]volume=1[a0]`)
          const chain = `${hasAudioTrim ? `${audioTrimFilter},` : ''}volume=${vol}`
          filters.push(`[1:a]${chain}[a1]`)
          filters.push(`[a0][a1]amix=inputs=2:duration=first[aout]`)
          cmd.outputOptions(['-map [vout]', '-map [aout]', '-c:a aac'])
        }
      } else {
        // Keep original audio when present
        cmd.outputOptions(['-map [vout]', '-map 0:a?', '-c:a aac'])
      }

      cmd.complexFilter(filters)
    } else {
      // No new audio or logo — use simple videoFilter
      const filters: string[] = [scaleFilter]
      if (borderFilter) filters.push(borderFilter)
      if (subtitleFilter) filters.push(subtitleFilter.slice(1))
      if (titleFilter) filters.push(titleFilter)
      cmd.videoFilter(filters)
      cmd.audioCodec('aac')
    }

    cmd
      .output(outFile)
      .on('progress', p => onProgress?.(Math.round(p.percent || 0)))
      .on('end', () => resolve(outFile))
      .on('error', reject)
      .run()
  })
}

// Generate thumbnail
export function generateThumbnail(inputPath: string, atSecond = 1): Promise<string> {
  return new Promise((resolve, reject) => {
    const outFile = path.join(outputDir, `thumb_${uuidv4()}.jpg`)
    ffmpeg(inputPath)
      .screenshots({ timestamps: [atSecond], filename: path.basename(outFile), folder: path.dirname(outFile), size: '640x?' })
      .on('end', () => resolve(outFile))
      .on('error', reject)
  })
}

// Generate waveform data for audio visualization
export function getWaveformData(inputPath: string, samples = 200): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(tempDir, `wave_${uuidv4()}.raw`)
    ffmpeg(inputPath)
      .audioChannels(1)
      .audioFrequency(8000)
      .format('s16le')
      .output(tempFile)
      .on('end', () => {
        try {
          const buf = fs.readFileSync(tempFile)
          const data: number[] = []
          const step = Math.floor(buf.length / 2 / samples)
          for (let i = 0; i < samples; i++) {
            const offset = i * step * 2
            const val = Math.abs(buf.readInt16LE(offset)) / 32768
            data.push(Math.round(val * 100) / 100)
          }
          fs.unlinkSync(tempFile)
          resolve(data)
        } catch (e) {
          reject(e)
        }
      })
      .on('error', reject)
      .run()
  })
}

export function checkFfmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err) => {
      resolve(!err)
    })
  })
}

export function checkFfprobe(): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe('', (err) => {
      // ffprobe will error with empty input, but if it's found it returns a specific error
      // if not found, it returns "spawn ffprobe ENOENT"
      if (err && (err as any).code === 'ENOENT') {
        resolve(false)
      } else {
        resolve(true)
      }
    })
  })
}

export function cleanupTempPreviews(maxAgeMs?: number): void {
  const ageMs = maxAgeMs ?? Number(process.env.PREVIEW_TTL_MS || 60 * 60 * 1000)
  const now = Date.now()
  try {
    const files = fs.readdirSync(tempDir)
    for (const f of files) {
      if (!f.startsWith('export_') || !f.endsWith('.mp4')) continue
      const fp = path.join(tempDir, f)
      try {
        const stat = fs.statSync(fp)
        if (now - stat.mtimeMs > ageMs) fs.unlinkSync(fp)
      } catch {
        // ignore per-file errors
      }
    }
  } catch {
    // ignore cleanup errors
  }
}
