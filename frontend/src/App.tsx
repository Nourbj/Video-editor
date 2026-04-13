import React, { useEffect, useRef, useState } from 'react'
import { Upload, Scissors, FileText, Download, Film, RotateCcw, Image as ImageIcon, Type, Square, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from './store/useStore'
import ImportPanel from './components/ImportPanel/ImportPanel'
import VideoPlayer from './components/VideoPlayer/VideoPlayer'
import SubtitleEditor from './components/SubtitleEditor/SubtitleEditor'
import ExportPanel from './components/ExportPanel/ExportPanel'
import LogoEditor from './components/LogoEditor/LogoEditor'
import TitleEditor from './components/TitleEditor/TitleEditor'
import BorderEditor from './components/BorderEditor/BorderEditor'
import { EditSidebar } from './components/VideoTimeline/VideoTimeline'
import { previewVideo } from './api/client'

type Tab = 'import' | 'edit' | 'audio' | 'subtitles' | 'logo' | 'title' | 'border' | 'export'

const TABS: { id: Tab; label: string; icon: React.ReactNode; requiresVideo?: boolean }[] = [
  { id: 'import', label: 'Import', icon: <Upload size={15} /> },
  { id: 'edit', label: 'Edit', icon: <Scissors size={15} />, requiresVideo: true },
  { id: 'subtitles', label: 'Subtitles', icon: <FileText size={15} />, requiresVideo: true },
  { id: 'logo', label: 'Logo', icon: <ImageIcon size={15} />, requiresVideo: true },
  { id: 'border', label: 'Border', icon: <Square size={15} />, requiresVideo: true },
  { id: 'title', label: 'Title', icon: <Type size={15} />, requiresVideo: true },
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
    segments,
    audioTrack, audioDuration, audioApplied, appliedAudioVolume, appliedReplaceOriginal, appliedAudioTrimStart, appliedAudioTrimEnd, subtitles,
    subtitleFilename, setSubtitleFilename,
    subtitleStyle,
    logoImage, logoSize, logoX, logoY,
    titleText, titleFont, titleSize, titleColor, titleBgColor, titleBorderColor, titleBorderWidth, titleFrameColor, titleFrameWidth, titlePadding, titleX, titleY,
    borderEnabled, borderWidth, borderHeight, borderColor, borderMode,
    exportQuality,
    exportAspectRatio,
    processedUrl, setProcessedUrl,
    previewLoading, setPreviewLoading,
  } = useStore()

  const [previewError, setPreviewError] = useState<string | null>(null)
  const debounceRef = useRef<number | null>(null)
  const lastPreviewSig = useRef<string>('')
  const pendingSig = useRef<string>('')

  const handlePreview = async () => {
    if (!video) return
    setPreviewLoading(true)
    setPreviewError(null)

    const hasTrim = trimStart > 0 || trimEnd < video.duration
    const hasAppliedAudio = !!audioTrack && audioApplied
    const hasAppliedAudioTrim = hasAppliedAudio && audioDuration > 0 && (appliedAudioTrimStart > 0 || appliedAudioTrimEnd < audioDuration)

    try {
      const result = await previewVideo({
        filename: video.filename,
        quality: exportQuality,
        aspectRatio: exportAspectRatio,
        startTime: hasTrim ? trimStart : undefined,
        endTime: hasTrim ? trimEnd : undefined,
        audioFilename: hasAppliedAudio ? audioTrack?.filename : undefined,
        audioStartTime: hasAppliedAudioTrim ? appliedAudioTrimStart : undefined,
        audioEndTime: hasAppliedAudioTrim ? appliedAudioTrimEnd : undefined,
        subtitleFilename: subtitleFilename || undefined,
        subtitleStyle,
        titleStyle: titleText.trim() ? {
          text: titleText.trim(),
          font: titleFont,
          size: titleSize,
          color: titleColor,
          bgColor: titleBgColor,
          borderColor: titleBorderColor,
          borderWidth: titleBorderWidth,
          frameColor: titleFrameColor,
          frameWidth: titleFrameWidth,
          padding: titlePadding,
          x: titleX ?? undefined,
          y: titleY ?? undefined,
        } : undefined,
        borderStyle: {
          enabled: borderEnabled,
          sizeX: borderWidth,
          sizeY: borderHeight,
          color: borderColor,
          mode: borderMode,
        },
        logoFilename: logoImage?.filename,
        logoSize,
        logoX: logoX ?? undefined,
        logoY: logoY ?? undefined,
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
    const hasSubtitlesApplied = subtitles.length > 0 && !!subtitleFilename
    const hasLogo = !!logoImage
    const hasTitle = titleText.trim().length > 0
    const hasBorder = borderEnabled && (borderWidth > 0 || borderHeight > 0)
    const hasAppliedAudio = !!audioTrack && audioApplied
    const hasAppliedAudioTrim = hasAppliedAudio && audioDuration > 0 && (appliedAudioTrimStart > 0 || appliedAudioTrimEnd < audioDuration)
    const hasChanges = hasTrim || hasAppliedAudio || hasAppliedAudioTrim || hasSubtitlesApplied || hasLogo || hasTitle || hasBorder

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
      subtitleFilename,
      subtitleStyle,
      exportQuality,
      logo: logoImage ? { id: logoImage.id, size: logoSize, x: logoX, y: logoY } : null,
      title: titleText.trim() ? { text: titleText, font: titleFont, size: titleSize, color: titleColor, bg: titleBgColor, border: titleBorderColor, bw: titleBorderWidth, frame: titleFrameColor, fw: titleFrameWidth, pad: titlePadding } : null,
      titleXY: titleX !== null && titleY !== null ? { x: titleX, y: titleY } : null,
      border: borderEnabled ? { sizeX: borderWidth, sizeY: borderHeight, color: borderColor } : null,
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
    subtitleFilename,
    subtitleStyle,
    exportQuality,
    logoImage,
    logoSize,
    logoX,
    logoY,
    titleText,
    titleFont,
    titleSize,
    titleColor,
    titleBgColor,
    titleBorderColor,
    titleBorderWidth,
    titleFrameColor,
    titleFrameWidth,
    titlePadding,
    titleX,
    titleY,
    borderEnabled,
    borderWidth,
    borderHeight,
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
        <div className="flex flex-col lg:flex-row gap-2 items-start">
          <div className="w-full lg:w-44 flex-shrink-0 lg:sticky lg:top-[64px]">
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
                        {segments.length > 0 && <>&nbsp;·&nbsp; <span className="text-yellow-600">{segments.length} segments</span></>}
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
          <div className="w-full lg:w-96 xl:w-[28rem] flex-shrink-0 lg:sticky lg:top-[64px]">
            <div className="bg-white rounded-2xl p-4 border border-zinc-200 min-h-[300px] shadow-sm">
              {activeTab === 'import' && <ImportPanel />}
              {activeTab === 'edit' && <EditPanel />}
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
  const {
    video,
    trimStart,
    trimEnd,
    segments,
    setTrimStart,
    setTrimEnd,
  } = useStore()
  if (!video) return null

  const minGap = 0.1
  const duration = video.duration || 0

  const nudgeStart = (delta: number) => {
    const nextStart = Math.max(0, Math.min(trimStart + delta, trimEnd - minGap))
    setTrimStart(nextStart)
  }

  const nudgeEnd = (delta: number) => {
    const nextEnd = Math.min(duration, Math.max(trimEnd + delta, trimStart + minGap))
    setTrimEnd(nextEnd)
  }

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-1">Edit</h2>
        <p className="text-xs text-zinc-500">
          Use the timeline to set In/Out points, scrub, refine with handles, and quickly adjust start/end for faster cuts and splits.
        </p>
      </div>
      <div className="rounded-xl border border-cyan-100 bg-[linear-gradient(180deg,#f2fcff_0%,#f8fdff_100%)] px-3 py-3 space-y-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        <div>
          <p className="text-xs text-cyan-700/60">Timeline — Current Selection</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-cyan-200 bg-white/80 px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.16em] text-cyan-700/60">Start</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-zinc-900">{formatTime2(trimStart)}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => nudgeStart(-1)}
                  className="rounded-md border border-cyan-200 bg-cyan-50 p-1 text-cyan-700 hover:bg-cyan-100"
                  aria-label="Move start earlier by one second"
                >
                  <ChevronLeft size={12} />
                </button>
                <button
                  onClick={() => nudgeStart(1)}
                  className="rounded-md border border-cyan-200 bg-cyan-50 p-1 text-cyan-700 hover:bg-cyan-100"
                  aria-label="Move start later by one second"
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-cyan-200 bg-white/80 px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.16em] text-cyan-700/60">End</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-zinc-900">{formatTime2(trimEnd)}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => nudgeEnd(-1)}
                  className="rounded-md border border-cyan-200 bg-cyan-50 p-1 text-cyan-700 hover:bg-cyan-100"
                  aria-label="Move end earlier by one second"
                >
                  <ChevronLeft size={12} />
                </button>
                <button
                  onClick={() => nudgeEnd(1)}
                  className="rounded-md border border-cyan-200 bg-cyan-50 p-1 text-cyan-700 hover:bg-cyan-100"
                  aria-label="Move end later by one second"
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <EditSidebar />
    </div>
  )
}

function formatTime2(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}


