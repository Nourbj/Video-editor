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
  const duration = video?.duration || 0

  const src = processedUrl || video?.url || ''

  useEffect(() => {
    if (video) setTrimEnd(video.duration)
  }, [video])

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
    if (videoRef.current) videoRef.current.currentTime = t
    setCurrentTime(t)
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
      <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
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
      <div className="bg-zinc-800/60 rounded-xl p-3 space-y-2">
        {/* Scrubber */}
        <div className="flex items-center gap-3">
          <button onClick={togglePlay} className="text-white hover:text-violet-400 transition-colors flex-shrink-0">
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 accent-violet-500 h-1"
          />
          <span className="text-xs text-zinc-400 font-mono w-20 text-right">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <Volume2 size={14} className="text-zinc-500" />
          <input
            type="range" min={0} max={1} step={0.05} value={volume}
            onChange={handleVolume}
            className="w-24 accent-violet-500 h-1"
          />
        </div>
      </div>

      {/* Trim range */}
      <div className="bg-zinc-800/60 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-medium text-zinc-300">Trim</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 w-12">Start</span>
            <input
              type="range" min={0} max={duration} step={0.1} value={trimStart}
              onChange={e => {
                const v = parseFloat(e.target.value)
                if (v < trimEnd) setTrimStart(v)
              }}
              className="flex-1 accent-violet-500 h-1"
            />
            <span className="text-xs text-zinc-400 font-mono w-12 text-right">{formatTime(trimStart)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 w-12">End</span>
            <input
              type="range" min={0} max={duration} step={0.1} value={trimEnd}
              onChange={e => {
                const v = parseFloat(e.target.value)
                if (v > trimStart) setTrimEnd(v)
              }}
              className="flex-1 accent-violet-500 h-1"
            />
            <span className="text-xs text-zinc-400 font-mono w-12 text-right">{formatTime(trimEnd)}</span>
          </div>
        </div>

        {/* Visual trim bar */}
        <div className="relative h-6 bg-zinc-700 rounded-lg overflow-hidden">
          <div
            className="absolute top-0 h-full bg-violet-600/60 rounded"
            style={{
              left: `${(trimStart / duration) * 100}%`,
              right: `${100 - (trimEnd / duration) * 100}%`,
            }}
          />
          <div
            className="absolute top-0 h-full w-0.5 bg-white/80"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        </div>
        <p className="text-xs text-zinc-500">
          Selection: {formatTime(trimEnd - trimStart)} &nbsp;|&nbsp; {formatTime(trimStart)} → {formatTime(trimEnd)}
        </p>
      </div>
    </div>
  )
}
