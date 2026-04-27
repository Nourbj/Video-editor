import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { withMediaBase } from '../../utils/media'
import { getContainRect, getRenderedVideoDimensions } from '../../utils/videoLayout'
import VideoTimeline from '../VideoTimeline/VideoTimeline'

function formatTime(s: number) {
  const totalSeconds = Math.max(0, Math.floor(s))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const sec = totalSeconds % 60

  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function VideoPlayer() {
  const {
    video, trimStart, trimEnd, setTrimEnd, processedUrl,
    audioTrack, audioDuration,
    audioApplied, appliedReplaceOriginal, appliedAudioTrimStart, appliedAudioTrimEnd,
    activeTab,
    titleText, titleFont, titleSize, titleColor, titleBgColor, titleBorderColor, titleBorderWidth, titleFrameColor, titleFrameWidth, titlePadding, titleX, titleY, titleDraftX, titleDraftY, setTitleDraftXY,
    titleDraftText,
    isApplyingTitle,
    previewLoading,
    logoDraftImage, logoDraftSize, logoDraftX, logoDraftY, logoX, logoY, setLogoDraftXY,
    borderEnabled, borderWidth, borderHeight, borderMode,
    cropEnabled,
    cropDraftEnabled,
    crop,
    cropDraft,
    exportQuality, exportAspectRatio,
    seekTo, setSeekTo,
  } = useStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const logoDraggingRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [mediaDuration, setMediaDuration] = useState(0)
  const [videoDisplayRect, setVideoDisplayRect] = useState({ left: 0, top: 0, width: 0, height: 0 })
  const hasPendingCropChanges =
    activeTab === 'crop' && (
      cropDraftEnabled !== cropEnabled ||
      cropDraft.top !== crop.top ||
      cropDraft.bottom !== crop.bottom ||
      cropDraft.left !== crop.left ||
      cropDraft.right !== crop.right
    )
  const fullDuration = mediaDuration || video?.duration || 0
  const effectiveStart = trimStart
  const effectiveEnd = trimEnd || fullDuration
  const effectiveDuration = Math.max(0, effectiveEnd - effectiveStart)

  const src = withMediaBase((hasPendingCropChanges ? video?.url : (processedUrl || video?.url)) || '')
  const isMuted = audioApplied && appliedReplaceOriginal && !!audioTrack
  const audioSegStart = audioApplied ? appliedAudioTrimStart : 0
  const audioSegEnd = audioApplied ? (appliedAudioTrimEnd || audioDuration) : audioDuration

  useEffect(() => {
    if (video) setTrimEnd(video.duration)
  }, [setTrimEnd, video])

  useEffect(() => {
    if (seekTo !== null && videoRef.current) {
      const next = Math.min(Math.max(seekTo, 0), fullDuration)
      videoRef.current.currentTime = next
      if (audioRef.current && audioApplied) {
        const offset = Math.max(0, next - effectiveStart)
        audioRef.current.currentTime = audioSegStart + offset
      }
      setCurrentTime(next)
      setSeekTo(null)
      videoRef.current.play()
      audioRef.current?.play()
      setPlaying(true)
    }
  }, [seekTo, fullDuration, audioApplied, audioSegStart, effectiveStart, setSeekTo])

  useEffect(() => {
    setMediaDuration(0)
    setCurrentTime(0)
    setPlaying(false)
  }, [src])


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
  const updateVideoDisplayRect = useCallback(() => {
    const container = overlayRef.current
    const videoEl = videoRef.current
    if (!container || !videoEl) return

    const containerRect = container.getBoundingClientRect()
    const intrinsicWidth = videoEl.videoWidth || 0
    const intrinsicHeight = videoEl.videoHeight || 0
    if (!intrinsicWidth || !intrinsicHeight || !containerRect.width || !containerRect.height) {
      setVideoDisplayRect({ left: 0, top: 0, width: containerRect.width, height: containerRect.height })
      return
    }

    const videoRatio = intrinsicWidth / intrinsicHeight
    const containerRatio = containerRect.width / containerRect.height

    let width = containerRect.width
    let height = containerRect.height

    if (videoRatio > containerRatio) {
      height = width / videoRatio
    } else {
      width = height * videoRatio
    }

    setVideoDisplayRect({
      left: (containerRect.width - width) / 2,
      top: (containerRect.height - height) / 2,
      width,
      height,
    })
  }, [])

  const getRelativePointInRect = useCallback((
    clientX: number,
    clientY: number,
    targetRect: { left: number; top: number; width: number; height: number },
  ) => {
    const rect = overlayRef.current?.getBoundingClientRect()
    if (!rect || !targetRect.width || !targetRect.height) return null

    const localX = clientX - rect.left - targetRect.left
    const localY = clientY - rect.top - targetRect.top

    return {
      x: Math.min(1, Math.max(0, localX / targetRect.width)),
      y: Math.min(1, Math.max(0, localY / targetRect.height)),
    }
  }, [])

  useEffect(() => {
    updateVideoDisplayRect()
    window.addEventListener('resize', updateVideoDisplayRect)
    return () => window.removeEventListener('resize', updateVideoDisplayRect)
  }, [src, updateVideoDisplayRect])

  const draftLogoX = logoDraftX ?? logoX ?? 0.9
  const draftLogoY = logoDraftY ?? logoY ?? 0.1
  const previewCrop = activeTab === 'crop' && cropDraftEnabled ? cropDraft : crop
  const hasPreviewCrop = (activeTab === 'crop' ? cropDraftEnabled : cropEnabled)
    && (previewCrop.top > 0 || previewCrop.bottom > 0 || previewCrop.left > 0 || previewCrop.right > 0)
  const videoIntrinsicWidth = videoRef.current?.videoWidth || 0
  const videoIntrinsicHeight = videoRef.current?.videoHeight || 0
  const titlePreviewScale = videoIntrinsicWidth > 0 && videoDisplayRect.width > 0
    ? videoDisplayRect.width / videoIntrinsicWidth
    : 1
  const renderedVideoDimensions = getRenderedVideoDimensions({
    sourceWidth: videoIntrinsicWidth,
    sourceHeight: videoIntrinsicHeight,
    quality: exportQuality,
    aspectRatio: exportAspectRatio,
    borderEnabled,
    borderWidth,
    borderHeight,
    borderMode,
  })
  const logoDraftRect = getContainRect({
    containerWidth: overlayRef.current?.clientWidth || 0,
    containerHeight: overlayRef.current?.clientHeight || 0,
    contentWidth: renderedVideoDimensions.width || videoIntrinsicWidth || videoDisplayRect.width,
    contentHeight: renderedVideoDimensions.height || videoIntrinsicHeight || videoDisplayRect.height,
  })

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      const point = getRelativePointInRect(e.clientX, e.clientY, videoDisplayRect)
      if (!point) return
      setTitleDraftXY(point.x, point.y)
    }
    const handleLogoMove = (e: MouseEvent) => {
      if (!logoDraggingRef.current) return
      const point = getRelativePointInRect(e.clientX, e.clientY, logoDraftRect)
      if (!point) return
      setLogoDraftXY(point.x, point.y)
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
  }, [getRelativePointInRect, setTitleDraftXY, setLogoDraftXY, videoDisplayRect, logoDraftRect])

  if (!video) return null

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
            updateVideoDisplayRect()
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

        {activeTab === 'crop' && cropDraftEnabled && hasPreviewCrop && hasPendingCropChanges && videoDisplayRect.width > 0 && videoDisplayRect.height > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {previewCrop.top > 0 && (
              <div
                className="absolute bg-black/55 backdrop-blur-[1px]"
                style={{
                  left: `${videoDisplayRect.left}px`,
                  top: `${videoDisplayRect.top}px`,
                  width: `${videoDisplayRect.width}px`,
                  height: `${videoDisplayRect.height * previewCrop.top}px`,
                }}
              />
            )}
            {previewCrop.bottom > 0 && (
              <div
                className="absolute bg-black/55 backdrop-blur-[1px]"
                style={{
                  left: `${videoDisplayRect.left}px`,
                  top: `${videoDisplayRect.top + videoDisplayRect.height * (1 - previewCrop.bottom)}px`,
                  width: `${videoDisplayRect.width}px`,
                  height: `${videoDisplayRect.height * previewCrop.bottom}px`,
                }}
              />
            )}
            {previewCrop.left > 0 && (
              <div
                className="absolute bg-black/55 backdrop-blur-[1px]"
                style={{
                  left: `${videoDisplayRect.left}px`,
                  top: `${videoDisplayRect.top + videoDisplayRect.height * previewCrop.top}px`,
                  width: `${videoDisplayRect.width * previewCrop.left}px`,
                  height: `${videoDisplayRect.height * (1 - previewCrop.top - previewCrop.bottom)}px`,
                }}
              />
            )}
            {previewCrop.right > 0 && (
              <div
                className="absolute bg-black/55 backdrop-blur-[1px]"
                style={{
                  left: `${videoDisplayRect.left + videoDisplayRect.width * (1 - previewCrop.right)}px`,
                  top: `${videoDisplayRect.top + videoDisplayRect.height * previewCrop.top}px`,
                  width: `${videoDisplayRect.width * previewCrop.right}px`,
                  height: `${videoDisplayRect.height * (1 - previewCrop.top - previewCrop.bottom)}px`,
                }}
              />
            )}
            {hasPendingCropChanges && (
              <div
                className="absolute rounded-xl border border-emerald-400/80 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]"
                style={{
                  left: `${videoDisplayRect.left + videoDisplayRect.width * previewCrop.left}px`,
                  top: `${videoDisplayRect.top + videoDisplayRect.height * previewCrop.top}px`,
                  width: `${videoDisplayRect.width * (1 - previewCrop.left - previewCrop.right)}px`,
                  height: `${videoDisplayRect.height * (1 - previewCrop.top - previewCrop.bottom)}px`,
                }}
              >
                <div className="absolute left-2 top-2 rounded-full bg-emerald-500/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                  Visible frame
                </div>
              </div>
            )}
          </div>
        )}

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
                left: `${videoDisplayRect.left + ((titleDraftX ?? titleX ?? 0.5) * videoDisplayRect.width)}px`,
                top: `${videoDisplayRect.top + ((titleDraftY ?? titleY ?? 0.2) * videoDisplayRect.height)}px`,
                transform: 'translate(-50%, -50%)',
                color: titleColor,
                fontFamily: titleFont,
                fontSize: `${titleSize * titlePreviewScale}px`,
                backgroundColor: titleBgColor,
                border: titleFrameWidth > 0 ? `${titleFrameWidth * titlePreviewScale}px solid ${titleFrameColor}` : 'none',
                WebkitTextStrokeWidth: titleBorderWidth > 0 ? `${titleBorderWidth * titlePreviewScale}px` : '0px',
                WebkitTextStrokeColor: titleBorderColor,
                padding: `${titlePadding * titlePreviewScale}px`,
                pointerEvents: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxWidth: `${videoDisplayRect.width * 0.9}px`,
                textAlign: 'center',
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
                left: `${logoDraftRect.left + (draftLogoX * logoDraftRect.width)}px`,
                top: `${logoDraftRect.top + (draftLogoY * logoDraftRect.height)}px`,
                transform: 'translate(-50%, -50%)',
                width: `${(logoDraftSize / 100) * logoDraftRect.width}px`,
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
          <button type="button" onClick={togglePlay} className="text-zinc-900 hover:text-cyan-600 transition-colors flex-shrink-0">
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
