import React, { useEffect, useRef, useState } from 'react'
import { Upload, Scissors, Music, FileText, Download, Film, RotateCcw, Image as ImageIcon, Type, Square } from 'lucide-react'
import { useStore } from './store/useStore'
import ImportPanel from './components/ImportPanel/ImportPanel'
import VideoPlayer from './components/VideoPlayer/VideoPlayer'
import AudioEditor from './components/AudioEditor/AudioEditor'
import SubtitleEditor from './components/SubtitleEditor/SubtitleEditor'
import ExportPanel from './components/ExportPanel/ExportPanel'
import LogoEditor from './components/LogoEditor/LogoEditor'
import TitleEditor from './components/TitleEditor/TitleEditor'
import BorderEditor from './components/BorderEditor/BorderEditor'
import { createSubtitles, previewVideo } from './api/client'

type Tab = 'import' | 'edit' | 'audio' | 'subtitles' | 'logo' | 'title' | 'border' | 'export'

const TABS: { id: Tab; label: string; icon: React.ReactNode; requiresVideo?: boolean }[] = [
  { id: 'import', label: 'Import', icon: <Upload size={15} /> },
  { id: 'edit', label: 'Edit', icon: <Scissors size={15} />, requiresVideo: true },
  { id: 'audio', label: 'Audio', icon: <Music size={15} />, requiresVideo: true },
  { id: 'subtitles', label: 'Subtitles', icon: <FileText size={15} />, requiresVideo: true },
  { id: 'logo', label: 'Logo', icon: <ImageIcon size={15} />, requiresVideo: true },
  { id: 'title', label: 'Title', icon: <Type size={15} />, requiresVideo: true },
  { id: 'border', label: 'Border', icon: <Square size={15} />, requiresVideo: true },
  { id: 'export', label: 'Export', icon: <Download size={15} />, requiresVideo: true },
]

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function App() {
  const {
    video, activeTab, setActiveTab, reset,
    trimStart, trimEnd,
    audioTrack, audioDuration, audioTrimStart, audioTrimEnd, audioApplied, appliedAudioVolume, appliedReplaceOriginal, appliedAudioTrimStart, appliedAudioTrimEnd, subtitles,
    subtitleFilename, setSubtitleFilename,
    subtitleStyle,
    logoImage, logoSize, logoPosition,
    titleText, titleFont, titleSize, titleColor, titlePosition,
    borderEnabled, borderSize, borderColor,
    exportQuality,
    processedUrl, setProcessedUrl,
  } = useStore()

  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const debounceRef = useRef<number | null>(null)
  const lastPreviewSig = useRef<string>('')
  const pendingSig = useRef<string>('')

  const handlePreview = async () => {
    if (!video) return
    setPreviewLoading(true)
    setPreviewError(null)

    const hasTrim = trimStart > 0 || trimEnd < video.duration
    const hasSubtitles = subtitles.length > 0
    const hasAppliedAudio = !!audioTrack && audioApplied
    const hasAppliedAudioTrim = hasAppliedAudio && audioDuration > 0 && (appliedAudioTrimStart > 0 || appliedAudioTrimEnd < audioDuration)

    try {
      let subFile = subtitleFilename
      if (hasSubtitles && !subFile) {
        const res = await createSubtitles(subtitles)
        subFile = res.filename
        setSubtitleFilename(res.filename)
      }

      const result = await previewVideo({
        filename: video.filename,
        quality: exportQuality,
        startTime: hasTrim ? trimStart : undefined,
        endTime: hasTrim ? trimEnd : undefined,
        audioFilename: hasAppliedAudio ? audioTrack?.filename : undefined,
        audioStartTime: hasAppliedAudioTrim ? appliedAudioTrimStart : undefined,
        audioEndTime: hasAppliedAudioTrim ? appliedAudioTrimEnd : undefined,
        subtitleFilename: subFile || undefined,
        subtitleStyle,
        titleStyle: titleText.trim() ? {
          text: titleText.trim(),
          font: titleFont,
          size: titleSize,
          color: titleColor,
          position: titlePosition,
        } : undefined,
        borderStyle: {
          enabled: borderEnabled,
          size: borderSize,
          color: borderColor,
        },
        logoFilename: logoImage?.filename,
        logoSize,
        logoPosition,
      })

      setProcessedUrl(result.url)
    } catch (e: unknown) {
      setPreviewError(e instanceof Error ? e.message : 'Preview failed')
    } finally {
      setPreviewLoading(false)
    }
  }

  // Auto-preview with debounce on trim/audio/subtitle changes
  useEffect(() => {
    if (!video) return
    const hasTrim = trimStart > 0 || trimEnd < video.duration
    const hasAudio = !!audioTrack
    const hasSubtitles = subtitles.length > 0
    const hasLogo = !!logoImage
    const hasTitle = titleText.trim().length > 0
    const hasBorder = borderEnabled && borderSize > 0
    const hasAppliedAudio = !!audioTrack && audioApplied
    const hasAppliedAudioTrim = hasAppliedAudio && audioDuration > 0 && (appliedAudioTrimStart > 0 || appliedAudioTrimEnd < audioDuration)
    const hasChanges = hasTrim || hasAppliedAudio || hasAppliedAudioTrim || hasSubtitles || hasLogo || hasTitle || hasBorder

    if (!hasChanges) {
      pendingSig.current = ''
      lastPreviewSig.current = ''
      if (processedUrl) setProcessedUrl(null)
      return
    }

    const sig = JSON.stringify({
      trimStart,
      trimEnd,
      audio: hasAppliedAudio ? { id: audioTrack!.id, vol: appliedAudioVolume, replace: appliedReplaceOriginal, t0: appliedAudioTrimStart, t1: appliedAudioTrimEnd } : null,
      subtitles,
      exportQuality,
      logo: logoImage ? { id: logoImage.id, size: logoSize, pos: logoPosition } : null,
      title: titleText.trim() ? { text: titleText, font: titleFont, size: titleSize, color: titleColor, pos: titlePosition } : null,
      border: borderEnabled ? { size: borderSize, color: borderColor } : null,
    })

    if (sig === lastPreviewSig.current) return
    pendingSig.current = sig

    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      if (previewLoading) return
      if (pendingSig.current && pendingSig.current !== lastPreviewSig.current) {
        lastPreviewSig.current = pendingSig.current
        handlePreview()
      }
    }, 1000)

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [
    video,
    trimStart,
    trimEnd,
    audioTrack,
    subtitles,
    exportQuality,
    logoImage,
    logoSize,
    logoPosition,
    titleText,
    titleFont,
    titleSize,
    titleColor,
    titlePosition,
    borderEnabled,
    borderSize,
    borderColor,
    previewLoading,
    processedUrl,
    setProcessedUrl,
  ])

  useEffect(() => {
    if (!video) return
    if (previewLoading) return
    if (pendingSig.current && pendingSig.current !== lastPreviewSig.current) {
      lastPreviewSig.current = pendingSig.current
      handlePreview()
    }
  }, [previewLoading, video])

  const appName = import.meta.env.VITE_APP_NAME || 'Video Editor'

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <header className="border-b border-zinc-200 bg-white/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="w-full px-8 h-14 flex items-center justify-start gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center">
              <Film size={16} className="text-white" />
            </div>
            <span className="font-semibold text-zinc-900 tracking-tight">{appName}</span>
          </div>

          {video && (
            <div className="flex items-center gap-3">
              <div className="text-xs text-zinc-500 max-w-xs truncate hidden sm:block">
                {video.title}
              </div>
              <button
                onClick={reset}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
              >
                <RotateCcw size={12} /> New project
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-[1700px] mx-auto px-4 lg:px-8 py-2">
        <div className="flex flex-col lg:flex-row gap-3 items-start">
          <div className="w-full lg:w-52 flex-shrink-0 lg:sticky lg:top-[64px]">
            <nav className="bg-white rounded-2xl p-1.5 border border-zinc-200 shadow-sm">
              {TABS.map(tab => {
                const disabled = tab.requiresVideo && !video
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => !disabled && setActiveTab(tab.id)}
                    disabled={disabled}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active
                      ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                      : disabled
                        ? 'text-zinc-300 cursor-not-allowed'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                      }`}
                  >
                    {tab.icon}
                    {tab.label}
                    {/* badges */}
                    {tab.id === 'audio' && audioTrack && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-yellow-500" />
                    )}
                    {tab.id === 'subtitles' && subtitles.length > 0 && (
                      <span className="ml-auto text-xs bg-zinc-200 text-zinc-600 rounded-full px-1.5 py-0.5">
                        {subtitles.length}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
          <div className="flex-1 min-w-0 w-full overflow-hidden">
            {video ? (
              <div className='space-y-1'>
                <div className="justify-between bg-white rounded-2xl border border-zinc-200 px-4 py-2 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {video.thumbnail && (
                      <img src={video.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">{video.title}</p>
                      <p className="text-xs text-zinc-500">
                        {formatTime(video.duration)} &nbsp;·&nbsp; Trim: {formatTime(trimStart)}–{formatTime(trimEnd)}
                        {audioTrack && <>&nbsp;·&nbsp; <span className="text-yellow-600">Audio ♪</span></>}
                        {subtitles.length > 0 && <>&nbsp;·&nbsp; <span className="text-yellow-600">{subtitles.length} subs</span></>}
                        {titleText.trim() && <>&nbsp;·&nbsp; <span className="text-yellow-600">Title</span></>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handlePreview}
                      disabled={previewLoading}
                      className="px-2 py-2 rounded-lg text-[11px] font-medium bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-200 disabled:text-zinc-400 text-white transition-colors"
                    >
                      {previewLoading ? 'Generating preview...' : 'Preview changes'}
                    </button>
                    {processedUrl && (
                      <button
                        onClick={() => setProcessedUrl(null)}
                        className="px-2 py-2 rounded-lg text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
                      >
                        Show original
                      </button>
                    )}
                    {previewError && (
                      <span className="text-xs text-red-400">{previewError}</span>
                    )}
                  </div>
                </div>

                {/* Player */}
                <div className="bg-white rounded-2xl border border-zinc-200 px-4 py-2">
                  <VideoPlayer />
                </div>

                {/* Subtitle preview overlay info */}
                {subtitles.length > 0 && (
                  <div className="bg-white rounded-2xl border border-zinc-200 p-3">
                    <h3 className="text-[11px] font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">Subtitle preview</h3>
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                      {subtitles.slice(0, 10).map((s, i) => (
                        <div key={i} className="flex items-start gap-3 text-xs border-b border-zinc-100 pb-1 last:border-0 last:pb-0">
                          <span className="font-mono text-zinc-400 flex-shrink-0">{s.startTime.slice(0, 8)}</span>
                          <span className="text-zinc-600 leading-tight">{s.text}</span>
                        </div>
                      ))}
                      {subtitles.length > 10 && (
                        <p className="text-zinc-400 text-xs italic">+{subtitles.length - 10} more...</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Empty state */
              <div className="bg-white rounded-2xl border border-zinc-200 border-dashed h-full min-h-[360px] sm:min-h-[500px] flex flex-col items-center justify-center p-8 sm:p-10 text-center">
                <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mb-4">
                  <Film size={28} className="text-zinc-500" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-700 mb-2">No video loaded</h2>
                <p className="text-sm text-zinc-500 max-w-xs">
                  Use the Import tab on the right to load a video from YouTube, Instagram, Facebook, or a local file.
                </p>
              </div>
            )}
          </div>

          {/* Active Panel (Right) */}
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 lg:sticky lg:top-[64px]">
            <div className="bg-white rounded-2xl p-4 border border-zinc-200 min-h-[300px] shadow-sm">
              {activeTab === 'import' && <ImportPanel />}
              {activeTab === 'edit' && <EditPanel />}
              {activeTab === 'audio' && <AudioEditor />}
              {activeTab === 'subtitles' && <SubtitleEditor />}
              {activeTab === 'logo' && <LogoEditor />}
              {activeTab === 'title' && <TitleEditor />}
              {activeTab === 'border' && <BorderEditor />}
              {activeTab === 'export' && <ExportPanel />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Inline edit panel (trim info + quick action)
function EditPanel() {
  const { video, trimStart, trimEnd, setTrimStart, setTrimEnd } = useStore()
  if (!video) return null

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-1">Edit</h2>
        <p className="text-sm text-zinc-500">Use the player on the right to set trim points</p>
      </div>

      <div className="bg-zinc-50 rounded-xl p-4 space-y-3 border border-zinc-200">
        <h3 className="text-sm font-medium text-zinc-700">Current selection</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 border border-zinc-200">
            <p className="text-xs text-zinc-500 mb-1">Start</p>
            <p className="text-lg font-mono font-semibold text-yellow-600">
              {formatTime2(trimStart)}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-zinc-200">
            <p className="text-xs text-zinc-500 mb-1">End</p>
            <p className="text-lg font-mono font-semibold text-yellow-600">
              {formatTime2(trimEnd)}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-zinc-200">
          <p className="text-xs text-zinc-500 mb-1">Duration</p>
          <p className="text-lg font-mono font-semibold text-zinc-900">
            {formatTime2(trimEnd - trimStart)}
          </p>
        </div>
      </div>

      <button
        onClick={() => { setTrimStart(0); setTrimEnd(video.duration) }}
        className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm transition-colors"
      >
        Reset to full video
      </button>

    </div>
  )
}

function formatTime2(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
