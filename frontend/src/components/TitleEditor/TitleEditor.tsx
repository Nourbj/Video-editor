import { useEffect, useState } from 'react'
import { Type, AlignLeft, AlignCenter, AlignRight, CheckCircle2 } from 'lucide-react'
import { useStore } from '../../store/useStore'

const fonts = [
  'Arial',
  'Georgia',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
  'Courier New',
  'Impact',
  'Comic Sans MS',
]

const positions = [
  'top-left', 'top', 'top-right',
  'middle-left', 'middle', 'middle-right',
  'bottom-left', 'bottom', 'bottom-right',
] as const

export default function TitleEditor() {
  const {
    titleText, setTitleText,
    titleFont, setTitleFont,
    titleSize, setTitleSize,
    titleColor, setTitleColor,
    titlePosition, setTitlePosition,
  } = useStore()

  const [draftText, setDraftText] = useState(titleText)
  const [draftFont, setDraftFont] = useState(titleFont)
  const [draftSize, setDraftSize] = useState(titleSize)
  const [draftColor, setDraftColor] = useState(titleColor)
  const [draftPosition, setDraftPosition] = useState(titlePosition)

  useEffect(() => {
    setDraftText(titleText)
    setDraftFont(titleFont)
    setDraftSize(titleSize)
    setDraftColor(titleColor)
    setDraftPosition(titlePosition)
  }, [titleText, titleFont, titleSize, titleColor, titlePosition])

  const hasChanges =
    draftText !== titleText ||
    draftFont !== titleFont ||
    draftSize !== titleSize ||
    draftColor !== titleColor ||
    draftPosition !== titlePosition

  const applyChanges = () => {
    setTitleText(draftText)
    setTitleFont(draftFont)
    setTitleSize(draftSize)
    setTitleColor(draftColor)
    setTitlePosition(draftPosition)
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-0.5">Title</h2>
        <p className="text-xs text-zinc-500">Add a text title with font, size, color, and position</p>
      </div>

      <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[12px] font-medium text-zinc-700 flex items-center gap-1.5">
            <Type size={14} /> Title text
          </label>
          <span className="text-[10px] text-zinc-400">Leave empty to hide</span>
        </div>
        <input
          value={draftText}
          onChange={e => setDraftText(e.target.value)}
          placeholder="Write your title here"
          className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-sm text-zinc-800 outline-none focus:border-cyan-400"
        />
      </div>

      <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-3 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-[11px] text-zinc-500">Font</label>
            <select
              value={draftFont}
              onChange={e => setDraftFont(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-xs text-zinc-700"
            >
              {fonts.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div className="w-24 space-y-1">
            <div className="flex justify-between text-[11px] text-zinc-500">
              <span>Size</span>
              <span className="font-mono">{draftSize}px</span>
            </div>
            <input
              type="range" min={12} max={120} step={1}
              value={draftSize}
              onChange={e => setDraftSize(Number(e.target.value))}
              className="w-full accent-cyan-600 h-1 mt-2"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-zinc-100">
          <label className="text-[11px] text-zinc-500 w-8">Color</label>
          <input
            type="color"
            value={draftColor}
            onChange={e => setDraftColor(e.target.value)}
            className="w-6 h-6 p-0 border border-zinc-200 rounded bg-white"
          />
          <input
            value={draftColor}
            onChange={e => setDraftColor(e.target.value)}
            className="flex-1 bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs font-mono text-zinc-600"
          />
        </div>
      </div>

      <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-3 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[11px] text-zinc-500">Position</div>
          <div className="flex items-center gap-2 text-zinc-400">
            <AlignLeft size={12} />
            <AlignCenter size={12} />
            <AlignRight size={12} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {positions.map(pos => (
            <button
              key={pos}
              onClick={() => setDraftPosition(pos)}
              className={`px-1 py-1.5 rounded-md text-[11px] font-medium border transition-colors ${
                draftPosition === pos
                  ? 'bg-cyan-600 text-white border-cyan-600'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              {pos.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={applyChanges}
        disabled={!hasChanges}
        className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
      >
        <CheckCircle2 size={15} />
        Apply title
      </button>
    </div>
  )
}
