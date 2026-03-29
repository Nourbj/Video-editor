import React, { useState } from 'react'
import { Plus, Trash2, Upload, FileText } from 'lucide-react'
import { createSubtitles, uploadSubtitle } from '../../api/client'
import { useStore } from '../../store/useStore'
import { SubtitleEntry } from '../../api/client'

function secondsToSRT(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  const ms = Math.round((s % 1) * 1000)
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')},${String(ms).padStart(3,'0')}`
}

function srtToSeconds(t: string): number {
  const [hms, ms] = t.replace(',', '.').split('.')
  const [h, m, s] = hms.split(':').map(Number)
  return h * 3600 + m * 60 + s + (parseFloat('0.' + ms) || 0)
}

export default function SubtitleEditor() {
  const { subtitles, setSubtitles, setSubtitleFilename, video } = useStore()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const addEntry = () => {
    const last = subtitles[subtitles.length - 1]
    const startSec = last ? srtToSeconds(last.endTime) + 0.5 : 0
    const endSec = startSec + 3
    const newEntry: SubtitleEntry = {
      index: subtitles.length + 1,
      startTime: secondsToSRT(startSec),
      endTime: secondsToSRT(endSec),
      text: 'New subtitle',
    }
    setSubtitles([...subtitles, newEntry])
    setSaved(false)
  }

  const updateEntry = (i: number, field: keyof SubtitleEntry, value: string) => {
    const updated = [...subtitles]
    updated[i] = { ...updated[i], [field]: value }
    setSubtitles(updated)
    setSaved(false)
  }

  const removeEntry = (i: number) => {
    const updated = subtitles.filter((_, idx) => idx !== i)
      .map((e, idx) => ({ ...e, index: idx + 1 }))
    setSubtitles(updated)
    setSaved(false)
  }

  const handleSave = async () => {
    if (subtitles.length === 0) return
    setSaving(true)
    setError(null)
    try {
      const result = await createSubtitles(subtitles)
      setSubtitleFilename(result.filename)
      setSaved(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleUploadSRT = async (file: File) => {
    try {
      const result = await uploadSubtitle(file)
      setSubtitles(result.entries)
      setSubtitleFilename(result.filename)
      setSaved(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Subtitles</h2>
        <p className="text-sm text-zinc-400">Create manually or upload a .srt file</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={addEntry}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={15} /> Add entry
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-xl text-sm font-medium transition-colors"
        >
          <Upload size={15} /> Import .srt
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".srt"
          className="hidden"
          aria-label="Upload subtitles file (.srt)"
          onChange={e => e.target.files?.[0] && handleUploadSRT(e.target.files[0])} />

        {subtitles.length > 0 && (
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              saved ? 'bg-green-600/20 text-green-400' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
            }`}
          >
            <FileText size={15} />
            {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save SRT'}
          </button>
        )}
      </div>

      {/* Subtitle list */}
      {subtitles.length === 0 ? (
        <div className="text-center py-10 text-zinc-600">
          <FileText size={28} className="mx-auto mb-2" />
          <p className="text-sm">No subtitles yet. Add an entry or upload a .srt file.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {subtitles.map((entry, i) => (
            <div key={i} className="bg-zinc-800/60 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-600 font-mono w-5">{entry.index}</span>
                <input
                  type="text"
                  value={entry.startTime}
                  onChange={e => updateEntry(i, 'startTime', e.target.value)}
                  aria-label={`Start time for subtitle ${entry.index}`}
                  className="flex-1 bg-zinc-700 rounded-lg px-2 py-1 text-xs font-mono text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <span className="text-xs text-zinc-600">→</span>
                <input
                  type="text"
                  value={entry.endTime}
                  onChange={e => updateEntry(i, 'endTime', e.target.value)}
                  aria-label={`End time for subtitle ${entry.index}`}
                  className="flex-1 bg-zinc-700 rounded-lg px-2 py-1 text-xs font-mono text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <button
                  onClick={() => removeEntry(i)}
                  className="p-1 hover:bg-red-500/20 rounded text-zinc-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <textarea
                value={entry.text}
                onChange={e => updateEntry(i, 'text', e.target.value)}
                rows={2}
                aria-label={`Subtitle text for entry ${entry.index}`}
                className="w-full bg-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
              />
            </div>
          ))}
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
