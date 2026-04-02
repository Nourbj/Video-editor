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
import { createSubtitles, mergeVideos, previewVideo, splitVideo } from './api/client'

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
    segments,
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
  const {
    video,
    trimStart,
    trimEnd,
    setTrimStart,
    setTrimEnd,
    setVideo,
    segments,
    addSegment,
    removeSegment,
    clearSegments,
    resetSegmentOutputs,
    setSegmentOutput,
    setProcessedUrl,
  } = useStore()
  const [splitLoading, setSplitLoading] = useState(false)
  const [mergeLoading, setMergeLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const selectionDuration = Math.max(0, trimEnd - trimStart)
  const readySegments = segments.filter(segment => segment.outputFilename)
  const totalPreparedDuration = segments.reduce((total, segment) => total + Math.max(0, segment.end - segment.start), 0)
  const mergedDuration = readySegments.reduce((total, segment) => total + Math.max(0, segment.end - segment.start), 0)
  if (!video) return null

  const handleAddSegment = () => {
    if (selectionDuration <= 0) {
      setStatus("Choose a valid range before adding a segment.")
      return
    }

    addSegment({
      label: `Segment ${segments.length + 1}`,
      start: trimStart,
      end: trimEnd,
    })
    setTrimStart(0)
    setTrimEnd(video.duration)
    setStatus(`Segment ${segments.length + 1} added.`)
  }

  const handleSplit = async () => {
    if (segments.length === 0) {
      setStatus('Add at least one segment before splitting.')
      return
    }

    setSplitLoading(true)
    setStatus('Splitting segments...')
    resetSegmentOutputs()

    try {
      const result = await splitVideo(
        video.filename,
        segments.map(segment => ({
          startTime: segment.start,
          endTime: segment.end,
          label: segment.label,
        })),
      )

      result.segments.forEach((segmentResult, index) => {
        const segment = segments[index]
        if (!segment) return
        setSegmentOutput(segment.id, {
          filename: segmentResult.filename,
          url: segmentResult.url,
        })
      })

      setStatus(`${result.segments.length} segment(s) generated.`)
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : 'Split failed.')
    } finally {
      setSplitLoading(false)
    }
  }

  const handleMerge = async () => {
    if (readySegments.length < 2) {
      setStatus('At least two generated segments are required to merge.')
      return
    }

    setMergeLoading(true)
    setStatus('Merging segments...')

    try {
      const result = await mergeVideos(readySegments.map(segment => segment.outputFilename!).filter(Boolean))
      const mergedDuration = readySegments.reduce((total, segment) => total + Math.max(0, segment.end - segment.start), 0)
      setVideo({
        ...video,
        id: crypto.randomUUID(),
        filename: result.filename,
        url: result.url,
        duration: mergedDuration,
      })
      setProcessedUrl(null)
      setStatus('Merge complete. The merged video is now the current project source.')
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : 'Merge failed.')
    } finally {
      setMergeLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-1">Edit</h2>
        <p className="text-sm text-zinc-500">Create a selection, add it as a segment, then split and merge your generated clips.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-cyan-50 via-white to-white p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-700">Step 1</p>
            <h3 className="text-sm font-semibold text-zinc-900 mt-1">Current selection</h3>
            <p className="text-xs text-zinc-500 mt-1">Set the trim handles in the player, then save this range as a segment.</p>
          </div>
          <div className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-medium text-cyan-800">
            {formatTime2(selectionDuration)}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="rounded-xl border border-white/80 bg-white p-3 shadow-sm">
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 mb-1">Start</p>
            <p className="text-lg font-mono font-semibold text-zinc-900">{formatTime2(trimStart)}</p>
          </div>
          <div className="rounded-xl border border-white/80 bg-white p-3 shadow-sm">
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 mb-1">End</p>
            <p className="text-lg font-mono font-semibold text-zinc-900">{formatTime2(trimEnd)}</p>
          </div>
          <div className="rounded-xl border border-white/80 bg-white p-3 shadow-sm">
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 mb-1">Duration</p>
            <p className="text-lg font-mono font-semibold text-cyan-700">{formatTime2(selectionDuration)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
            <span>Selection preview</span>
            <span>{formatTime2(trimStart)} {'->'} {formatTime2(trimEnd)}</span>
          </div>
          <div className="relative h-3 rounded-full bg-zinc-100 overflow-hidden">
            <div
              className="absolute inset-y-0 rounded-full bg-gradient-to-r from-cyan-500 to-teal-400"
              style={{
                left: `${video.duration ? (trimStart / video.duration) * 100 : 0}%`,
                width: `${video.duration ? ((trimEnd - trimStart) / video.duration) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleAddSegment}
          className="py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-cyan-500/20"
        >
          Add Current Range
        </button>
        <button
          onClick={() => { setTrimStart(0); setTrimEnd(video.duration) }}
          className="py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors"
        >
          Use Full Clip
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-yellow-700">Step 2</p>
            <h3 className="text-sm font-semibold text-zinc-900 mt-1">Build your segment list</h3>
            <p className="text-xs text-zinc-500 mt-1">{segments.length} segment(s) prepared, total runtime {formatTime2(totalPreparedDuration)}</p>
          </div>
          {segments.length > 0 && (
            <button
              onClick={() => {
                clearSegments()
                setStatus('Segment list cleared.')
              }}
              className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 mb-3">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
            <span>Timeline map</span>
            <span>{formatTime2(video.duration)} source clip</span>
          </div>
          <div className="relative h-5 rounded-full bg-zinc-200 overflow-hidden">
            {segments.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-[11px] text-zinc-400">
                No saved ranges yet
              </div>
            ) : (
              segments.map((segment, index) => (
                <div
                  key={segment.id}
                  className={`absolute inset-y-0 flex items-center justify-center text-[10px] font-semibold text-white ${segment.outputFilename ? 'bg-emerald-500' : 'bg-cyan-600'}`}
                  style={{
                    left: `${video.duration ? (segment.start / video.duration) * 100 : 0}%`,
                    width: `${video.duration ? ((segment.end - segment.start) / video.duration) * 100 : 0}%`,
                    minWidth: '24px',
                  }}
                  title={`${segment.label} | ${formatTime2(segment.start)} -> ${formatTime2(segment.end)}`}
                >
                  {index + 1}
                </div>
              ))
            )}
          </div>
        </div>

        {segments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-6 text-sm text-zinc-500">
            No segments yet. Use the player selection, then click Add segment.
          </div>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {segments.map((segment, index) => (
              <div key={segment.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-zinc-900">{segment.label || `Segment ${index + 1}`}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${segment.outputFilename ? 'bg-emerald-100 text-emerald-700' : 'bg-cyan-100 text-cyan-700'}`}>
                        {segment.outputFilename ? 'Generated' : 'Draft'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">{formatTime2(segment.start)} {'->'} {formatTime2(segment.end)}</p>
                    <p className="text-xs text-zinc-400 mt-1">Length {formatTime2(segment.end - segment.start)}</p>
                  </div>
                  <button
                    onClick={() => {
                      removeSegment(segment.id)
                      setStatus(`Segment ${index + 1} removed.`)
                    }}
                    className="text-xs text-red-500 hover:text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
                <div className="relative h-2 rounded-full bg-white overflow-hidden mt-3 mb-2">
                  <div
                    className={`absolute inset-y-0 rounded-full ${segment.outputFilename ? 'bg-emerald-500' : 'bg-cyan-500'}`}
                    style={{
                      left: `${video.duration ? (segment.start / video.duration) * 100 : 0}%`,
                      width: `${video.duration ? ((segment.end - segment.start) / video.duration) * 100 : 0}%`,
                    }}
                  />
                </div>
                {segment.outputFilename ? (
                  <p className="text-xs text-emerald-600 break-all">Ready: {segment.outputFilename}</p>
                ) : (
                  <p className="text-xs text-zinc-400">Not generated yet</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Step 3 and 4</p>
          <h3 className="text-sm font-semibold text-zinc-900 mt-1">Generate clips, then merge them</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Split exports each saved range as its own clip. Merge stitches the generated clips together in list order.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleSplit}
            disabled={splitLoading || segments.length === 0}
            className="py-3 bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-200 disabled:text-zinc-400 text-zinc-950 rounded-xl text-sm font-semibold transition-colors"
          >
            {splitLoading ? 'Splitting...' : 'Generate Clips'}
          </button>
          <button
            onClick={handleMerge}
            disabled={mergeLoading || readySegments.length < 2}
            className="py-3 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {mergeLoading ? 'Merging...' : 'Merge Generated Clips'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2 text-zinc-600">
            Ready clips: <span className="font-semibold text-zinc-900">{readySegments.length}</span>
          </div>
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2 text-zinc-600">
            Merged runtime: <span className="font-semibold text-zinc-900">{formatTime2(mergedDuration)}</span>
          </div>
        </div>
      </div>

      {status && (
        <div className="rounded-xl border border-zinc-200 bg-cyan-50 px-3 py-2 text-sm text-zinc-700">
          {status}
        </div>
      )}
    </div>
  )
}

function formatTime2(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}


