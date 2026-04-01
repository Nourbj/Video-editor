import React, { useRef, useState, useEffect } from 'react'
import { Music, Upload, X, Volume2, Replace, Link, Loader2 } from 'lucide-react'
import { uploadAudio, downloadAudioFromUrl } from '../../api/client'
import { useStore } from '../../store/useStore'

export default function AudioEditor() {
  const {
    audioTrack, setAudioTrack,
    audioVolume, setAudioVolume,
    replaceOriginalAudio, setReplaceOriginalAudio,
    audioDuration, setAudioDuration,
    audioTrimStart, audioTrimEnd, setAudioTrimStart, setAudioTrimEnd,
    audioApplied, setAudioApplied, setAppliedAudioSettings,
    appliedAudioVolume, appliedReplaceOriginal, appliedAudioTrimStart, appliedAudioTrimEnd,
  } = useStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'file' | 'url'>('file')
  const [urlInput, setUrlInput] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    setCurrentTime(0)
  }, [audioTrack?.id])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    if (audioTrimEnd > 0) {
      if (a.currentTime < audioTrimStart || a.currentTime > audioTrimEnd) {
        a.currentTime = audioTrimStart
        setCurrentTime(audioTrimStart)
      }
    }
  }, [audioTrimStart, audioTrimEnd])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleAudioUpload = async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      setError('Please select an audio file (MP3, WAV, AAC...)')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await uploadAudio(file)
      setAudioTrack({ ...result, volume: audioVolume, replaceOriginal: replaceOriginalAudio })
      setAudioApplied(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const handleAudioUrl = async () => {
    if (!urlInput.trim()) return
    setLoading(true)
    setError(null)
    try {
      const result = await downloadAudioFromUrl(urlInput.trim())
      setAudioTrack({ ...result, volume: audioVolume, replaceOriginal: replaceOriginalAudio })
      setAudioApplied(false)
      setUrlInput('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-1">Audio</h2>
        <p className="text-sm text-zinc-500">Add background music or replace the original audio</p>
      </div>

      {/* Upload zone */}
      {!audioTrack ? (
        <div className="space-y-3">
          {/* Tab switcher */}
          <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
            <button
              onClick={() => setTab('file')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === 'file' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <Upload size={13} /> File
            </button>
            <button
              onClick={() => setTab('url')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === 'url' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <Link size={13} /> URL
            </button>
          </div>

          {tab === 'file' ? (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-zinc-300 hover:border-zinc-400 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-zinc-50"
            >
              <input
                ref={fileRef}
                type="file"
                accept="audio/*"
                className="hidden"
                aria-label="Upload audio file"
                onChange={e => e.target.files?.[0] && handleAudioUpload(e.target.files[0])}
              />
              <Music size={28} className="mx-auto mb-3 text-zinc-400" />
              <p className="text-zinc-700 font-medium">Upload audio track</p>
              <p className="text-zinc-500 text-sm mt-1">MP3, WAV, AAC, FLAC</p>
              {loading && <p className="text-cyan-600 text-sm mt-2 animate-pulse">Uploading...</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-zinc-500">Paste a YouTube or other URL to extract the audio</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAudioUrl()}
                  placeholder="https://youtube.com/watch?v=..."
                  className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  onClick={handleAudioUrl}
                  disabled={loading || !urlInput.trim()}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Link size={14} />}
                  {loading ? 'Loading...' : 'Import'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-zinc-50 rounded-xl p-4 space-y-4 border border-zinc-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-600/20 rounded-lg flex items-center justify-center">
                <Music size={18} className="text-cyan-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900">{audioTrack.filename}</p>
                <p className="text-xs text-zinc-500">Audio track loaded</p>
              </div>
            </div>
            <button
              onClick={() => setAudioTrack(null)}
              aria-label="Remove audio track"
              className="p-1.5 hover:bg-zinc-200 rounded-lg transition-colors text-zinc-500 hover:text-zinc-900"
            >
              <X size={16} />
            </button>
          </div>

          {/* Audio element for preview */}
          <audio
            ref={audioRef}
            controls
            src={audioTrack.url}
            className="w-full h-8"
            style={{ height: 32 }}
            onLoadedMetadata={() => {
              const d = audioRef.current?.duration || 0
              if (d > 0) {
                setAudioDuration(d)
                setAudioTrimStart(0)
                setAudioTrimEnd(d)
                setAudioApplied(false)
              }
            }}
            onTimeUpdate={() => {
              const a = audioRef.current
              if (!a) return
              if (audioTrimEnd > 0 && a.currentTime >= audioTrimEnd) {
                a.pause()
                a.currentTime = audioTrimStart
                setCurrentTime(audioTrimStart)
                return
              }
              setCurrentTime(a.currentTime)
            }}
            onPlay={() => {
              const a = audioRef.current
              if (!a) return
              if (audioTrimEnd > 0 && (a.currentTime < audioTrimStart || a.currentTime > audioTrimEnd)) {
                a.currentTime = audioTrimStart
                setCurrentTime(audioTrimStart)
              }
            }}
            onSeeking={() => {
              const a = audioRef.current
              if (!a || audioTrimEnd <= 0) return
              if (a.currentTime < audioTrimStart) a.currentTime = audioTrimStart
              if (a.currentTime > audioTrimEnd) a.currentTime = audioTrimEnd
            }}
          />
        </div>
      )}

      {audioTrack && (
        <>
          {/* Audio trim */}
          <div className="bg-zinc-50 rounded-xl p-3 space-y-2 border border-zinc-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-700">Trim</h3>
              <p className="text-xs text-zinc-500">
                Selection: {formatTime(Math.max(0, audioTrimEnd - audioTrimStart))} ({formatTime(audioTrimStart)} → {formatTime(audioTrimEnd)})
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 w-8">Start</span>
                <input
                  type="range" min={0} max={audioDuration} step={0.1} value={audioTrimStart}
                  onChange={e => {
                    const v = parseFloat(e.target.value)
                if (v < audioTrimEnd) setAudioTrimStart(v)
                setAudioApplied(false)
              }}
                  aria-label="Audio trim start"
                  className="flex-1 accent-yellow-600 h-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 w-8">End</span>
                <input
                  type="range" min={0} max={audioDuration} step={0.1} value={audioTrimEnd}
                  onChange={e => {
                    const v = parseFloat(e.target.value)
                if (v > audioTrimStart) setAudioTrimEnd(v)
                setAudioApplied(false)
              }}
                  aria-label="Audio trim end"
                  className="flex-1 accent-yellow-600 h-1"
                />
              </div>
            </div>

            {/* Visual trim bar */}
            <div className="relative h-2 bg-zinc-200 rounded-full overflow-hidden mt-1">
              <div
                className="absolute top-0 h-full bg-cyan-600/60 rounded"
                style={{
                  left: `${audioDuration ? (audioTrimStart / audioDuration) * 100 : 0}%`,
                  right: `${audioDuration ? 100 - (audioTrimEnd / audioDuration) * 100 : 0}%`,
                }}
              />
              <div
                className="absolute top-0 h-full w-[2px] bg-zinc-900/70"
                style={{ left: `${audioDuration ? (currentTime / audioDuration) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Replace or mix */}
          <div className="bg-zinc-50 rounded-xl p-4 space-y-3 border border-zinc-200">
            <h3 className="text-sm font-medium text-zinc-700 flex items-center gap-2">
              <Replace size={14} />
              Mode
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => { console.log('[AudioEditor] setReplaceOriginalAudio(false)'); setReplaceOriginalAudio(false); setAudioApplied(false) }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  !replaceOriginalAudio
                    ? 'bg-cyan-600 text-white'
                    : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
                }`}
              >
                Mix with original
              </button>
              <button
                onClick={() => { console.log('[AudioEditor] setReplaceOriginalAudio(true)'); setReplaceOriginalAudio(true); setAudioApplied(false) }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  replaceOriginalAudio
                    ? 'bg-cyan-600 text-white'
                    : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
                }`}
              >
                Replace original
              </button>
            </div>
          </div>

          {/* Volume */}
          <div className="bg-zinc-50 rounded-xl p-4 space-y-3 border border-zinc-200">
            <h3 className="text-sm font-medium text-zinc-700 flex items-center gap-2">
              <Volume2 size={14} />
              Audio volume — {Math.round(audioVolume * 100)}%
            </h3>
            <input
              type="range" min={0} max={2} step={0.05} value={audioVolume}
              onChange={e => { setAudioVolume(parseFloat(e.target.value)); setAudioApplied(false) }}
              aria-label="Audio volume"
              className="w-full accent-yellow-600"
            />
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Mute</span><span>Normal</span><span>Boost ×2</span>
            </div>
          </div>

          {/* Apply audio */}
          <div className="bg-zinc-50 rounded-xl p-4 space-y-3 border border-zinc-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-zinc-700">Apply audio</h3>
                <p className="text-xs text-zinc-500">
                  {audioApplied
                    ? `Applied: ${formatTime(appliedAudioTrimStart)} → ${formatTime(appliedAudioTrimEnd)} · ${Math.round(appliedAudioVolume * 100)}% · ${appliedReplaceOriginal ? 'replace' : 'mix'}`
                    : 'Audio changes are not applied yet'}
                </p>
              </div>
              <button
                onClick={() => setAppliedAudioSettings({
                  volume: audioVolume,
                  replaceOriginal: replaceOriginalAudio,
                  trimStart: audioTrimStart,
                  trimEnd: audioTrimEnd,
                })}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
              >
                Apply audio
              </button>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
