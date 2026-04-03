import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Scissors, GripVertical, Trash2, GitMerge, Wand2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { mergeSegments, mergeVideos, splitVideo } from '../../api/client'

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
    removeSegment,
    clearSegments,
    reorderSegments,
    resetSegmentOutputs,
    setSegmentOutput,
    setVideo,
    setProcessedUrl,
  } = useStore()

  const [dragging, setDragging] = useState<DragMode>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [splitLoading, setSplitLoading] = useState(false)
  const [mergeLoading, setMergeLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ startX: 0, startTrimStart: 0, startTrimEnd: 0 })

  const duration = video?.duration || 0
  const selectionDuration = Math.max(0, trimEnd - trimStart)
  const minGap = 0.1

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

  const getTimeFromClientX = (clientX: number) => {
    const rect = timelineRef.current?.getBoundingClientRect()
    if (!rect || duration <= 0) return 0
    const x = Math.min(rect.width, Math.max(0, clientX - rect.left))
    return (x / rect.width) * duration
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
      setStatus('Choose a valid range before cutting.')
      return
    }
    addSegment({
      label: `Clip ${segments.length + 1}`,
      start: trimStart,
      end: trimEnd,
    })
    setStatus(`Clip ${segments.length + 1} added.`)
  }

  const handleSplit = async () => {
    if (segments.length === 0) {
      setStatus('Add at least one clip before generating.')
      return
    }

    setSplitLoading(true)
    setStatus('Generating clips...')
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

      setStatus(`${result.segments.length} clip(s) generated.`)
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : 'Split failed.')
    } finally {
      setSplitLoading(false)
    }
  }

  const handleMerge = async () => {
    if (segments.length < 2) {
      setStatus('At least two clips are required to merge.')
      return
    }

    setMergeLoading(true)
    setStatus('Merging timeline...')

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
      setStatus('Merge complete. The timeline result is now the current project source.')
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : 'Merge failed.')
    } finally {
      setMergeLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="bg-zinc-50 rounded-xl border border-zinc-200 px-3 py-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Timeline</p>
            <p className="text-sm font-medium text-zinc-700">Drag handles to select, click to scrub</p>
          </div>
          <div className="text-xs text-zinc-500 text-right">
            Selection: {formatTime(selectionDuration)}
            <div className="text-[11px] text-zinc-400">{formatTime(trimStart)} → {formatTime(trimEnd)}</div>
          </div>
        </div>

        <div
          ref={timelineRef}
          className="relative h-12 rounded-lg bg-zinc-200 overflow-hidden cursor-crosshair select-none"
          onMouseDown={e => {
            if (e.target !== timelineRef.current) return
            const next = getTimeFromClientX(e.clientX)
            const clamped = Math.min(Math.max(next, trimStart), trimEnd)
            onSeek(clamped)
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.3)_1px,transparent_1px)] bg-[length:40px_100%] pointer-events-none" />
          <div
            className="absolute inset-y-0 rounded-md bg-cyan-500/70 border border-cyan-600 cursor-grab"
            style={{
              left: `${duration ? (trimStart / duration) * 100 : 0}%`,
              width: `${duration ? ((trimEnd - trimStart) / duration) * 100 : 0}%`,
            }}
            onMouseDown={e => {
              e.stopPropagation()
              dragRef.current = { startX: e.clientX, startTrimStart: trimStart, startTrimEnd: trimEnd }
              setDragging('range')
            }}
          />

          <div
            className="absolute top-0 bottom-0 w-2 bg-white border border-zinc-400 rounded-sm cursor-ew-resize"
            style={{ left: `${duration ? (trimStart / duration) * 100 : 0}%` }}
            onMouseDown={e => {
              e.stopPropagation()
              dragRef.current = { startX: e.clientX, startTrimStart: trimStart, startTrimEnd: trimEnd }
              setDragging('start')
            }}
          />
          <div
            className="absolute top-0 bottom-0 w-2 bg-white border border-zinc-400 rounded-sm cursor-ew-resize"
            style={{ left: `${duration ? (trimEnd / duration) * 100 : 0}%` }}
            onMouseDown={e => {
              e.stopPropagation()
              dragRef.current = { startX: e.clientX, startTrimStart: trimStart, startTrimEnd: trimEnd }
              setDragging('end')
            }}
          />

          <div
            className="absolute top-0 bottom-0 w-[2px] bg-zinc-900/80"
            style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAddSegment}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors"
          >
            <Scissors size={14} /> Cut Selection
          </button>
          <button
            onClick={() => { setTrimStart(0); setTrimEnd(duration) }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-600 text-xs font-medium hover:bg-zinc-100"
          >
            Full Range
          </button>
          <div className="text-[11px] text-zinc-400">Drag the blue range to move, grab edges to resize.</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 px-3 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-600">Clips</p>
            <p className="text-sm font-semibold text-zinc-900">Drag to reorder your clips</p>
          </div>
          {segments.length > 0 && (
            <button
              onClick={() => { clearSegments(); setStatus('Clip list cleared.') }}
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
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 bg-zinc-50 ${dragOverId === segment.id ? 'border-cyan-500 ring-2 ring-cyan-200' : 'border-zinc-200'}`}
              >
                <GripVertical size={14} className="text-zinc-400" />
                <button
                  onClick={() => {
                    setTrimStart(segment.start)
                    setTrimEnd(segment.end)
                  }}
                  className="text-left flex-1"
                >
                  <p className="text-sm font-medium text-zinc-800">{segment.label || `Clip ${index + 1}`}</p>
                  <p className="text-xs text-zinc-500">{formatTime(segment.start)} → {formatTime(segment.end)} · {formatTime(segment.end - segment.start)}</p>
                </button>
                <button
                  onClick={() => removeSegment(segment.id)}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
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

      {status && (
        <div className="rounded-xl border border-zinc-200 bg-cyan-50 px-3 py-2 text-sm text-zinc-700">
          {status}
        </div>
      )}
    </div>
  )
}
