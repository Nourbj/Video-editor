import React, { useRef, useState, useEffect } from 'react'
import { Play, Pause, Volume2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { withMediaBase } from '../../utils/media'
import VideoTimeline from '../VideoTimeline/VideoTimeline'
import AudioEditor from '../AudioEditor/AudioEditor'

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function VideoPlayer() {
  const {
    video, trimStart, trimEnd, setTrimEnd, processedUrl,
    audioTrack, audioVolume, audioDuration,
    audioApplied, appliedAudioVolume, appliedReplaceOriginal, appliedAudioTrimStart, appliedAudioTrimEnd,
    activeTab,
    titleText, titleFont, titleSize, titleColor, titleBgColor, titleBorderColor, titleBorderWidth, titleFrameColor, titleFrameWidth, titlePadding, titleX, titleY, titleDraftX, titleDraftY, setTitleDraftXY,
    titleDraftText,
    isApplyingTitle,
    previewLoading,
    logoDraftImage, logoDraftSize, logoDraftX, logoDraftY, setLogoDraftXY,
  } = useStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(1)
  const [mediaDuration, setMediaDuration] = useState(0)
  const fullDuration = mediaDuration || video?.duration || 0
  const effectiveStart = trimStart
  const effectiveEnd = trimEnd || fullDuration
  const effectiveDuration = Math.max(0, effectiveEnd - effectiveStart)

  const src = withMediaBase(processedUrl || video?.url || '')
  const isMuted = audioApplied && appliedReplaceOriginal && !!audioTrack
  const audioSegStart = audioApplied ? appliedAudioTrimStart : 0
  const audioSegEnd = audioApplied ? (appliedAudioTrimEnd || audioDuration) : audioDuration

  useEffect(() => {
    if (video) setTrimEnd(video.duration)
  }, [video])

  useEffect(() => {
    setMediaDuration(0)
    setCurrentTime(0)
    setPlaying(false)
  }, [src])


  useEffect(() => {
    if (audioRef.current) {
      const vol = audioApplied ? appliedAudioVolume : audioVolume
      audioRef.current.volume = Math.min(1, Math.max(0, vol || 1))
    }
  }, [audioVolume, audioApplied, appliedAudioVolume])


  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (v.currentTime < effectiveStart || v.currentTime > effectiveEnd) {
      v.currentTime = effectiveStart
      if (audioRef.current && audioApplied) audioRef.current.currentTime = audioSegStart
      setCurrentTime(effectiveStart)
    }
  }, [effectiveStart, effectiveEnd, audioApplied, audioSegStart])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    // Reset progress to start of trim when trim bounds change
    v.currentTime = effectiveStart
    if (audioRef.current && audioApplied) audioRef.current.currentTime = audioSegStart
    setCurrentTime(effectiveStart)
    setPlaying(false)
    v.pause()
    audioRef.current?.pause()
  }, [effectiveStart, effectiveEnd, audioApplied, audioSegStart])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (playing) {
      v.pause()
      audioRef.current?.pause()
      setPlaying(false)
    } else {
      v.play()
      audioRef.current?.play()
      setPlaying(true)
    }
  }

  const handleTimeUpdate = () => {
    const v = videoRef.current
    if (!v) return
    setCurrentTime(v.currentTime)
    if (v.currentTime >= effectiveEnd) {
      v.pause()
      audioRef.current?.pause()
      setPlaying(false)
    }
    if (audioApplied && audioRef.current && audioSegEnd > 0) {
      const expectedAudioTime = audioSegStart + Math.max(0, v.currentTime - effectiveStart)
      if (expectedAudioTime >= audioSegEnd) {
        audioRef.current.pause()
      } else if (Math.abs(audioRef.current.currentTime - expectedAudioTime) > 0.3) {
        audioRef.current.currentTime = expectedAudioTime
      }
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value)
    const next = effectiveStart + t
    if (videoRef.current) videoRef.current.currentTime = next
    if (audioRef.current && audioApplied) audioRef.current.currentTime = audioSegStart + t
    setCurrentTime(next)
  }

  const handleTimelineSeek = (t: number) => {
    const next = Math.min(Math.max(t, 0), fullDuration)
    if (videoRef.current) videoRef.current.currentTime = next
    if (audioRef.current && audioApplied) {
      const offset = Math.max(0, next - effectiveStart)
      audioRef.current.currentTime = audioSegStart + offset
    }
    setCurrentTime(next)
  }

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (videoRef.current) videoRef.current.volume = v
  }

  if (!video) return null

  const overlayRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const logoDraggingRef = useRef(false)

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      const rect = overlayRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height
      setTitleDraftXY(Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y)))
    }
    const handleLogoMove = (e: MouseEvent) => {
      if (!logoDraggingRef.current) return
      const rect = overlayRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height
      setLogoDraftXY(Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y)))
    }
    const handleUp = () => {
      draggingRef.current = false
      logoDraggingRef.current = false
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mousemove', handleLogoMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mousemove', handleLogoMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [setTitleDraftXY, setLogoDraftXY])

  const logoX = logoDraftX ?? 0.9
  const logoY = logoDraftY ?? 0.1

  return (
    <div className="space-y-2">
      {/* Video */}
      <div
        ref={overlayRef}
        className="relative bg-zinc-950 rounded-xl overflow-hidden w-full flex items-center justify-center h-[38vh] min-h-[300px]"
      >
        <video
          ref={videoRef}
          src={src}
          muted={isMuted}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setPlaying(false)}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              const actualDuration = Number.isFinite(videoRef.current.duration) ? videoRef.current.duration : 0
              setMediaDuration(actualDuration)
              const nextStart = Math.min(trimStart, actualDuration || trimStart)
              videoRef.current.currentTime = nextStart
              setCurrentTime(nextStart)
            }
            if (audioRef.current && audioApplied) audioRef.current.currentTime = audioSegStart
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

        {activeTab === 'title' && (
          <div
            className="absolute inset-0"
            style={{ pointerEvents: 'none' }}
          >
            <div
              onMouseDown={() => {
                if (previewLoading || isApplyingTitle) return
                draggingRef.current = true
              }}
              className={`absolute px-3 py-1.5 rounded-md bg-black/50 text-xs font-semibold ${
                (previewLoading || isApplyingTitle) ? 'cursor-not-allowed' : 'cursor-move'
              } ${((titleDraftText || titleText).trim() ? '' : 'opacity-60 italic')}`}
              style={{
                left: `${(titleDraftX ?? titleX ?? 0.5) * 100}%`,
                top: `${(titleDraftY ?? titleY ?? 0.2) * 100}%`,
                transform: 'translate(-50%, -50%)',
                color: titleColor,
                fontFamily: titleFont,
                fontSize: `${titleSize}px`,
                backgroundColor: titleBgColor,
                border: titleFrameWidth > 0 ? `${titleFrameWidth}px solid ${titleFrameColor}` : 'none',
                WebkitTextStrokeWidth: titleBorderWidth > 0 ? `${titleBorderWidth}px` : '0px',
                WebkitTextStrokeColor: titleBorderColor,
                padding: `${titlePadding}px`,
                pointerEvents: 'auto',
              }}
            >
              {((titleDraftText || titleText).trim() || 'Title')}
            </div>
          </div>
        )}

        {activeTab === 'logo' && logoDraftImage && (
          <div
            className="absolute inset-0"
            style={{ pointerEvents: 'none' }}
          >
            <img
              src={logoDraftImage.url}
              alt="Logo preview"
              onMouseDown={() => { logoDraggingRef.current = true }}
              className="absolute cursor-move select-none"
              style={{
                left: `${logoX * 100}%`,
                top: `${logoY * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: `${logoDraftSize}%`,
                height: 'auto',
                pointerEvents: 'auto',
              }}
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-zinc-50 rounded-xl px-3 py-2 space-y-2 border border-zinc-200">
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
        {/*
        <div className="flex items-center gap-2">
          <Volume2 size={14} className="text-zinc-500" />
          <input
            type="range" min={0} max={1} step={0.05} value={volume}
            onChange={handleVolume}
            aria-label="Video volume"
            className="w-24 accent-cyan-600 h-1"
          />
        </div>
        */}
      </div>

      {activeTab === 'edit' && (
        <div className="space-y-4 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] bg-zinc-50 border border-zinc-200 mt-4 rounded-xl p-3">
          <VideoTimeline currentTime={currentTime} onSeek={handleTimelineSeek} />
          <div className="pt-3 border-t border-zinc-200">
            <AudioEditor />
          </div>
        </div>
      )}

      {audioTrack && audioApplied && (
        <audio
          ref={audioRef}
          src={withMediaBase(audioTrack.url)}
          onTimeUpdate={() => {
            const a = audioRef.current
            if (!a || !audioApplied) return
            if (audioSegEnd > 0 && a.currentTime >= audioSegEnd) {
              a.pause()
              return
            }
          }}
          className="hidden"
          preload="auto"
        />
      )}
    </div >
  )
}
