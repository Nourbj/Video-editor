import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SubtitleEntry } from '../api/client'
import { createId } from '../utils/id'

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
}

export interface SubtitleStyle {
  size: number
  color: string
  backgroundColor: string
}

export interface LogoAsset {
  id: string
  filename: string
  url: string
}

export interface CropSettings {
  top: number
  bottom: number
  left: number
  right: number
}

export interface ActionToast {
  id: string
  message: string
}

export interface ActionHistoryEntry {
  id: string
  message: string
}

export interface VideoSegment {
  id: string
  label: string
  start: number
  end: number
  outputFilename: string | null
  outputUrl: string | null
  isGenerating?: boolean
  kind?: 'cut' | 'merge'
}

export type TitlePosition =
  | 'top-left' | 'top' | 'top-right'
  | 'middle-left' | 'middle' | 'middle-right'
  | 'bottom-left' | 'bottom' | 'bottom-right'

interface EditorState {
  video: VideoProject | null
  setVideo: (v: VideoProject | null) => void

  trimStart: number
  trimEnd: number
  setTrimStart: (t: number) => void
  setTrimEnd: (t: number) => void
  segments: VideoSegment[]
  segmentHistory: VideoSegment[]
  addSegment: (segment: Omit<VideoSegment, 'id' | 'outputFilename' | 'outputUrl'>) => string
  addSegmentHistoryEntry: (segment: Omit<VideoSegment, 'id'>) => string
  removeSegment: (id: string) => void
  clearSegments: () => void
  clearSegmentHistory: () => void
  reorderSegments: (activeId: string, overId: string) => void
  resetSegmentOutputs: () => void
  setSegmentOutput: (id: string, output: { filename: string; url: string }) => void
  setSegmentGenerating: (id: string, generating: boolean) => void
  setMergedVideo: (v: VideoProject) => void

  audioTrack: AudioTrack | null
  setAudioTrack: (a: AudioTrack | null) => void
  replaceOriginalAudio: boolean
  setReplaceOriginalAudio: (r: boolean) => void
  audioDuration: number
  setAudioDuration: (d: number) => void
  audioTrimStart: number
  audioTrimEnd: number
  setAudioTrimStart: (t: number) => void
  setAudioTrimEnd: (t: number) => void
  audioOffset: number
  setAudioOffset: (t: number) => void
  audioApplied: boolean
  setAudioApplied: (a: boolean) => void
  appliedReplaceOriginal: boolean
  appliedAudioTrimStart: number
  appliedAudioTrimEnd: number
  appliedAudioOffset: number
  setAppliedAudioSettings: (s: { replaceOriginal: boolean; trimStart: number; trimEnd: number; offset: number }) => void
  audioUrlInput: string
  setAudioUrlInput: (url: string) => void
  audioLoading: boolean
  setAudioLoading: (loading: boolean) => void
  audioError: string | null
  setAudioError: (error: string | null) => void
  videoUrlInput: string
  setVideoUrlInput: (url: string) => void
  videoLoading: boolean
  setVideoLoading: (loading: boolean) => void
  videoError: string | null
  setVideoError: (error: string | null) => void

  subtitles: SubtitleEntry[]
  setSubtitles: (s: SubtitleEntry[]) => void
  subtitleFilename: string | null
  setSubtitleFilename: (f: string | null) => void
  subtitleStyle: SubtitleStyle
  setSubtitleStyle: (s: SubtitleStyle) => void
  subtitleAppliedSignature: string | null
  setSubtitleAppliedSignature: (s: string | null) => void

  logoImage: LogoAsset | null
  setLogoImage: (l: LogoAsset | null) => void
  logoDraftImage: LogoAsset | null
  setLogoDraftImage: (l: LogoAsset | null) => void
  logoSize: number
  setLogoSize: (s: number) => void
  logoDraftSize: number
  setLogoDraftSize: (s: number) => void
  logoX: number | null
  logoY: number | null
  setLogoXY: (x: number | null, y: number | null) => void
  logoDraftX: number | null
  logoDraftY: number | null
  setLogoDraftXY: (x: number | null, y: number | null) => void
  isApplyingLogo: boolean
  setIsApplyingLogo: (v: boolean) => void

  titleText: string
  setTitleText: (t: string) => void
  titleDraftText: string
  setTitleDraftText: (t: string) => void
  titleFont: string
  setTitleFont: (f: string) => void
  titleSize: number
  setTitleSize: (s: number) => void
  titleColor: string
  setTitleColor: (c: string) => void
  titleBgColor: string
  setTitleBgColor: (c: string) => void
  titleBorderColor: string
  setTitleBorderColor: (c: string) => void
  titleBorderWidth: number
  setTitleBorderWidth: (s: number) => void
  titleFrameColor: string
  setTitleFrameColor: (c: string) => void
  titleFrameWidth: number
  setTitleFrameWidth: (s: number) => void
  titlePadding: number
  setTitlePadding: (s: number) => void
  titleX: number | null
  titleY: number | null
  setTitleXY: (x: number | null, y: number | null) => void
  titleDraftX: number | null
  titleDraftY: number | null
  setTitleDraftXY: (x: number | null, y: number | null) => void
  titleAlign: 'left' | 'center' | 'right'
  setTitleAlign: (a: 'left' | 'center' | 'right') => void
  isApplyingTitle: boolean
  setIsApplyingTitle: (v: boolean) => void

  borderEnabled: boolean
  setBorderEnabled: (e: boolean) => void
  borderWidth: number
  setBorderWidth: (s: number) => void
  borderHeight: number
  setBorderHeight: (s: number) => void
  borderColor: string
  setBorderColor: (c: string) => void
  borderMode: 'inside' | 'outside'
  setBorderMode: (m: 'inside' | 'outside') => void

  cropEnabled: boolean
  setCropEnabled: (enabled: boolean) => void
  cropDraftEnabled: boolean
  setCropDraftEnabled: (enabled: boolean) => void
  crop: CropSettings
  cropDraft: CropSettings
  setCropDraftTop: (n: number) => void
  setCropDraftBottom: (n: number) => void
  setCropDraftLeft: (n: number) => void
  setCropDraftRight: (n: number) => void
  setCrop: (crop: CropSettings) => void
  resetCrop: () => void
  resetCropDraft: () => void
  applyCropDraft: () => void

  exportQuality: '480p' | '720p' | '1080p'
  setExportQuality: (q: '480p' | '720p' | '1080p') => void
  exportAspectRatio: 'original' | '16:9' | '9:16' | '1:1' | '4:5' | '5:4' | '4:3' | '3:2'
  setExportAspectRatio: (r: 'original' | '16:9' | '9:16' | '1:1' | '4:5' | '5:4' | '4:3' | '3:2') => void
  exportFilename: string
  setExportFilename: (name: string) => void

  activeTab: 'import' | 'edit' | 'crop' | 'subtitles' | 'logo' | 'title' | 'border' | 'export'
  setActiveTab: (t: 'import' | 'edit' | 'crop' | 'subtitles' | 'logo' | 'title' | 'border' | 'export') => void
  isProcessing: boolean
  setIsProcessing: (p: boolean) => void
  processedUrl: string | null
  setProcessedUrl: (u: string | null) => void
  editStatus: string | null
  setEditStatus: (s: string | null) => void
  previewLoading: boolean
  setPreviewLoading: (p: boolean) => void
  pendingPreviewAction: string | null
  setPendingPreviewAction: (message: string | null) => void
  actionToasts: ActionToast[]
  actionHistory: ActionHistoryEntry[]
  pushActionToast: (message: string) => void
  removeActionToast: (id: string) => void

  seekTo: number | null
  setSeekTo: (t: number | null) => void

  reset: () => void
}

type PersistedEditorState = Pick<EditorState,
  | 'video'
  | 'trimStart'
  | 'trimEnd'
  | 'segments'
  | 'segmentHistory'
  | 'audioTrack'
  | 'replaceOriginalAudio'
  | 'audioDuration'
  | 'audioTrimStart'
  | 'audioTrimEnd'
  | 'audioOffset'
  | 'audioApplied'
  | 'appliedReplaceOriginal'
  | 'appliedAudioTrimStart'
  | 'appliedAudioTrimEnd'
  | 'appliedAudioOffset'
  | 'subtitles'
  | 'subtitleFilename'
  | 'subtitleStyle'
  | 'subtitleAppliedSignature'
  | 'logoImage'
  | 'logoDraftImage'
  | 'logoSize'
  | 'logoDraftSize'
  | 'logoX'
  | 'logoY'
  | 'logoDraftX'
  | 'logoDraftY'
  | 'titleText'
  | 'titleDraftText'
  | 'titleFont'
  | 'titleSize'
  | 'titleColor'
  | 'titleBgColor'
  | 'titleBorderColor'
  | 'titleBorderWidth'
  | 'titleFrameColor'
  | 'titleFrameWidth'
  | 'titlePadding'
  | 'titleX'
  | 'titleY'
  | 'titleDraftX'
  | 'titleDraftY'
  | 'titleAlign'
  | 'borderEnabled'
  | 'borderWidth'
  | 'borderHeight'
  | 'borderColor'
  | 'borderMode'
  | 'cropEnabled'
  | 'cropDraftEnabled'
  | 'crop'
  | 'cropDraft'
  | 'exportQuality'
  | 'exportAspectRatio'
  | 'exportFilename'
  | 'activeTab'
  | 'processedUrl'
  | 'actionHistory'
>

const defaultSubtitleSize = Number(import.meta.env.VITE_SUBTITLE_DEFAULT_SIZE || 22)
const defaultSubtitleColor = import.meta.env.VITE_SUBTITLE_DEFAULT_COLOR || '#ffffff'
const defaultSubtitleBackgroundColor = import.meta.env.VITE_SUBTITLE_DEFAULT_BG || '#000000'
const defaultLogoSize = Number(import.meta.env.VITE_LOGO_DEFAULT_SIZE || 15)
const defaultTitleFont = import.meta.env.VITE_TITLE_DEFAULT_FONT || 'Arial'
const defaultTitleSize = Number(import.meta.env.VITE_TITLE_DEFAULT_SIZE || 42)
const defaultTitleColor = import.meta.env.VITE_TITLE_DEFAULT_COLOR || '#ffffff'
const defaultTitleBgColor = import.meta.env.VITE_TITLE_DEFAULT_BG || '#000000'
const defaultTitleBorderColor = import.meta.env.VITE_TITLE_DEFAULT_BORDER_COLOR || '#000000'
const defaultTitleBorderWidth = Number(import.meta.env.VITE_TITLE_DEFAULT_BORDER_WIDTH || 0)
const defaultTitleFrameColor = import.meta.env.VITE_TITLE_DEFAULT_FRAME_COLOR || '#000000'
const defaultTitleFrameWidth = Number(import.meta.env.VITE_TITLE_DEFAULT_FRAME_WIDTH || 0)
const defaultTitlePadding = Number(import.meta.env.VITE_TITLE_DEFAULT_PADDING || 8)
const defaultTitleAlign = (import.meta.env.VITE_TITLE_DEFAULT_ALIGN || 'center') as 'left' | 'center' | 'right'
const defaultBorderSize = Number(import.meta.env.VITE_BORDER_DEFAULT_SIZE || 0)
const defaultBorderColor = import.meta.env.VITE_BORDER_DEFAULT_COLOR || '#ffffff'
const defaultCrop: CropSettings = { top: 0, bottom: 0, left: 0, right: 0 }

export const useStore = create<EditorState>()(persist((set) => ({
  video: null,
  setVideo: v => set(state => {
    const isReplacingVideo = !!state.video && state.video.id !== v?.id

    return {
      video: v,
      trimStart: 0,
      trimEnd: v?.duration || 0,
      cropEnabled: false,
      cropDraftEnabled: false,
      crop: defaultCrop,
      cropDraft: defaultCrop,
      processedUrl: null,
      segments: [],
      segmentHistory: [],
      editStatus: null,
      previewLoading: false,
      pendingPreviewAction: null,
      actionToasts: [],
      actionHistory: [],
      seekTo: null,
      exportFilename: '',
      subtitleAppliedSignature: null,
      ...(isReplacingVideo
        ? {
          audioApplied: false,
          appliedReplaceOriginal: false,
          appliedAudioTrimStart: 0,
          appliedAudioTrimEnd: 0,
          appliedAudioOffset: 0,
          subtitles: [],
          subtitleFilename: null,
          logoImage: null,
          logoDraftImage: null,
          logoX: null,
          logoY: null,
          logoDraftX: null,
          logoDraftY: null,
          titleText: '',
          titleDraftText: '',
          titleX: null,
          titleY: null,
          titleDraftX: null,
          titleDraftY: null,
          titleAlign: defaultTitleAlign,
          isApplyingLogo: false,
          isApplyingTitle: false,
        }
        : {}),
    }
  }),

  trimStart: 0,
  trimEnd: 0,
  setTrimStart: t => set({ trimStart: t }),
  setTrimEnd: t => set({ trimEnd: t }),
  segments: [],
  addSegment: segment => {
    const id = createId()
    set(state => ({
      segments: [
        ...state.segments,
        {
          ...segment,
          id,
          outputFilename: null,
          outputUrl: null,
          isGenerating: false,
          kind: segment.kind || 'cut',
        },
      ],
      segmentHistory: [
        ...state.segmentHistory,
        {
          ...segment,
          id,
          outputFilename: null,
          outputUrl: null,
          isGenerating: false,
          kind: segment.kind || 'cut',
        },
      ],
    }))
    return id
  },
  segmentHistory: [],
  addSegmentHistoryEntry: segment => {
    const id = createId()
    set(state => ({
      segmentHistory: [
        ...state.segmentHistory,
        {
          ...segment,
          id,
        },
      ],
    }))
    return id
  },
  removeSegment: id => set(state => ({ segments: state.segments.filter(segment => segment.id !== id) })),
  clearSegments: () => set({ segments: [] }),
  clearSegmentHistory: () => set({ segmentHistory: [] }),
  reorderSegments: (activeId, overId) => set(state => {
    if (activeId === overId) return state
    const fromIndex = state.segments.findIndex(segment => segment.id === activeId)
    const toIndex = state.segments.findIndex(segment => segment.id === overId)
    if (fromIndex < 0 || toIndex < 0) return state
    const next = [...state.segments]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    return { segments: next }
  }),
  resetSegmentOutputs: () => set(state => ({
    segments: state.segments.map(segment => ({
      ...segment,
      outputFilename: null,
      outputUrl: null,
    })),
    segmentHistory: state.segmentHistory.map(segment => ({
      ...segment,
      outputFilename: null,
      outputUrl: null,
    })),
  })),
  setSegmentOutput: (id, output) => set(state => ({
    segments: state.segments.map(segment => segment.id === id
      ? { ...segment, outputFilename: output.filename, outputUrl: output.url, isGenerating: false }
      : segment),
    segmentHistory: state.segmentHistory.map(segment => segment.id === id
      ? { ...segment, outputFilename: output.filename, outputUrl: output.url, isGenerating: false }
      : segment),
  })),
  setSegmentGenerating: (id, generating) => set(state => ({
    segments: state.segments.map(segment => segment.id === id
      ? { ...segment, isGenerating: generating }
      : segment),
    segmentHistory: state.segmentHistory.map(segment => segment.id === id
      ? { ...segment, isGenerating: generating }
      : segment),
  })),
  setMergedVideo: v => set(() => ({
    video: v,
    trimStart: 0,
    trimEnd: v.duration || 0,
    cropEnabled: false,
    cropDraftEnabled: false,
    crop: defaultCrop,
    cropDraft: defaultCrop,
    processedUrl: null,
    segments: [],
    editStatus: null,
    previewLoading: false,
    pendingPreviewAction: null,
    actionToasts: [],
    seekTo: null,
    exportFilename: '',
    subtitleAppliedSignature: null,
  })),

  audioTrack: null,
  setAudioTrack: a => set({
    audioTrack: a,
    audioDuration: a ? 0 : 0,
    audioTrimStart: 0,
    audioTrimEnd: 0,
    audioOffset: 0,
    audioApplied: false,
    appliedReplaceOriginal: false,
    appliedAudioTrimStart: 0,
    appliedAudioTrimEnd: 0,
    appliedAudioOffset: 0,
  }),
  replaceOriginalAudio: false,
  setReplaceOriginalAudio: r => set({ replaceOriginalAudio: r }),
  audioDuration: 0,
  setAudioDuration: d => set({ audioDuration: d }),
  audioTrimStart: 0,
  audioTrimEnd: 0,
  setAudioTrimStart: t => set({ audioTrimStart: t }),
  setAudioTrimEnd: t => set({ audioTrimEnd: t }),
  audioOffset: 0,
  setAudioOffset: t => set({ audioOffset: t }),
  audioApplied: false,
  setAudioApplied: a => set({ audioApplied: a }),
  appliedReplaceOriginal: false,
  appliedAudioTrimStart: 0,
  appliedAudioTrimEnd: 0,
  appliedAudioOffset: 0,
  setAppliedAudioSettings: s => set({
    appliedReplaceOriginal: s.replaceOriginal,
    appliedAudioTrimStart: s.trimStart,
    appliedAudioTrimEnd: s.trimEnd,
    appliedAudioOffset: s.offset,
    audioApplied: true,
  }),
  audioUrlInput: '',
  setAudioUrlInput: url => set({ audioUrlInput: url }),
  audioLoading: false,
  setAudioLoading: loading => set({ audioLoading: loading }),
  audioError: null,
  setAudioError: error => set({ audioError: error }),
  videoUrlInput: '',
  setVideoUrlInput: url => set({ videoUrlInput: url }),
  videoLoading: false,
  setVideoLoading: loading => set({ videoLoading: loading }),
  videoError: null,
  setVideoError: error => set({ videoError: error }),

  subtitles: [],
  setSubtitles: s => set({ subtitles: s }),
  subtitleFilename: null,
  setSubtitleFilename: f => set({ subtitleFilename: f }),
  subtitleStyle: {
    size: defaultSubtitleSize,
    color: defaultSubtitleColor,
    backgroundColor: defaultSubtitleBackgroundColor,
  },
  setSubtitleStyle: s => set({ subtitleStyle: s }),
  subtitleAppliedSignature: null,
  setSubtitleAppliedSignature: s => set({ subtitleAppliedSignature: s }),

  logoImage: null,
  setLogoImage: l => set({ logoImage: l }),
  logoDraftImage: null,
  setLogoDraftImage: l => set({ logoDraftImage: l }),
  logoSize: defaultLogoSize,
  setLogoSize: s => set({ logoSize: s }),
  logoDraftSize: defaultLogoSize,
  setLogoDraftSize: s => set({ logoDraftSize: s }),
  logoX: null,
  logoY: null,
  setLogoXY: (x, y) => set({ logoX: x, logoY: y }),
  logoDraftX: null,
  logoDraftY: null,
  setLogoDraftXY: (x, y) => set({ logoDraftX: x, logoDraftY: y }),
  isApplyingLogo: false,
  setIsApplyingLogo: v => set({ isApplyingLogo: v }),

  titleText: '',
  setTitleText: t => set({ titleText: t }),
  titleDraftText: '',
  setTitleDraftText: t => set({ titleDraftText: t }),
  titleFont: defaultTitleFont,
  setTitleFont: f => set({ titleFont: f }),
  titleSize: defaultTitleSize,
  setTitleSize: s => set({ titleSize: s }),
  titleColor: defaultTitleColor,
  setTitleColor: c => set({ titleColor: c }),
  titleBgColor: defaultTitleBgColor,
  setTitleBgColor: c => set({ titleBgColor: c }),
  titleBorderColor: defaultTitleBorderColor,
  setTitleBorderColor: c => set({ titleBorderColor: c }),
  titleBorderWidth: defaultTitleBorderWidth,
  setTitleBorderWidth: s => set({ titleBorderWidth: s }),
  titleFrameColor: defaultTitleFrameColor,
  setTitleFrameColor: c => set({ titleFrameColor: c }),
  titleFrameWidth: defaultTitleFrameWidth,
  setTitleFrameWidth: s => set({ titleFrameWidth: s }),
  titlePadding: defaultTitlePadding,
  setTitlePadding: s => set({ titlePadding: s }),
  titleX: null,
  titleY: null,
  setTitleXY: (x, y) => set({ titleX: x, titleY: y }),
  titleDraftX: null,
  titleDraftY: null,
  setTitleDraftXY: (x, y) => set({ titleDraftX: x, titleDraftY: y }),
  titleAlign: defaultTitleAlign,
  setTitleAlign: a => set({ titleAlign: a }),
  isApplyingTitle: false,
  setIsApplyingTitle: v => set({ isApplyingTitle: v }),

  borderEnabled: defaultBorderSize > 0,
  setBorderEnabled: e => set({ borderEnabled: e }),
  borderWidth: defaultBorderSize,
  setBorderWidth: s => set({ borderWidth: s }),
  borderHeight: defaultBorderSize,
  setBorderHeight: s => set({ borderHeight: s }),
  borderColor: defaultBorderColor,
  setBorderColor: c => set({ borderColor: c }),
  borderMode: 'outside',
  setBorderMode: m => set({ borderMode: m }),

  cropEnabled: false,
  setCropEnabled: enabled => set({ cropEnabled: enabled }),
  cropDraftEnabled: false,
  setCropDraftEnabled: enabled => set({ cropDraftEnabled: enabled }),
  crop: defaultCrop,
  cropDraft: defaultCrop,
  setCropDraftTop: n => set(state => ({ cropDraft: { ...state.cropDraft, top: n } })),
  setCropDraftBottom: n => set(state => ({ cropDraft: { ...state.cropDraft, bottom: n } })),
  setCropDraftLeft: n => set(state => ({ cropDraft: { ...state.cropDraft, left: n } })),
  setCropDraftRight: n => set(state => ({ cropDraft: { ...state.cropDraft, right: n } })),
  setCrop: crop => set({ crop, cropDraft: crop }),
  resetCrop: () => set({ cropEnabled: false, cropDraftEnabled: false, crop: defaultCrop, cropDraft: defaultCrop }),
  resetCropDraft: () => set({ cropDraftEnabled: false, cropDraft: defaultCrop }),
  applyCropDraft: () => set(state => ({
    cropEnabled: state.cropDraftEnabled,
    crop: state.cropDraft,
    cropDraft: state.cropDraft,
  })),

  exportQuality: '720p',
  setExportQuality: q => set({ exportQuality: q }),
  exportAspectRatio: 'original',
  setExportAspectRatio: r => set({ exportAspectRatio: r }),
  exportFilename: '',
  setExportFilename: name => set({ exportFilename: name }),

  activeTab: 'import',
  setActiveTab: t => set({ activeTab: t }),
  isProcessing: false,
  setIsProcessing: p => set({ isProcessing: p }),
  processedUrl: null,
  setProcessedUrl: u => set({ processedUrl: u }),
  editStatus: null,
  setEditStatus: s => set({ editStatus: s }),
  previewLoading: false,
  setPreviewLoading: p => set({ previewLoading: p }),
  pendingPreviewAction: null,
  setPendingPreviewAction: message => set({ pendingPreviewAction: message }),
  actionToasts: [],
  actionHistory: [],
  pushActionToast: message => set(state => ({
    actionToasts: [...state.actionToasts, { id: createId(), message }].slice(-4),
    actionHistory: [...state.actionHistory, { id: createId(), message }].slice(-6),
  })),
  removeActionToast: id => set(state => ({
    actionToasts: state.actionToasts.filter(toast => toast.id !== id),
  })),

  reset: () => set({
    video: null, trimStart: 0, trimEnd: 0,
    segments: [],
    audioTrack: null, replaceOriginalAudio: false, audioDuration: 0, audioTrimStart: 0, audioTrimEnd: 0, audioOffset: 0,
    audioApplied: false, appliedReplaceOriginal: false, appliedAudioTrimStart: 0, appliedAudioTrimEnd: 0, appliedAudioOffset: 0,
    subtitles: [], subtitleFilename: null,
    subtitleStyle: {
      size: defaultSubtitleSize,
      color: defaultSubtitleColor,
      backgroundColor: defaultSubtitleBackgroundColor,
    },
    subtitleAppliedSignature: null,
    logoImage: null,
    logoDraftImage: null,
    logoSize: defaultLogoSize,
    logoDraftSize: defaultLogoSize,
    logoX: null,
    logoY: null,
    logoDraftX: null,
    logoDraftY: null,
    isApplyingLogo: false,
    titleText: '',
    titleDraftText: '',
    titleFont: defaultTitleFont,
    titleSize: defaultTitleSize,
    titleColor: defaultTitleColor,
    titleBgColor: defaultTitleBgColor,
    titleBorderColor: defaultTitleBorderColor,
    titleBorderWidth: defaultTitleBorderWidth,
    titleFrameColor: defaultTitleFrameColor,
    titleFrameWidth: defaultTitleFrameWidth,
    titlePadding: defaultTitlePadding,
    titleX: null,
    titleY: null,
    titleDraftX: null,
    titleDraftY: null,
    isApplyingTitle: false,
    borderEnabled: defaultBorderSize > 0,
    borderWidth: defaultBorderSize,
    borderHeight: defaultBorderSize,
    borderColor: defaultBorderColor,
    borderMode: 'outside',
    cropEnabled: false,
    cropDraftEnabled: false,
    crop: defaultCrop,
    cropDraft: defaultCrop,
    exportQuality: '720p',
    exportAspectRatio: 'original',
    exportFilename: '',
    processedUrl: null, activeTab: 'import', editStatus: null,
    previewLoading: false,
    pendingPreviewAction: null,
    actionToasts: [],
    actionHistory: [],
    segmentHistory: [],
    seekTo: null,
  }),

  seekTo: null,
  setSeekTo: t => set({ seekTo: t }),
}), {
  name: 'video-editor-project',
  partialize: (state): PersistedEditorState => ({
    video: state.video,
    trimStart: state.trimStart,
    trimEnd: state.trimEnd,
    segments: state.segments,
    segmentHistory: state.segmentHistory,
    audioTrack: state.audioTrack,
    replaceOriginalAudio: state.replaceOriginalAudio,
    audioDuration: state.audioDuration,
    audioTrimStart: state.audioTrimStart,
    audioTrimEnd: state.audioTrimEnd,
    audioOffset: state.audioOffset,
    audioApplied: state.audioApplied,
    appliedReplaceOriginal: state.appliedReplaceOriginal,
    appliedAudioTrimStart: state.appliedAudioTrimStart,
    appliedAudioTrimEnd: state.appliedAudioTrimEnd,
    appliedAudioOffset: state.appliedAudioOffset,
    subtitles: state.subtitles,
    subtitleFilename: state.subtitleFilename,
    subtitleStyle: state.subtitleStyle,
    subtitleAppliedSignature: state.subtitleAppliedSignature,
    logoImage: state.logoImage,
    logoDraftImage: state.logoDraftImage,
    logoSize: state.logoSize,
    logoDraftSize: state.logoDraftSize,
    logoX: state.logoX,
    logoY: state.logoY,
    logoDraftX: state.logoDraftX,
    logoDraftY: state.logoDraftY,
    titleText: state.titleText,
    titleDraftText: state.titleDraftText,
    titleFont: state.titleFont,
    titleSize: state.titleSize,
    titleColor: state.titleColor,
    titleBgColor: state.titleBgColor,
    titleBorderColor: state.titleBorderColor,
    titleBorderWidth: state.titleBorderWidth,
    titleFrameColor: state.titleFrameColor,
    titleFrameWidth: state.titleFrameWidth,
    titlePadding: state.titlePadding,
    titleX: state.titleX,
    titleY: state.titleY,
    titleDraftX: state.titleDraftX,
    titleDraftY: state.titleDraftY,
    titleAlign: state.titleAlign,
    borderEnabled: state.borderEnabled,
    borderWidth: state.borderWidth,
    borderHeight: state.borderHeight,
    borderColor: state.borderColor,
    borderMode: state.borderMode,
    cropEnabled: state.cropEnabled,
    cropDraftEnabled: state.cropDraftEnabled,
    crop: state.crop,
    cropDraft: state.cropDraft,
    exportQuality: state.exportQuality,
    exportAspectRatio: state.exportAspectRatio,
    exportFilename: state.exportFilename,
    activeTab: state.activeTab,
    processedUrl: state.processedUrl,
    actionHistory: state.actionHistory,
  }),
}))
