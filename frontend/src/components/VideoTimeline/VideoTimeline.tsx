import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Scissors, GripVertical, Trash2, GitMerge, Wand2, Film, Music } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { createId } from '../../utils/id'
import { mergeSegments, mergeVideos, splitVideo } from '../../api/client'
import { withMediaBase } from '../../utils/media'

function formatTime(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) {
    const min = Math.floor((s % 3600) / 60)
    return `${h}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }
  return `${m}:${sec.toString().padStart(2, '0')}`
}

type DragMode = 'start' | 'end' | 'range' | 'audio' | 'audio-start' | 'audio-end' | null

const RULER_STEPS = [
  0.5, 1, 2, 5, 10, 15, 30,
  60, 120, 300, 600, 900, 1800,
  3600, 7200, 14400,
]

function getRulerStep(duration: number, targetTicks: number) {
  const desiredStep = duration / Math.max(1, targetTicks)
  return RULER_STEPS.find(step => step >= desiredStep) ?? RULER_STEPS[RULER_STEPS.length - 1]
}

function buildTicks(duration: number, step: number) {
  if (duration <= 0 || !Number.isFinite(duration)) return []
  const ticks: number[] = []
  for (let t = 0; t <= duration; t += step) {
    ticks.push(Math.min(t, duration))
  }
  if (ticks[ticks.length - 1] !== duration) ticks.push(duration)
  return ticks
}

export default function VideoTimeline({
  currentTime,
  onSeek,
}: {
  currentTime: number
  onSeek: (t: number) => void
}) {
  const {
    video,
    trimStart,
    trimEnd,
    setTrimStart,
    setTrimEnd,
    segments,
    addSegment,
    setEditStatus,
    audioTrack,
    audioDuration,
    audioOffset,
    setAudioOffset,
    audioTrimStart,
    audioTrimEnd,
    setAudioTrimStart,
    setAudioTrimEnd,
    audioApplied,
    appliedAudioTrimStart,
    appliedAudioTrimEnd,
    appliedAudioOffset,
  } = useStore()

  const [dragging, setDragging] = useState<DragMode>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({
    startX: 0,
    startTrimStart: 0,
    startTrimEnd: 0,
    startAudioOffset: 0,
    startAudioTrimStart: 0,
    startAudioTrimEnd: 0
  })

  const duration = video?.duration || 0
  const selectionDuration = Math.max(0, trimEnd - trimStart)
  const minGap = 0.1
  const rulerStep = useMemo(() => {
    const major = getRulerStep(duration, 8)
    const minor = getRulerStep(duration, 36)
    return {
      major,
      minor: Math.min(minor, major),
    }
  }, [duration])

  const minorTicks = useMemo(() => buildTicks(duration, rulerStep.minor), [duration, rulerStep.minor])
  const majorTicks = useMemo(() => buildTicks(duration, rulerStep.major), [duration, rulerStep.major])
  const majorTickSet = useMemo(
    () => new Set(majorTicks.map(t => t.toFixed(3))),
    [majorTicks],
  )

  const getTimeFromClientX = (clientX: number) => {
    const rect = timelineRef.current?.getBoundingClientRect()
    if (!rect || duration <= 0) return 0
    const x = Math.min(rect.width, Math.max(0, clientX - rect.left))
    return (x / rect.width) * duration
  }

  const applySelection = (start: number, end: number) => {
    const nextStart = Math.max(0, Math.min(start, Math.max(0, duration - minGap)))
    const nextEnd = Math.min(duration, Math.max(end, nextStart + minGap))
    setTrimStart(nextStart)
    setTrimEnd(nextEnd)
  }


  useEffect(() => {
    if (!dragging) return

    const handleMove = (e: MouseEvent) => {
      const nextTime = getTimeFromClientX(e.clientX)
      if (dragging === 'start') {
        const safeEnd = Math.max(trimEnd - minGap, 0)
        const nextStart = Math.min(nextTime, safeEnd)
        setTrimStart(Math.max(0, nextStart))
        return
      }
      if (dragging === 'end') {
        const safeStart = Math.min(trimStart + minGap, duration)
        const nextEnd = Math.max(nextTime, safeStart)
        setTrimEnd(Math.min(duration, nextEnd))
        return
      }
      if (dragging === 'range') {
        const rect = timelineRef.current?.getBoundingClientRect()
        if (!rect || duration <= 0) return
        const delta = ((e.clientX - dragRef.current.startX) / rect.width) * duration
        const span = dragRef.current.startTrimEnd - dragRef.current.startTrimStart
        const nextStart = Math.min(Math.max(0, dragRef.current.startTrimStart + delta), duration - span)
        const nextEnd = nextStart + span
        setTrimStart(nextStart)
        setTrimEnd(nextEnd)
        return
      }
      if (dragging === 'audio') {
        const rect = timelineRef.current?.getBoundingClientRect()
        if (!rect || duration <= 0) return
        const delta = ((e.clientX - dragRef.current.startX) / rect.width) * duration
        const nextOffset = Math.max(0, dragRef.current.startAudioOffset + delta)
        setAudioOffset(nextOffset)
        return
      }
      if (dragging === 'audio-start') {
        const rect = timelineRef.current?.getBoundingClientRect()
        if (!rect || duration <= 0) return
        const delta = ((e.clientX - dragRef.current.startX) / rect.width) * duration
        
        // Adjust offset and trim simultaneously
        const nextOffset = Math.max(0, dragRef.current.startAudioOffset + delta)
        const nextTrimStart = Math.max(0, dragRef.current.startAudioTrimStart + (nextOffset - dragRef.current.startAudioOffset))
        
        // Clamp trimStart so it doesn't exceed trimEnd or audioDuration
        const limit = audioTrimEnd > 0 ? audioTrimEnd - 0.1 : audioDuration - 0.1
        setAudioOffset(nextOffset)
        setAudioTrimStart(Math.min(nextTrimStart, limit))
        return
      }
      if (dragging === 'audio-end') {
        const rect = timelineRef.current?.getBoundingClientRect()
        if (!rect || duration <= 0) return
        const delta = ((e.clientX - dragRef.current.startX) / rect.width) * duration
        
        const baseEnd = dragRef.current.startAudioTrimEnd === 0 ? audioDuration : dragRef.current.startAudioTrimEnd
        const nextTrimEnd = Math.max(audioTrimStart + 0.1, Math.min(audioDuration, baseEnd + delta))
        setAudioTrimEnd(nextTrimEnd)
      }
    }

    const handleUp = () => setDragging(null)

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [dragging, duration, minGap, setTrimEnd, setTrimStart, trimEnd, trimStart, setAudioOffset, audioDuration, audioTrimStart, audioTrimEnd, setAudioTrimStart, setAudioTrimEnd])

  if (!video) return null

  const handleAddSegment = () => {
    if (selectionDuration <= 0) {
      setEditStatus('Choose a valid range before cutting.')
      return
    }
    addSegment({
      label: `Clip ${segments.length + 1}`,
      start: trimStart,
      end: trimEnd,
    })
    setEditStatus(`Clip ${segments.length + 1} added from the current selection.`)
  }

  const handleSetStartToPlayhead = () => {
    const nextStart = Math.min(Math.max(0, currentTime), Math.max(0, trimEnd - minGap))
    setTrimStart(nextStart)
    setEditStatus(`Selection start moved to ${formatTime(nextStart)}.`)
  }

  const handleSetEndToPlayhead = () => {
    const nextEnd = Math.max(Math.min(duration, currentTime), Math.min(duration, trimStart + minGap))
    setTrimEnd(nextEnd)
    setEditStatus(`Selection end moved to ${formatTime(nextEnd)}.`)
  }

  const trackVideoSegments = useMemo(() => {
    return [{ id: 'current', start: trimStart, end: trimEnd, active: true }]
  }, [trimStart, trimEnd])

  const trackAudioSegments = useMemo(() => {
    if (!audioTrack) return []
    const start = audioApplied ? appliedAudioOffset : audioOffset
    const sourceTrimStart = audioApplied ? appliedAudioTrimStart : audioTrimStart
    const sourceTrimEnd = audioApplied ? appliedAudioTrimEnd : audioTrimEnd
    const clipDuration = sourceTrimEnd > 0 ? (sourceTrimEnd - sourceTrimStart) : audioDuration
    return [{
      id: 'audio-main',
      start,
      end: start + clipDuration,
      active: true,
      label: audioTrack.filename
    }]
  }, [audioTrack, audioOffset, audioDuration, audioTrimStart, audioTrimEnd, audioApplied, appliedAudioOffset, appliedAudioTrimStart, appliedAudioTrimEnd])

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-cyan-100 bg-[linear-gradient(180deg,#f2fcff_0%,#f8fdff_100%)] px-4 py-4 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        <div
          ref={timelineRef}
          className="relative h-[132px] rounded-2xl overflow-hidden cursor-crosshair select-none border border-cyan-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(239,251,255,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
          onMouseDown={e => {
            const next = getTimeFromClientX(e.clientX)
            onSeek(next)
          }}
        >
          {/* Header/Ruler */}
          <div className="absolute inset-x-0 top-0 h-6 pointer-events-none z-20 border-b border-cyan-100/50 bg-cyan-50/30">
            {minorTicks.map(t => {
              const isMajor = majorTickSet.has(t.toFixed(3))
              return (
                <div
                  key={t}
                  className="absolute top-0 bottom-0 flex flex-col items-center"
                  style={{ left: `${duration ? (t / duration) * 100 : 0}%`, transform: 'translateX(-50%)' }}
                >
                  <div className={`w-px rounded-full bg-cyan-900/25 ${isMajor ? 'h-3' : 'h-1.5'}`} />
                  {isMajor && (
                    <div className="mt-0.5 px-1 text-[9px] font-medium text-cyan-900/60 leading-none">
                      {formatTime(t)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Track 1: Video */}
          <div className="absolute inset-x-0 top-7 h-[44px] flex items-center px-1">
             <div className="flex-none w-10 flex flex-col items-center justify-center gap-0.5 text-zinc-400">
               <Film size={12} />
               <span className="text-[8px] font-bold uppercase tracking-tighter">Vid</span>
             </div>
             <div className="relative flex-1 h-full mx-1 rounded-xl bg-zinc-100/50 border border-zinc-200/50 overflow-hidden">
                {trackVideoSegments.map((seg) => (
                   <div
                     key={seg.id}
                     className="absolute top-1 bottom-1 rounded-lg border border-cyan-600/70 bg-[linear-gradient(90deg,rgba(8,145,178,0.26),rgba(14,165,233,0.42))] shadow-[0_2px_8px_rgba(8,145,178,0.1)] cursor-grab"
                     style={{
                       left: `${duration ? (seg.start / duration) * 100 : 0}%`,
                       width: `${duration ? ((seg.end - seg.start) / duration) * 100 : 0}%`,
                     }}
                      onMouseDown={e => {
                        e.stopPropagation()
                        dragRef.current = { 
                          startX: e.clientX, 
                          startTrimStart: trimStart, 
                          startTrimEnd: trimEnd, 
                          startAudioOffset: audioOffset,
                          startAudioTrimStart: audioTrimStart,
                          startAudioTrimEnd: audioTrimEnd
                        }
                        setDragging('range')
                      }}
                   >
                     <div className="absolute inset-0 rounded-lg bg-[linear-gradient(90deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.1)_100%)]" />
                     {/* Grab handles */}
                     <div
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize flex items-center justify-center group"
                        onMouseDown={e => { 
                          e.stopPropagation()
                          dragRef.current = { 
                            startX: e.clientX, 
                            startTrimStart: trimStart, 
                            startTrimEnd: trimEnd, 
                            startAudioOffset: audioOffset,
                            startAudioTrimStart: audioTrimStart,
                            startAudioTrimEnd: audioTrimEnd
                          }
                          setDragging('start') 
                        }}
                     >
                        <div className="w-1 h-4 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                     </div>
                     <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize flex items-center justify-center group"
                        onMouseDown={e => { 
                          e.stopPropagation()
                          dragRef.current = { 
                            startX: e.clientX, 
                            startTrimStart: trimStart, 
                            startTrimEnd: trimEnd, 
                            startAudioOffset: audioOffset,
                            startAudioTrimStart: audioTrimStart,
                            startAudioTrimEnd: audioTrimEnd
                          }
                          setDragging('end') 
                        }}
                     >
                        <div className="w-1 h-4 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                     </div>
                   </div>
                ))}
             </div>
          </div>

          {/* Track 2: Audio */}
          <div className="absolute inset-x-0 top-[77px] h-[44px] flex items-center px-1">
             <div className="flex-none w-10 flex flex-col items-center justify-center gap-0.5 text-zinc-400">
               <Music size={12} />
               <span className="text-[8px] font-bold uppercase tracking-tighter">Aud</span>
             </div>
             <div className="relative flex-1 h-full mx-1 rounded-xl bg-zinc-100/50 border border-zinc-200/50 overflow-hidden">
                {trackAudioSegments.map((seg) => (
                   <div
                     key={seg.id}
                     className="absolute top-1 bottom-1 rounded-lg border border-yellow-600/70 bg-[linear-gradient(90deg,rgba(202,138,4,0.26),rgba(234,179,8,0.42))] shadow-[0_2px_8px_rgba(202,138,4,0.1)] cursor-grab flex items-center px-2 overflow-hidden"
                     style={{
                       left: `${duration ? (seg.start / duration) * 100 : 0}%`,
                       width: `${duration ? ((seg.end - seg.start) / duration) * 100 : 0}%`,
                     }}
                     onMouseDown={e => {
                        e.stopPropagation()
                        dragRef.current = { 
                          startX: e.clientX, 
                          startTrimStart: trimStart, 
                          startTrimEnd: trimEnd, 
                          startAudioOffset: audioOffset,
                          startAudioTrimStart: audioTrimStart,
                          startAudioTrimEnd: audioTrimEnd
                        }
                        setDragging('audio')
                     }}
                   >
                     <span className="text-[9px] font-bold text-yellow-900/80 truncate pointer-events-none">
                        {seg.label}
                     </span>
                     <div className="absolute inset-0 rounded-lg bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.12)_50%,rgba(255,255,255,0.05)_100%)]" />
                     {/* Grab handles for trimming */}
                     <div
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize flex items-center justify-center group/h"
                        onMouseDown={e => { 
                          e.stopPropagation()
                          dragRef.current = { 
                            startX: e.clientX, 
                            startTrimStart: trimStart, 
                            startTrimEnd: trimEnd, 
                            startAudioOffset: audioOffset,
                            startAudioTrimStart: audioTrimStart,
                            startAudioTrimEnd: audioTrimEnd
                          }
                          setDragging('audio-start')
                        }}
                     >
                        <div className="w-1 h-4 bg-yellow-400/80 rounded-full opacity-0 group-hover/h:opacity-100 transition-opacity" />
                     </div>
                     <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize flex items-center justify-center group/h"
                        onMouseDown={e => { 
                          e.stopPropagation()
                          dragRef.current = { 
                            startX: e.clientX, 
                            startTrimStart: trimStart, 
                            startTrimEnd: trimEnd, 
                            startAudioOffset: audioOffset,
                            startAudioTrimStart: audioTrimStart,
                            startAudioTrimEnd: audioTrimEnd
                          }
                          setDragging('audio-end')
                        }}
                     >
                        <div className="w-1 h-4 bg-yellow-400/80 rounded-full opacity-0 group-hover/h:opacity-100 transition-opacity" />
                     </div>
                   </div>
                ))}
             </div>
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-cyan-900/60 pointer-events-none z-30"
            style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          >
            <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full border border-white bg-cyan-500 shadow-sm" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAddSegment}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors"
          >
            <Scissors size={14} /> Cut Selection
          </button>
          <button
            onClick={() => applySelection(0, duration)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-cyan-200 text-cyan-800 text-xs font-medium hover:bg-cyan-50"
          >
            Full Range
          </button>
        </div>
      </div>
    </div>
  )
}

export function EditSidebar() {
  const {
    video,
    segments,
    clearSegments,
    reorderSegments,
    removeSegment,
    resetSegmentOutputs,
    setSegmentOutput,
    trimStart,
    trimEnd,
    setTrimStart,
    setTrimEnd,
    setVideo,
    setProcessedUrl,
    editStatus,
    setEditStatus,
  } = useStore()

  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [splitLoading, setSplitLoading] = useState(false)
  const [mergeLoading, setMergeLoading] = useState(false)

  const readySegments = useMemo(
    () => segments.filter(segment => segment.outputFilename),
    [segments],
  )

  const totalPreparedDuration = useMemo(
    () => segments.reduce((total, segment) => total + Math.max(0, segment.end - segment.start), 0),
    [segments],
  )

  const mergedDuration = useMemo(
    () => readySegments.reduce((total, segment) => total + Math.max(0, segment.end - segment.start), 0),
    [readySegments],
  )

  if (!video) return null
  const isActiveSegment = (segment: { start: number; end: number }) => {
    const epsilon = 0.02
    return Math.abs(segment.start - trimStart) < epsilon && Math.abs(segment.end - trimEnd) < epsilon
  }

  const handleSplit = async () => {
    if (segments.length === 0) {
      setEditStatus('Add at least one clip before generating.')
      return
    }

    setSplitLoading(true)
    setEditStatus('Generating clips...')
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

      setEditStatus(`${result.segments.length} clip(s) generated.`)
    } catch (error: unknown) {
      setEditStatus(error instanceof Error ? error.message : 'Split failed.')
    } finally {
      setSplitLoading(false)
    }
  }

  const handleMerge = async () => {
    if (segments.length < 2) {
      setEditStatus('At least two clips are required to merge.')
      return
    }

    setMergeLoading(true)
    setEditStatus('Merging timeline...')

    try {
      const hasGenerated = readySegments.length === segments.length
      const result = hasGenerated
        ? await mergeVideos(segments.map(segment => segment.outputFilename!).filter(Boolean))
        : await mergeSegments(video.filename, segments.map(segment => ({
          startTime: segment.start,
          endTime: segment.end,
          label: segment.label,
        })))

      const nextDuration = hasGenerated
        ? readySegments.reduce((total, segment) => total + Math.max(0, segment.end - segment.start), 0)
        : segments.reduce((total, segment) => total + Math.max(0, segment.end - segment.start), 0)

      setVideo({
        ...video,
        id: createId(),
        filename: result.filename,
        url: result.url,
        duration: nextDuration,
      })
      setProcessedUrl(null)
      setEditStatus('Merge complete. The timeline result is now the current project source.')
    } catch (error: unknown) {
      setEditStatus(error instanceof Error ? error.message : 'Merge failed.')
    } finally {
      setMergeLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="bg-white rounded-xl border border-zinc-200 px-3 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-yellow-600">Clips - Drag to reorder your clips</p>
          </div>
          {segments.length > 0 && (
            <button
              onClick={() => { clearSegments(); setEditStatus('Clip list cleared.') }}
              className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {segments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-6 text-sm text-zinc-500">
            No clips yet. Select a range on the timeline and press Cut.
          </div>
        ) : (
          <div className="space-y-2">
            {segments.map((segment, index) => (
              (() => {
                const active = isActiveSegment(segment)
                return (
              <div
                key={segment.id}
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('text/plain', segment.id)
                }}
                onDragOver={e => {
                  e.preventDefault()
                  setDragOverId(segment.id)
                }}
                onDragLeave={() => setDragOverId(null)}
                onDrop={e => {
                  e.preventDefault()
                  const activeId = e.dataTransfer.getData('text/plain')
                  if (activeId) reorderSegments(activeId, segment.id)
                  setDragOverId(null)
                }}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${active ? 'bg-cyan-50 border-cyan-400 ring-2 ring-cyan-100' : 'bg-zinc-50'} ${dragOverId === segment.id ? 'border-cyan-500 ring-2 ring-cyan-200' : active ? 'border-cyan-400' : 'border-zinc-200'}`}
              >
                <GripVertical size={14} className={active ? 'text-cyan-600' : 'text-zinc-400'} />
                <button
                  onClick={() => {
                    setTrimStart(segment.start)
                    setTrimEnd(segment.end)
                  }}
                  className="text-left flex-1"
                >
                  <p className={`text-sm font-medium ${active ? 'text-cyan-900' : 'text-zinc-800'}`}>{segment.label || `Clip ${index + 1}`}</p>
                  <p className={`text-xs ${active ? 'text-cyan-700' : 'text-zinc-500'}`}>{formatTime(segment.start)} {'->'} {formatTime(segment.end)} · {formatTime(segment.end - segment.start)}</p>
                </button>
                <div className="flex items-center gap-2">
                  {segment.outputFilename && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                      Ready
                    </span>
                  )}
                  {segment.outputUrl && (
                    <>
                      <a
                        href={withMediaBase(segment.outputUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-zinc-600 hover:text-zinc-900 underline"
                      >
                        Open/Preview
                      </a>
                      <a
                        href={withMediaBase(segment.outputUrl)}
                        download
                        className="text-xs text-cyan-700 hover:text-cyan-800 font-medium"
                      >
                        Download
                      </a>
                    </>
                  )}
                  <button
                    onClick={() => removeSegment(segment.id)}
                    className={`text-xs ${active ? 'text-cyan-600 hover:text-cyan-700' : 'text-red-500 hover:text-red-600'}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
                )
              })()
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-zinc-600">
            Clips: <span className="font-semibold text-zinc-900">{segments.length}</span>
          </div>
          <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-zinc-600">
            Total runtime: <span className="font-semibold text-zinc-900">{formatTime(totalPreparedDuration)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 px-3 py-3 space-y-3">
        <div>
          <p className="text-xs text-green-600">Export - Generate clips or merge the timeline</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleSplit}
            disabled={splitLoading || segments.length === 0}
            className="py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-200 disabled:text-zinc-400 text-zinc-950 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Wand2 size={14} /> {splitLoading ? 'Generating...' : 'Generate Clips'}
          </button>
          <button
            onClick={handleMerge}
            disabled={mergeLoading || segments.length < 2}
            className="py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <GitMerge size={14} /> {mergeLoading ? 'Merging...' : 'Merge Timeline'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-zinc-600">
            Ready clips: <span className="font-semibold text-zinc-900">{readySegments.length}</span>
          </div>
          <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-zinc-600">
            Merged runtime: <span className="font-semibold text-zinc-900">{formatTime(mergedDuration)}</span>
          </div>
        </div>
      </div>

      {editStatus && (
        <div className="rounded-xl border border-zinc-200 bg-cyan-50 px-3 py-2 text-sm text-zinc-700">
          {editStatus}
        </div>
      )}
    </div>
  )
}
