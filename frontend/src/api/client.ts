import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' })

export interface VideoInfo {
  id: string
  title: string
  duration: number
  url: string
  thumbnail?: string
  filename: string
}

export interface SubtitleEntry {
  index: number
  startTime: string
  endTime: string
  text: string
}

export interface SubtitleStyle {
  size: number
  color: string
  position: 'bottom' | 'middle' | 'top'
}

// Download video from URL
export const downloadFromUrl = async (url: string): Promise<VideoInfo> => {
  const { data } = await api.post('/download', { url })
  return data
}

// Get video info without downloading
export const getVideoInfo = async (url: string) => {
  const { data } = await api.post('/info', { url })
  return data
}

// Upload video file
export const uploadVideo = async (file: File, onProgress?: (pct: number) => void): Promise<VideoInfo> => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress?.(Math.round((e.loaded * 100) / (e.total || 1))),
  })
  return data
}

// Upload audio file
export const uploadAudio = async (file: File): Promise<{ id: string; filename: string; url: string }> => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/upload-audio', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// Upload image file (logo/watermark)
export const uploadImage = async (file: File): Promise<{ id: string; filename: string; url: string }> => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/upload-image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// Download audio from URL (YouTube, etc.)
export const downloadAudioFromUrl = async (url: string): Promise<{ id: string; filename: string; url: string }> => {
  const { data } = await api.post('/download-audio', { url })
  return data
}

// Cut video
export const cutVideo = async (filename: string, startTime: number, endTime: number) => {
  const { data } = await api.post('/cut', { filename, startTime, endTime })
  return data as { url: string; filename: string }
}

// Merge audio
export const mergeAudio = async (
  videoFilename: string,
  audioFilename: string,
  volume = 1,
  replaceOriginal = false
) => {
  const { data } = await api.post('/merge-audio', { videoFilename, audioFilename, volume, replaceOriginal })
  return data as { url: string; filename: string }
}

// Create subtitle file from entries
export const createSubtitles = async (entries: SubtitleEntry[]) => {
  const { data } = await api.post('/subtitle/create', { entries })
  return data as { id: string; filename: string; url: string }
}

// Upload SRT file
export const uploadSubtitle = async (file: File) => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/subtitle/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data as { id: string; filename: string; entries: SubtitleEntry[] }
}

// Auto-generate subtitles from video using local whisper
export const autoSubtitles = async (params: {
  videoFilename: string
  language?: string
  model?: 'tiny' | 'base' | 'small' | 'medium' | 'large' | 'large-v2' | 'large-v3' | 'large-v3-turbo'
}) => {
  const { data } = await api.post('/subtitle/auto', params)
  return data as { id: string; filename: string; entries: SubtitleEntry[] }
}

// Burn subtitles
export const burnSubtitles = async (videoFilename: string, subtitleFilename: string, style?: SubtitleStyle) => {
  const { data } = await api.post('/subtitle/burn', { videoFilename, subtitleFilename, style })
  return data as { url: string; filename: string }
}

// Full export
export const exportVideo = async (params: {
  filename: string
  quality: '480p' | '720p' | '1080p'
  startTime?: number
  endTime?: number
  audioFilename?: string
  subtitleFilename?: string
  subtitleStyle?: SubtitleStyle
  logoFilename?: string
  logoSize?: number
  logoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  replaceOriginal?: boolean
  audioVolume?: number
}) => {
  const { data } = await api.post('/export', params)
  return data as { url: string; filename: string }
}
