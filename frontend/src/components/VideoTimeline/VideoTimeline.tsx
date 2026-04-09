import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Scissors, GripVertical, Trash2, GitMerge, Wand2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { mergeSegments, mergeVideos, splitVideo } from '../../api/client'
import { withMediaBase } from '../../utils/media'

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

type DragMode = 'start' | 'end' | 'range' | null

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
  } = useStore()

  const [dragging, setDragging] = useState<DragMode>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ startX: 0, startTrimStart: 0, startTrimEnd: 0 })

  const duration = video?.duration || 0
  const selectionDuration = Math.max(0, trimEnd - trimStart)
  const minGap = 0.1
  const rulerStep = useMemo(() => {
    if (duration <= 15) return { minor: 0.5, major: 2 }
    if (duration <= 45) return { minor: 1, major: 5 }
    if (duration <= 120) return { minor: 2, major: 10 }
    if (duration <= 300) return { minor: 5, major: 15 }
    if (duration <= 900) return { minor: 10, major: 30 }
    return { minor: 15, major: 60 }
  }, [duration])

  const timelineTicks = useMemo(() => {
    if (duration <= 0 || !Number.isFinite(duration)) return []
    const ticks: number[] = []
    for (let t = 0; t <= duration; t += rulerStep.minor) {
      ticks.push(t)
    }
    if (ticks[ticks.length - 1] !== duration) ticks.push(duration)
    return ticks
  }, [duration, rulerStep])

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
      }
    }

    const handleUp = () => setDragging(null)

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [dragging, duration, minGap, setTrimEnd, setTrimStart, trimEnd, trimStart])

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

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-cyan-100 bg-[linear-gradient(180deg,#f2fcff_0%,#f8fdff_100%)] px-3 py-3 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        <div
          ref={timelineRef}
          className="relative h-[72px] rounded-2xl overflow-hidden cursor-crosshair select-none border border-cyan-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(239,251,255,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
          onMouseDown={e => {
            const next = getTimeFromClientX(e.clientX)
            onSeek(next)
          }}
        >
          <div className="absolute inset-x-3 top-8 h-6 rounded-full border border-cyan-200/80 bg-cyan-50/70 pointer-events-none" />
          <div className="absolute inset-x-3 top-8 h-6 rounded-full bg-[linear-gradient(90deg,rgba(8,145,178,0.05)_1px,transparent_1px)] bg-[length:18px_100%] pointer-events-none opacity-50" />
          <div className="absolute inset-x-0 top-0 h-8 pointer-events-none z-20">
            {timelineTicks.map(t => {
              const rounded = Math.round(t * 100) / 100
              const isMajor = Math.abs(rounded % rulerStep.major) < 0.01 || Math.abs(duration - t) < rulerStep.minor / 2 || t === 0
              return (
                <div
                  key={t}
                  className="absolute top-0 bottom-0 flex flex-col items-center"
                  style={{ left: `${duration ? (t / duration) * 100 : 0}%`, transform: 'translateX(-50%)' }}
                >
                  {isMajor && (
                    <div className="mt-1 px-1 text-[10px] font-medium text-cyan-900/75 leading-none">
                      {formatTime(t)}
                    </div>
                  )}
                  <div className={`mt-auto w-px rounded-full bg-cyan-900/45 ${isMajor ? 'h-3.5' : 'h-2'}`} />
                </div>
              )
            })}
          </div>

          <div
            className="absolute left-3 top-8 bottom-3 bg-slate-950/10 rounded-l-full pointer-events-none"
            style={{ width: `calc(${duration ? (trimStart / duration) * 100 : 0}% - 0.75rem)` }}
          />
          <div
            className="absolute right-3 top-8 bottom-3 bg-slate-950/10 rounded-r-full pointer-events-none"
            style={{ width: `calc(${duration ? ((duration - trimEnd) / duration) * 100 : 0}% - 0.75rem)` }}
          />

          <div
            className="absolute top-8 bottom-3 rounded-full border border-cyan-600/70 bg-[linear-gradient(90deg,rgba(8,145,178,0.26),rgba(14,165,233,0.42))] shadow-[0_6px_14px_rgba(8,145,178,0.10)] cursor-grab"
            style={{
              left: `${duration ? (trimStart / duration) * 100 : 0}%`,
              width: `${duration ? ((trimEnd - trimStart) / duration) * 100 : 0}%`,
            }}
            onMouseDown={e => {
              e.stopPropagation()
              dragRef.current = { startX: e.clientX, startTrimStart: trimStart, startTrimEnd: trimEnd }
              setDragging('range')
            }}
          >
            <div className="absolute inset-0 rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.22)_50%,rgba(255,255,255,0.10)_100%)]" />
          </div>

          <div
            className="absolute top-[28px] bottom-[12px] w-3 rounded-full bg-white border border-cyan-700/80 shadow-[0_3px_10px_rgba(8,145,178,0.14)] cursor-ew-resize"
            style={{ left: `${duration ? (trimStart / duration) * 100 : 0}%`, transform: 'translateX(-35%)' }}
            onMouseDown={e => {
              e.stopPropagation()
              dragRef.current = { startX: e.clientX, startTrimStart: trimStart, startTrimEnd: trimEnd }
              setDragging('start')
            }}
          >
            <div className="flex h-full items-center justify-center text-cyan-700">
              <GripVertical size={10} />
            </div>
          </div>
          <div
            className="absolute top-[28px] bottom-[12px] w-3 rounded-full bg-white border border-cyan-700/80 shadow-[0_3px_10px_rgba(8,145,178,0.14)] cursor-ew-resize"
            style={{ left: `${duration ? (trimEnd / duration) * 100 : 0}%`, transform: 'translateX(-65%)' }}
            onMouseDown={e => {
              e.stopPropagation()
              dragRef.current = { startX: e.clientX, startTrimStart: trimStart, startTrimEnd: trimEnd }
              setDragging('end')
            }}
          >
            <div className="flex h-full items-center justify-center text-cyan-700">
              <GripVertical size={10} />
            </div>
          </div>

          <div
            className="absolute top-2.5 bottom-2 w-[2px] bg-cyan-900/70 pointer-events-none z-30"
            style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          >
            <div className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-white bg-cyan-500 shadow-sm" />
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
        id: crypto.randomUUID(),
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
            <p className="text-xs tracking-[0.2em] text-yellow-600">Clips</p>
            <p className="text-sm font-semibold text-zinc-900">Drag to reorder your clips</p>
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
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Export</p>
          <p className="text-sm font-semibold text-zinc-900">Generate clips or merge the timeline</p>
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
