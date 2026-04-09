import { useEffect, useState } from 'react'
import { Type, CheckCircle2 } from 'lucide-react'
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

export default function TitleEditor() {
  const {
    titleText, setTitleText,
    titleDraftText, setTitleDraftText,
    titleFont, setTitleFont,
    titleSize, setTitleSize,
    titleColor, setTitleColor,
    titleX, titleY, setTitleXY,
    titleDraftX, titleDraftY, setTitleDraftXY,
    isApplyingTitle, setIsApplyingTitle,
  } = useStore()

  const [draftText, setDraftText] = useState(titleDraftText || titleText)
  const [draftFont, setDraftFont] = useState(titleFont)
  const [draftSize, setDraftSize] = useState(titleSize)
  const [draftColor, setDraftColor] = useState(titleColor)
  const [draftX, setDraftX] = useState(titleDraftX ?? titleX)
  const [draftY, setDraftY] = useState(titleDraftY ?? titleY)

  useEffect(() => {
    setDraftText(titleDraftText || titleText)
    setDraftFont(titleFont)
    setDraftSize(titleSize)
    setDraftColor(titleColor)
    setDraftX(titleDraftX ?? titleX)
    setDraftY(titleDraftY ?? titleY)
  }, [titleText, titleDraftText, titleFont, titleSize, titleColor, titleDraftX, titleDraftY, titleX, titleY])

  const hasChanges =
    draftText !== titleText ||
    draftFont !== titleFont ||
    draftSize !== titleSize ||
    draftColor !== titleColor ||
    draftX !== titleX ||
    draftY !== titleY

  const applyChanges = () => {
    if (isApplyingTitle) return
    setIsApplyingTitle(true)
    setTitleText(draftText)
    setTitleDraftText(draftText)
    setTitleFont(draftFont)
    setTitleSize(draftSize)
    setTitleColor(draftColor)
    setTitleXY(draftX ?? null, draftY ?? null)
    setTitleDraftXY(draftX ?? null, draftY ?? null)
    window.setTimeout(() => setIsApplyingTitle(false), 0)
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
          onChange={e => {
            setDraftText(e.target.value)
            setTitleDraftText(e.target.value)
          }}
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
        <div className="text-[11px] text-zinc-500">Position</div>
        <div className="text-xs text-zinc-500">
          Déplace le texte directement sur la vidéo (drag &amp; drop). La position sera appliquée après “Appliquer le titre”.
        </div>
      </div>

      <button
        onClick={applyChanges}
        disabled={!hasChanges || isApplyingTitle}
        className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
      >
        <CheckCircle2 size={15} />
        {isApplyingTitle ? 'Application en cours...' : 'Appliquer le titre'}
      </button>
    </div>
  )
}
