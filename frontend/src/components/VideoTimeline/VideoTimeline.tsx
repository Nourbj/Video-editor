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
  const tickStep = 1

  const timelineTicks = useMemo(() => {
    if (duration <= 0 || !Number.isFinite(duration)) return []
    const ticks: number[] = []
    for (let t = 0; t <= duration; t += tickStep) {
      ticks.push(t)
    }
    if (ticks[ticks.length - 1] !== duration) ticks.push(duration)
    return ticks
  }, [duration, tickStep])

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
          className="relative h-14 rounded-xl overflow-hidden cursor-crosshair select-none border border-cyan-200 bg-[linear-gradient(90deg,#dff7fb_0%,#d8f4fb_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
          onMouseDown={e => {
            const next = getTimeFromClientX(e.clientX)
            onSeek(next)
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[length:36px_100%] pointer-events-none" />
          <div className="absolute inset-0 pointer-events-none z-20">
            {timelineTicks.map(t => {
              const labelSecond = Math.round(t)
              const isMajor = labelSecond % 5 === 0 || t === duration
              return (
                <div
                  key={t}
                  className="absolute inset-y-0 flex flex-col items-center"
                  style={{ left: `${duration ? (t / duration) * 100 : 0}%`, transform: 'translateX(-50%)' }}
                >
                  {isMajor && (
                    <div className="text-[9px] text-cyan-950 leading-none pt-1 bg-white/70 px-1 rounded-sm">
                      {formatTime(labelSecond)}
                    </div>
                  )}
                  <div className={`mt-auto w-px bg-cyan-950/70 ${isMajor ? 'h-4' : 'h-2.5'}`} />
                </div>
              )
            })}
          </div>

          <div
            className="absolute inset-y-0 bg-zinc-950/18 pointer-events-none"
            style={{ width: `${duration ? (trimStart / duration) * 100 : 0}%` }}
          />
          <div
            className="absolute inset-y-0 right-0 bg-zinc-950/18 pointer-events-none"
            style={{ width: `${duration ? ((duration - trimEnd) / duration) * 100 : 0}%` }}
          />

          <div
            className="absolute inset-y-1 rounded-lg border border-cyan-600/90 bg-[linear-gradient(90deg,rgba(6,182,212,0.55)_0%,rgba(34,211,238,0.5)_52%,rgba(14,165,233,0.55)_100%)] shadow-[0_8px_20px_rgba(8,145,178,0.14)] cursor-grab"
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
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.28)_50%,rgba(255,255,255,0.12)_100%)]" />
          </div>

          <div
            className="absolute top-1 bottom-1 w-3 rounded-lg bg-white border border-cyan-700 shadow-sm cursor-ew-resize"
            style={{ left: `${duration ? (trimStart / duration) * 100 : 0}%`, transform: 'translateX(-35%)' }}
            onMouseDown={e => {
              e.stopPropagation()
              dragRef.current = { startX: e.clientX, startTrimStart: trimStart, startTrimEnd: trimEnd }
              setDragging('start')
            }}
          />
          <div
            className="absolute top-1 bottom-1 w-3 rounded-lg bg-white border border-cyan-700 shadow-sm cursor-ew-resize"
            style={{ left: `${duration ? (trimEnd / duration) * 100 : 0}%`, transform: 'translateX(-65%)' }}
            onMouseDown={e => {
              e.stopPropagation()
              dragRef.current = { startX: e.clientX, startTrimStart: trimStart, startTrimEnd: trimEnd }
              setDragging('end')
            }}
          />

          <div
            className="absolute top-0 bottom-0 w-[2px] bg-zinc-950/85 pointer-events-none"
            style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          >
            <div className="absolute left-1/2 top-1 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-white bg-cyan-500 shadow-sm" />
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
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-zinc-200 px-3 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-600">Clips</p>
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
