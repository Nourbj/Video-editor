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
    titleAlign, setTitleAlign,
    titleX, titleY, setTitleXY,
    titleDraftX, titleDraftY, setTitleDraftXY,
    isApplyingTitle, setIsApplyingTitle,
    previewLoading,
    setPendingPreviewAction,
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
    setPendingPreviewAction('Title applied successfully.')
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
        <h2 className="text-xl font-semibold text-zinc-900">Title</h2>
        <p className="text-xs text-zinc-500 mb-1">Add a text title with font, size, color, and position</p>
      </div>
      <div className="bg-zinc-50 rounded-xl border border-zinc-200 px-3 py-2 space-y-1">
        <label htmlFor="title-text" className="text-[12px] font-medium text-zinc-700 flex items-center gap-1.5">
          <Type size={14} /> Title text
        </label>
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
      <div className="bg-zinc-50 rounded-xl border border-zinc-200 px-3 py-2 space-y-2">
        <div className="flex items-center gap-3">
          <label htmlFor="title-font" className="text-[11px] text-zinc-500 shrink-0">Font</label>
          <div className="flex-1 min-w-0">
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
          <div className="w-24 self-center">
            <div className="flex justify-between text-[11px] text-zinc-500">
              <span>Size</span>
              <span className="font-mono">{draftSize}px</span>
            </div>
            <input
              type="range" min={12} max={120} step={1}
              value={draftSize}
              onChange={e => setDraftSize(Number(e.target.value))}
              aria-label="Title font size"
              className="w-full -mt-1 accent-cyan-600 h-1"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-[11px] text-zinc-500 shrink-0">Alignment</label>
          <div className="flex flex-1 gap-1.5 p-1 bg-white border border-zinc-200 rounded-xl min-w-0">
            {(['left', 'center', 'right'] as const).map(align => (
              <button
                key={align}
                type="button"
                onClick={() => setTitleAlign(align)}
                className={`flex-1 min-w-0 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${titleAlign === align
                  ? 'bg-zinc-900 text-white'
                  : 'bg-transparent text-zinc-500 hover:bg-zinc-50'
                  }`}
              >
                {align}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <label className="text-[11px] text-zinc-500 w-8 shrink-0">Color</label>
            <input
              type="color"
              value={draftColor}
              onChange={e => setDraftColor(e.target.value)}
              aria-label="Title text color"
              className="w-6 h-6 shrink-0 p-0 border border-zinc-200 rounded bg-white"
            />
            <input
              value={draftColor}
              onChange={e => setDraftColor(e.target.value)}
              aria-label="Title text color value"
              className="min-w-0 flex-1 bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs font-mono text-zinc-600"
            />
          </div>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <label className="text-[11px] text-zinc-500 w-16 shrink-0">Background</label>
            <input
              type="color"
              value={draftBgColor}
              onChange={e => setDraftBgColor(e.target.value)}
              aria-label="Title background color"
              className="w-6 h-6 shrink-0 p-0 border border-zinc-200 rounded bg-white"
            />
            <input
              value={draftBgColor}
              onChange={e => setDraftBgColor(e.target.value)}
              aria-label="Title background color value"
              className="min-w-0 flex-1 bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs font-mono text-zinc-600"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <label className="text-[11px] text-zinc-500 sm:w-16 sm:shrink-0">Text border</label>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <input
              type="color"
              value={draftBorderColor}
              onChange={e => setDraftBorderColor(e.target.value)}
              aria-label="Title text border color"
              className="w-6 h-6 shrink-0 p-0 border border-zinc-200 rounded bg-white"
            />
            <input
              value={draftBorderColor}
              onChange={e => setDraftBorderColor(e.target.value)}
              aria-label="Title text border color value"
              className="min-w-0 flex-1 bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs font-mono text-zinc-600"
            />
            <div className="w-24 shrink-0 self-center">
              <div className="flex justify-between text-[11px] text-zinc-500">
                <span>Size</span>
                <span className="font-mono">{draftBorderWidth}px</span>
              </div>
              <input type="range" min={0} max={16} step={1} value={draftBorderWidth} onChange={e => setDraftBorderWidth(Number(e.target.value))}
                aria-label="Title text border width" className="w-full -mt-1 accent-cyan-600 h-1"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <label className="text-[11px] text-zinc-500 sm:w-16 sm:shrink-0">Background frame</label>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <input type="color" value={draftFrameColor} onChange={e => setDraftFrameColor(e.target.value)}
              aria-label="Title background frame color" className="w-6 h-6 shrink-0 p-0 border border-zinc-200 rounded bg-white"
            />
            <input value={draftFrameColor} onChange={e => setDraftFrameColor(e.target.value)}
              aria-label="Title background frame color value"
              className="min-w-0 flex-1 bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs font-mono text-zinc-600"
            />
            <div className="w-24 shrink-0 self-center">
              <div className="flex justify-between text-[11px] text-zinc-500">
                <span>Size</span>
                <span className="font-mono">{draftFrameWidth}px</span>
              </div>
              <input type="range" min={0} max={24} step={1} value={draftFrameWidth}
                onChange={e => setDraftFrameWidth(Number(e.target.value))} aria-label="Title background frame width"
                className="w-full -mt-1 accent-cyan-600 h-1"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-[11px] text-zinc-500 w-16">Padding</label>
          <div className="flex-1">
            <div className="flex justify-between text-[11px] text-zinc-500">
              <span>Inner</span>
              <span className="font-mono">{draftPadding}px</span>
            </div>
            <input type="range" min={0} max={24} step={1} value={draftPadding} onChange={e => setDraftPadding(Number(e.target.value))}
              aria-label="Title padding" className="w-full -mt-1 accent-cyan-600 h-1"
            />
          </div>
        </div>
        <div>
          <div className="text-[11px] text-zinc-500">Position</div>
          <div className="text-xs text-zinc-500">
            Move the text directly on the video (drag &amp; drop). The position will be applied after "Apply title".
          </div>
        </div>
      </div>
      <button type="button" onClick={applyChanges} disabled={!hasChanges || isApplyingTitle || previewLoading}
        className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
      >
        <CheckCircle2 size={15} />
        {isApplyingTitle || previewLoading ? 'Applying...' : 'Apply title'}
      </button>
    </div>
  )
}
