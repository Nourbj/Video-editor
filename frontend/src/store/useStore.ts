import { create } from 'zustand'
import { SubtitleEntry } from '../api/client'

export interface VideoProject {
  id: string
  title: string
  duration: number
  url: string
  filename: string
  thumbnail?: string
}

export interface AudioTrack {
  id: string
  filename: string
  url: string
  volume: number
  replaceOriginal: boolean
}

interface EditorState {
  // Video
  video: VideoProject | null
  setVideo: (v: VideoProject | null) => void

  // Trim
  trimStart: number
  trimEnd: number
  setTrimStart: (t: number) => void
  setTrimEnd: (t: number) => void

  // Audio
  audioTrack: AudioTrack | null
  setAudioTrack: (a: AudioTrack | null) => void
  audioVolume: number
  setAudioVolume: (v: number) => void
  replaceOriginalAudio: boolean
  setReplaceOriginalAudio: (r: boolean) => void

  // Subtitles
  subtitles: SubtitleEntry[]
  setSubtitles: (s: SubtitleEntry[]) => void
  subtitleFilename: string | null
  setSubtitleFilename: (f: string | null) => void

  // Export
  exportQuality: '480p' | '720p' | '1080p'
  setExportQuality: (q: '480p' | '720p' | '1080p') => void

  // UI
  activeTab: 'import' | 'edit' | 'audio' | 'subtitles' | 'export'
  setActiveTab: (t: 'import' | 'edit' | 'audio' | 'subtitles' | 'export') => void
  isProcessing: boolean
  setIsProcessing: (p: boolean) => void
  processedUrl: string | null
  setProcessedUrl: (u: string | null) => void

  reset: () => void
}

export const useStore = create<EditorState>((set) => ({
  video: null,
  setVideo: v => set({ video: v, trimStart: 0, trimEnd: v?.duration || 0, processedUrl: null }),

  trimStart: 0,
  trimEnd: 0,
  setTrimStart: t => set({ trimStart: t }),
  setTrimEnd: t => set({ trimEnd: t }),

  audioTrack: null,
  setAudioTrack: a => set({ audioTrack: a }),
  audioVolume: 1,
  setAudioVolume: v => set({ audioVolume: v }),
  replaceOriginalAudio: false,
  setReplaceOriginalAudio: r => set({ replaceOriginalAudio: r }),

  subtitles: [],
  setSubtitles: s => set({ subtitles: s }),
  subtitleFilename: null,
  setSubtitleFilename: f => set({ subtitleFilename: f }),

  exportQuality: '720p',
  setExportQuality: q => set({ exportQuality: q }),

  activeTab: 'import',
  setActiveTab: t => set({ activeTab: t }),
  isProcessing: false,
  setIsProcessing: p => set({ isProcessing: p }),
  processedUrl: null,
  setProcessedUrl: u => set({ processedUrl: u }),

  reset: () => set({
    video: null, trimStart: 0, trimEnd: 0,
    audioTrack: null, audioVolume: 1, replaceOriginalAudio: false,
    subtitles: [], subtitleFilename: null,
    processedUrl: null, activeTab: 'import',
  }),
}))
