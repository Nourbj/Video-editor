import React, { useRef, useState, useEffect } from 'react'
import { Play, Pause, Volume2 } from 'lucide-react'
import { useStore } from '../../store/useStore'

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function VideoPlayer() {
  const { video, trimStart, trimEnd, setTrimStart, setTrimEnd, processedUrl } = useStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(1)
  const fullDuration = video?.duration || 0
  const effectiveStart = trimStart
  const effectiveEnd = trimEnd || fullDuration
  const effectiveDuration = Math.max(0, effectiveEnd - effectiveStart)

  const src = processedUrl || video?.url || ''

  useEffect(() => {
    if (video) setTrimEnd(video.duration)
  }, [video])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (v.currentTime < effectiveStart || v.currentTime > effectiveEnd) {
      v.currentTime = effectiveStart
      setCurrentTime(effectiveStart)
    }
  }, [effectiveStart, effectiveEnd])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    // Reset progress to start of trim when trim bounds change
    v.currentTime = effectiveStart
    setCurrentTime(effectiveStart)
    setPlaying(false)
    v.pause()
  }, [effectiveStart, effectiveEnd])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (playing) { v.pause(); setPlaying(false) }
    else { v.play(); setPlaying(true) }
  }

  const handleTimeUpdate = () => {
    const v = videoRef.current
    if (!v) return
    setCurrentTime(v.currentTime)
    if (v.currentTime >= trimEnd) { v.pause(); setPlaying(false) }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value)
    const next = effectiveStart + t
    if (videoRef.current) videoRef.current.currentTime = next
    setCurrentTime(next)
  }

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (videoRef.current) videoRef.current.volume = v
  }

  if (!video) return null

  return (
    <div className="space-y-3">
      {/* Video */}
      <div className="relative bg-zinc-100 rounded-xl overflow-hidden aspect-video">
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setPlaying(false)}
          onLoadedMetadata={() => {
            if (videoRef.current) videoRef.current.currentTime = trimStart
          }}
        />
        {/* Click to play/pause */}
        <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={togglePlay}>
          {!playing && (
            <div className="w-14 h-14 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Play size={24} className="text-white ml-1" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-zinc-50 rounded-xl p-3 space-y-2 border border-zinc-200">
        {/* Scrubber */}
        <div className="flex items-center gap-3">
          <button onClick={togglePlay} className="text-zinc-900 hover:text-cyan-600 transition-colors flex-shrink-0">
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <input
            type="range"
            min={0}
            max={effectiveDuration || 0}
            step={0.1}
            value={Math.max(0, currentTime - effectiveStart)}
            onChange={handleSeek}
            aria-label="Seek video"
            className="flex-1 accent-cyan-600 h-1"
          />
          <span className="text-xs text-zinc-500 font-mono w-20 text-right">
            {formatTime(Math.max(0, currentTime - effectiveStart))} / {formatTime(effectiveDuration)}
          </span>
        </div>
        <div className="text-[11px] text-zinc-500 font-mono text-right">
          Total: {formatTime(fullDuration)}
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <Volume2 size={14} className="text-zinc-500" />
          <input
            type="range" min={0} max={1} step={0.05} value={volume}
            onChange={handleVolume}
            aria-label="Video volume"
            className="w-24 accent-cyan-600 h-1"
          />
        </div>
      </div>

      {/* Trim range */}
      <div className="bg-zinc-50 rounded-xl p-4 space-y-3 border border-zinc-200">
        <h3 className="text-sm font-medium text-zinc-700">Trim</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 w-12">Start</span>
            <input
              type="range" min={0} max={fullDuration} step={0.1} value={trimStart}
              onChange={e => {
                const v = parseFloat(e.target.value)
                if (v < trimEnd) setTrimStart(v)
              }}
              aria-label="Trim start"
              className="flex-1 accent-yellow-600 h-1"
            />
            <span className="text-xs text-zinc-500 font-mono w-12 text-right">{formatTime(trimStart)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 w-12">End</span>
            <input
              type="range" min={0} max={fullDuration} step={0.1} value={trimEnd}
              onChange={e => {
                const v = parseFloat(e.target.value)
                if (v > trimStart) setTrimEnd(v)
              }}
              aria-label="Trim end"
              className="flex-1 accent-yellow-600 h-1"
            />
            <span className="text-xs text-zinc-500 font-mono w-12 text-right">{formatTime(trimEnd)}</span>
          </div>
        </div>

        {/* Visual trim bar */}
        <div className="relative h-6 bg-zinc-200 rounded-lg overflow-hidden">
          <div
            className="absolute top-0 h-full bg-cyan-600/60 rounded"
            style={{
              left: `${fullDuration ? (trimStart / fullDuration) * 100 : 0}%`,
              right: `${fullDuration ? 100 - (trimEnd / fullDuration) * 100 : 0}%`,
            }}
          />
          <div
            className="absolute top-0 h-full w-0.5 bg-zinc-900/70"
            style={{ left: `${fullDuration ? (currentTime / fullDuration) * 100 : 0}%` }}
          />
        </div>
        <p className="text-xs text-zinc-500">
          Selection: {formatTime(trimEnd - trimStart)} &nbsp;|&nbsp; {formatTime(trimStart)} → {formatTime(trimEnd)}
        </p>
      </div>
    </div>
  )
}
