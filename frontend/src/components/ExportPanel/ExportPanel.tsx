import React, { useState } from 'react'
import { Download, Loader2, CheckCircle2, Scissors, Music, FileText } from 'lucide-react'
import { cutVideo, mergeAudio, createSubtitles, exportVideo } from '../../api/client'
import { useStore } from '../../store/useStore'

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function ExportPanel() {
  const {
    video, trimStart, trimEnd,
    audioTrack, audioVolume, replaceOriginalAudio,
    subtitles, subtitleFilename,
    exportQuality, setExportQuality,
    setProcessedUrl, setActiveTab,
  } = useStore()

  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('')
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasTrim = video && (trimStart > 0 || trimEnd < video.duration)
  const hasAudio = !!audioTrack
  const hasSubtitles = subtitles.length > 0

  const handleExport = async () => {
    if (!video) return
    setLoading(true)
    setError(null)
    setDone(null)

    try {
      // Save subtitles if needed
      let subFile = subtitleFilename
      if (hasSubtitles && !subFile) {
        setStep('Saving subtitles...')
        const res = await createSubtitles(subtitles)
        subFile = res.filename
      }

      setStep('Processing and exporting...')
      const result = await exportVideo({
        filename: video.filename,
        quality: exportQuality,
        startTime: hasTrim ? trimStart : undefined,
        endTime: hasTrim ? trimEnd : undefined,
        audioFilename: audioTrack?.filename,
        subtitleFilename: subFile || undefined,
      })

      setProcessedUrl(result.url)
      setDone(result.url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setLoading(false)
      setStep('')
    }
  }

  if (!video) {
    return (
      <div className="text-center py-12 text-zinc-600">
        <p>Import a video first</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Export</h2>
        <p className="text-sm text-zinc-400">Review settings and export your final video</p>
      </div>

      {/* Summary */}
      <div className="bg-zinc-800/60 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-300">Export summary</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-zinc-400"><Scissors size={13} /> Trim</span>
            <span className="text-zinc-200 font-mono text-xs">
              {hasTrim ? `${formatTime(trimStart)} → ${formatTime(trimEnd)} (${formatTime(trimEnd - trimStart)})` : 'Full video'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-zinc-400"><Music size={13} /> Audio</span>
            <span className="text-zinc-200 text-xs">
              {hasAudio ? `${audioTrack!.filename} (${Math.round(audioVolume * 100)}%, ${replaceOriginalAudio ? 'replace' : 'mix'})` : 'Original'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-zinc-400"><FileText size={13} /> Subtitles</span>
            <span className="text-zinc-200 text-xs">
              {hasSubtitles ? `${subtitles.length} entries` : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Quality */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Output quality</label>
        <div className="flex gap-2">
          {(['480p', '720p', '1080p'] as const).map(q => (
            <button
              key={q}
              onClick={() => setExportQuality(q)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                exportQuality === q
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Export button */}
      {!done ? (
        <button
          onClick={handleExport}
          disabled={loading}
          className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-xl font-semibold text-base transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              {step || 'Processing...'}
            </>
          ) : (
            <>
              <Download size={18} />
              Export video
            </>
          )}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle2 size={16} />
            Export complete!
          </div>
          <a
            href={done}
            download
            className="block w-full py-3.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold text-base text-center transition-colors flex items-center justify-center gap-2"
          >
            <Download size={18} />
            Download MP4
          </a>
          <button
            onClick={() => { setDone(null); setError(null) }}
            className="w-full py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-xl text-sm transition-colors"
          >
            Export again with different settings
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
