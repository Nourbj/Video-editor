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
    titleBgColor, setTitleBgColor,
    titleBorderColor, setTitleBorderColor,
    titleBorderWidth, setTitleBorderWidth,
    titleFrameColor, setTitleFrameColor,
    titleFrameWidth, setTitleFrameWidth,
    titlePadding, setTitlePadding,
    titleX, titleY, setTitleXY,
    titleDraftX, titleDraftY, setTitleDraftXY,
    isApplyingTitle, setIsApplyingTitle,
    previewLoading,
  } = useStore()

  const [draftText, setDraftText] = useState(titleDraftText || titleText)
  const [draftFont, setDraftFont] = useState(titleFont)
  const [draftSize, setDraftSize] = useState(titleSize)
  const [draftColor, setDraftColor] = useState(titleColor)
  const [draftBgColor, setDraftBgColor] = useState(titleBgColor)
  const [draftBorderColor, setDraftBorderColor] = useState(titleBorderColor)
  const [draftBorderWidth, setDraftBorderWidth] = useState(titleBorderWidth)
  const [draftFrameColor, setDraftFrameColor] = useState(titleFrameColor)
  const [draftFrameWidth, setDraftFrameWidth] = useState(titleFrameWidth)
  const [draftPadding, setDraftPadding] = useState(titlePadding)
  const [draftX, setDraftX] = useState(titleDraftX ?? titleX)
  const [draftY, setDraftY] = useState(titleDraftY ?? titleY)

  useEffect(() => {
    setDraftText(titleDraftText || titleText)
    setDraftFont(titleFont)
    setDraftSize(titleSize)
    setDraftColor(titleColor)
    setDraftBgColor(titleBgColor)
    setDraftBorderColor(titleBorderColor)
    setDraftBorderWidth(titleBorderWidth)
    setDraftFrameColor(titleFrameColor)
    setDraftFrameWidth(titleFrameWidth)
    setDraftPadding(titlePadding)
    setDraftX(titleDraftX ?? titleX)
    setDraftY(titleDraftY ?? titleY)
  }, [titleText, titleDraftText, titleFont, titleSize, titleColor, titleBgColor, titleBorderColor, titleBorderWidth, titleFrameColor, titleFrameWidth, titlePadding, titleDraftX, titleDraftY, titleX, titleY])

  const hasChanges =
    draftText !== titleText ||
    draftFont !== titleFont ||
    draftSize !== titleSize ||
    draftColor !== titleColor ||
    draftBgColor !== titleBgColor ||
    draftBorderColor !== titleBorderColor ||
    draftBorderWidth !== titleBorderWidth ||
    draftFrameColor !== titleFrameColor ||
    draftFrameWidth !== titleFrameWidth ||
    draftPadding !== titlePadding ||
    draftX !== titleX ||
    draftY !== titleY

  const applyChanges = () => {
    if (isApplyingTitle || previewLoading) return
    setIsApplyingTitle(true)
    setTitleText(draftText)
    setTitleDraftText(draftText)
    setTitleFont(draftFont)
    setTitleSize(draftSize)
    setTitleColor(draftColor)
    setTitleBgColor(draftBgColor)
    setTitleBorderColor(draftBorderColor)
    setTitleBorderWidth(draftBorderWidth)
    setTitleFrameColor(draftFrameColor)
    setTitleFrameWidth(draftFrameWidth)
    setTitlePadding(draftPadding)
    setTitleXY(draftX ?? null, draftY ?? null)
    setTitleDraftXY(draftX ?? null, draftY ?? null)
    window.setTimeout(() => setIsApplyingTitle(false), 0)
  }

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-0.5">Title</h2>
        <p className="text-xs text-zinc-500">Add a text title with font, size, color, and position</p>
      </div>

      <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="title-text" className="text-[12px] font-medium text-zinc-700 flex items-center gap-1.5">
            <Type size={14} /> Title text
          </label>
          <span className="text-[10px] text-zinc-400">Leave empty to hide</span>
        </div>
        <input
          id="title-text"
          value={draftText}
          onChange={e => {
            setDraftText(e.target.value)
            setTitleDraftText(e.target.value)
          }}
          placeholder="Write your title here"
          className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-sm text-zinc-800 outline-none focus:border-cyan-400"
        />
      </div>

      <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-3 space-y-2">
        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <label htmlFor="title-font" className="text-[11px] text-zinc-500">Font</label>
            <select
              id="title-font"
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
              aria-label="Title font size"
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
            aria-label="Title text color"
            className="w-6 h-6 p-0 border border-zinc-200 rounded bg-white"
          />
          <input
            value={draftColor}
            onChange={e => setDraftColor(e.target.value)}
            aria-label="Title text color value"
            className="flex-1 bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs font-mono text-zinc-600"
          />
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-zinc-100">
          <label className="text-[11px] text-zinc-500 w-16">Background</label>
          <input
            type="color"
            value={draftBgColor}
            onChange={e => setDraftBgColor(e.target.value)}
            aria-label="Title background color"
            className="w-6 h-6 p-0 border border-zinc-200 rounded bg-white"
          />
          <input
            value={draftBgColor}
            onChange={e => setDraftBgColor(e.target.value)}
            aria-label="Title background color value"
            className="flex-1 bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs font-mono text-zinc-600"
          />
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-zinc-100">
          <label className="text-[11px] text-zinc-500 w-16">Bordure texte</label>
          <input
            type="color"
            value={draftBorderColor}
            onChange={e => setDraftBorderColor(e.target.value)}
            aria-label="Title text border color"
            className="w-6 h-6 p-0 border border-zinc-200 rounded bg-white"
          />
          <input
            value={draftBorderColor}
            onChange={e => setDraftBorderColor(e.target.value)}
            aria-label="Title text border color value"
            className="flex-1 bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs font-mono text-zinc-600"
          />
          <div className="w-24">
            <div className="flex justify-between text-[11px] text-zinc-500">
              <span>Size</span>
              <span className="font-mono">{draftBorderWidth}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={16}
              step={1}
              value={draftBorderWidth}
              onChange={e => setDraftBorderWidth(Number(e.target.value))}
              aria-label="Title text border width"
              className="w-full accent-cyan-600 h-1 mt-1"
            />
          </div>
        </div>

        <div className="pt-1 border-t border-zinc-100 space-y-2">
          <div className="text-[11px] text-zinc-500">Cadre fond</div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={draftFrameColor}
              onChange={e => setDraftFrameColor(e.target.value)}
              aria-label="Title background frame color"
              className="w-6 h-6 p-0 border border-zinc-200 rounded bg-white"
            />
            <input
              value={draftFrameColor}
              onChange={e => setDraftFrameColor(e.target.value)}
              aria-label="Title background frame color value"
              className="flex-1 bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs font-mono text-zinc-600"
            />
            <div className="w-24">
              <div className="flex justify-between text-[11px] text-zinc-500">
                <span>Size</span>
                <span className="font-mono">{draftFrameWidth}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={24}
                step={1}
                value={draftFrameWidth}
                onChange={e => setDraftFrameWidth(Number(e.target.value))}
                aria-label="Title background frame width"
                className="w-full accent-cyan-600 h-1 mt-1"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-zinc-500 w-16">Padding</label>
            <div className="flex-1">
              <div className="flex justify-between text-[11px] text-zinc-500">
                <span>Inner</span>
                <span className="font-mono">{draftPadding}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={24}
                step={1}
                value={draftPadding}
                onChange={e => setDraftPadding(Number(e.target.value))}
                aria-label="Title padding"
                className="w-full accent-cyan-600 h-1 mt-1"
              />
            </div>
          </div>
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
        disabled={!hasChanges || isApplyingTitle || previewLoading}
        className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
      >
        <CheckCircle2 size={15} />
        {isApplyingTitle || previewLoading ? 'Application en cours...' : 'Appliquer le titre'}
      </button>
    </div>
  )
}
