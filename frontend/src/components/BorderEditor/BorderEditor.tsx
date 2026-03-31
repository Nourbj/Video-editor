import { useEffect, useState } from 'react'
import { Square, CheckCircle2 } from 'lucide-react'
import { useStore } from '../../store/useStore'

export default function BorderEditor() {
  const {
    borderEnabled, setBorderEnabled,
    borderSize, setBorderSize,
    borderColor, setBorderColor,
  } = useStore()

  const [draftEnabled, setDraftEnabled] = useState(borderEnabled)
  const [draftSize, setDraftSize] = useState(borderSize)
  const [draftColor, setDraftColor] = useState(borderColor)

  useEffect(() => {
    setDraftEnabled(borderEnabled)
    setDraftSize(borderSize)
    setDraftColor(borderColor)
  }, [borderEnabled, borderSize, borderColor])

  const hasChanges =
    draftEnabled !== borderEnabled ||
    draftSize !== borderSize ||
    draftColor !== borderColor

  const applyChanges = () => {
    setBorderEnabled(draftEnabled)
    setBorderSize(draftSize)
    setBorderColor(draftColor)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-1">Border</h2>
        <p className="text-sm text-zinc-500">Add a colored frame around the video</p>
      </div>

      <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4 space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input
            type="checkbox"
            checked={draftEnabled}
            onChange={e => setDraftEnabled(e.target.checked)}
            className="accent-cyan-600"
          />
          <Square size={16} /> Enable border
        </label>

        <div className={`space-y-2 ${!draftEnabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Border size</span>
            <span className="font-mono">{draftSize}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={120}
            step={1}
            value={draftSize}
            onChange={e => setDraftSize(Number(e.target.value))}
            disabled={!draftEnabled}
            className="w-full accent-cyan-600 h-1 disabled:opacity-50"
          />
        </div>

        <div className={`space-y-2 ${!draftEnabled ? 'opacity-50' : ''}`}>
          <label className="text-xs text-zinc-500">Border color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={draftColor}
              onChange={e => setDraftColor(e.target.value)}
              disabled={!draftEnabled}
              className="w-10 h-9 p-0 border border-zinc-200 rounded-lg bg-white"
            />
            <input
              value={draftColor}
              onChange={e => setDraftColor(e.target.value)}
              disabled={!draftEnabled}
              className="flex-1 bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono text-zinc-600"
            />
          </div>
        </div>
      </div>

      <button
        onClick={applyChanges}
        disabled={!hasChanges}
        className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
      >
        <CheckCircle2 size={16} />
        Apply border
      </button>
    </div>
  )
}
