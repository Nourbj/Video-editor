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

export interface SubtitleStyle {
  size: number
  color: string
  position: 'bottom' | 'middle' | 'top'
}

export interface LogoAsset {
  id: string
  filename: string
  url: string
}

export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
export type TitlePosition =
  | 'top-left' | 'top' | 'top-right'
  | 'middle-left' | 'middle' | 'middle-right'
  | 'bottom-left' | 'bottom' | 'bottom-right'

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
  audioDuration: number
  setAudioDuration: (d: number) => void
  audioTrimStart: number
  audioTrimEnd: number
  setAudioTrimStart: (t: number) => void
  setAudioTrimEnd: (t: number) => void
  audioApplied: boolean
  setAudioApplied: (a: boolean) => void
  appliedAudioVolume: number
  appliedReplaceOriginal: boolean
  appliedAudioTrimStart: number
  appliedAudioTrimEnd: number
  setAppliedAudioSettings: (s: { volume: number; replaceOriginal: boolean; trimStart: number; trimEnd: number }) => void

  // Subtitles
  subtitles: SubtitleEntry[]
  setSubtitles: (s: SubtitleEntry[]) => void
  subtitleFilename: string | null
  setSubtitleFilename: (f: string | null) => void
  subtitleStyle: SubtitleStyle
  setSubtitleStyle: (s: SubtitleStyle) => void

  // Logo
  logoImage: LogoAsset | null
  setLogoImage: (l: LogoAsset | null) => void
  logoSize: number
  setLogoSize: (s: number) => void
  logoPosition: LogoPosition
  setLogoPosition: (p: LogoPosition) => void

  // Title text
  titleText: string
  setTitleText: (t: string) => void
  titleFont: string
  setTitleFont: (f: string) => void
  titleSize: number
  setTitleSize: (s: number) => void
  titleColor: string
  setTitleColor: (c: string) => void
  titlePosition: TitlePosition
  setTitlePosition: (p: TitlePosition) => void

  // Border
  borderEnabled: boolean
  setBorderEnabled: (e: boolean) => void
  borderSize: number
  setBorderSize: (s: number) => void
  borderColor: string
  setBorderColor: (c: string) => void

  // Export
  exportQuality: '480p' | '720p' | '1080p'
  setExportQuality: (q: '480p' | '720p' | '1080p') => void

  // UI
  activeTab: 'import' | 'edit' | 'audio' | 'subtitles' | 'logo' | 'title' | 'border' | 'cookies' | 'export'
  setActiveTab: (t: 'import' | 'edit' | 'audio' | 'subtitles' | 'logo' | 'title' | 'border' | 'cookies' | 'export') => void
  isProcessing: boolean
  setIsProcessing: (p: boolean) => void
  processedUrl: string | null
  setProcessedUrl: (u: string | null) => void

  reset: () => void
}

const defaultSubtitleSize = Number(import.meta.env.VITE_SUBTITLE_DEFAULT_SIZE || 22)
const defaultSubtitleColor = import.meta.env.VITE_SUBTITLE_DEFAULT_COLOR || '#ffffff'
const defaultSubtitlePosition = (import.meta.env.VITE_SUBTITLE_DEFAULT_POSITION as SubtitleStyle['position']) || 'bottom'
const defaultLogoSize = Number(import.meta.env.VITE_LOGO_DEFAULT_SIZE || 15)
const defaultLogoPosition = (import.meta.env.VITE_LOGO_DEFAULT_POSITION as LogoPosition) || 'top-right'
const defaultTitleFont = import.meta.env.VITE_TITLE_DEFAULT_FONT || 'Arial'
const defaultTitleSize = Number(import.meta.env.VITE_TITLE_DEFAULT_SIZE || 42)
const defaultTitleColor = import.meta.env.VITE_TITLE_DEFAULT_COLOR || '#ffffff'
const defaultTitlePosition = (import.meta.env.VITE_TITLE_DEFAULT_POSITION as TitlePosition) || 'top'
const defaultBorderSize = Number(import.meta.env.VITE_BORDER_DEFAULT_SIZE || 0)
const defaultBorderColor = import.meta.env.VITE_BORDER_DEFAULT_COLOR || '#ffffff'

export const useStore = create<EditorState>((set) => ({
  video: null,
  setVideo: v => set({ video: v, trimStart: 0, trimEnd: v?.duration || 0, processedUrl: null }),

  trimStart: 0,
  trimEnd: 0,
  setTrimStart: t => set({ trimStart: t }),
  setTrimEnd: t => set({ trimEnd: t }),

  audioTrack: null,
  setAudioTrack: a => set({
    audioTrack: a,
    audioDuration: a ? 0 : 0,
    audioTrimStart: 0,
    audioTrimEnd: 0,
    audioApplied: false,
    appliedAudioVolume: 1,
    appliedReplaceOriginal: false,
    appliedAudioTrimStart: 0,
    appliedAudioTrimEnd: 0,
  }),
  audioVolume: 1,
  setAudioVolume: v => set({ audioVolume: v }),
  replaceOriginalAudio: false,
  setReplaceOriginalAudio: r => set({ replaceOriginalAudio: r }),
  audioDuration: 0,
  setAudioDuration: d => set({ audioDuration: d }),
  audioTrimStart: 0,
  audioTrimEnd: 0,
  setAudioTrimStart: t => set({ audioTrimStart: t }),
  setAudioTrimEnd: t => set({ audioTrimEnd: t }),
  audioApplied: false,
  setAudioApplied: a => set({ audioApplied: a }),
  appliedAudioVolume: 1,
  appliedReplaceOriginal: false,
  appliedAudioTrimStart: 0,
  appliedAudioTrimEnd: 0,
  setAppliedAudioSettings: s => set({
    appliedAudioVolume: s.volume,
    appliedReplaceOriginal: s.replaceOriginal,
    appliedAudioTrimStart: s.trimStart,
    appliedAudioTrimEnd: s.trimEnd,
    audioApplied: true,
  }),

  subtitles: [],
  setSubtitles: s => set({ subtitles: s }),
  subtitleFilename: null,
  setSubtitleFilename: f => set({ subtitleFilename: f }),
  subtitleStyle: { size: defaultSubtitleSize, color: defaultSubtitleColor, position: defaultSubtitlePosition },
  setSubtitleStyle: s => set({ subtitleStyle: s }),

  logoImage: null,
  setLogoImage: l => set({ logoImage: l }),
  logoSize: defaultLogoSize,
  setLogoSize: s => set({ logoSize: s }),
  logoPosition: defaultLogoPosition,
  setLogoPosition: p => set({ logoPosition: p }),

  titleText: '',
  setTitleText: t => set({ titleText: t }),
  titleFont: defaultTitleFont,
  setTitleFont: f => set({ titleFont: f }),
  titleSize: defaultTitleSize,
  setTitleSize: s => set({ titleSize: s }),
  titleColor: defaultTitleColor,
  setTitleColor: c => set({ titleColor: c }),
  titlePosition: defaultTitlePosition,
  setTitlePosition: p => set({ titlePosition: p }),

  borderEnabled: defaultBorderSize > 0,
  setBorderEnabled: e => set({ borderEnabled: e }),
  borderSize: defaultBorderSize,
  setBorderSize: s => set({ borderSize: s }),
  borderColor: defaultBorderColor,
  setBorderColor: c => set({ borderColor: c }),

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
    audioTrack: null, audioVolume: 1, replaceOriginalAudio: false, audioDuration: 0, audioTrimStart: 0, audioTrimEnd: 0,
    audioApplied: false, appliedAudioVolume: 1, appliedReplaceOriginal: false, appliedAudioTrimStart: 0, appliedAudioTrimEnd: 0,
    subtitles: [], subtitleFilename: null,
    subtitleStyle: { size: defaultSubtitleSize, color: defaultSubtitleColor, position: defaultSubtitlePosition },
    logoImage: null,
    logoSize: defaultLogoSize,
    logoPosition: defaultLogoPosition,
    titleText: '',
    titleFont: defaultTitleFont,
    titleSize: defaultTitleSize,
    titleColor: defaultTitleColor,
    titlePosition: defaultTitlePosition,
    borderEnabled: defaultBorderSize > 0,
    borderSize: defaultBorderSize,
    borderColor: defaultBorderColor,
    processedUrl: null, activeTab: 'import',
  }),
}))
