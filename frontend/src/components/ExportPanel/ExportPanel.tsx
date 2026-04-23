import { useState } from 'react'
import {
  Download,
  Loader2,
  CheckCircle2,
  Scissors,
  Music,
  FileText,
  Image as ImageIcon,
  Type,
  Square,
  Youtube,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Music2,
} from 'lucide-react'
import { createSubtitles, exportVideo } from '../../api/client'
import { useStore } from '../../store/useStore'

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function ExportPanel() {
  const {
    video, trimStart, trimEnd,
    audioTrack, audioVolume, replaceOriginalAudio, audioDuration,
    audioApplied, appliedAudioVolume, appliedReplaceOriginal, appliedAudioTrimStart, appliedAudioTrimEnd,
    subtitles, subtitleFilename,
    subtitleStyle,
    logoImage, logoSize, logoX, logoY,
    titleText, titleFont, titleSize, titleColor, titleBgColor, titleBorderColor, titleBorderWidth, titleFrameColor, titleFrameWidth, titlePadding, titleX, titleY,
    borderEnabled, borderWidth, borderHeight, borderColor, borderMode,
    audioOffset, appliedAudioOffset,
    exportQuality, setExportQuality,
    exportAspectRatio, setExportAspectRatio,
    exportFilename, setExportFilename,
    setProcessedUrl,
  } = useStore()

  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('')
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exportTab, setExportTab] = useState<'ratio' | 'quality' | 'name' | 'summary'>('name')

  const hasTrim = video && (trimStart > 0 || trimEnd < video.duration)
  const hasAudio = !!audioTrack
  const hasSubtitles = subtitles.length > 0
  const hasLogo = !!logoImage
  const hasAppliedAudio = !!audioTrack && audioApplied
  const hasAppliedAudioTrim = hasAppliedAudio && audioDuration > 0 && (appliedAudioTrimStart > 0 || appliedAudioTrimEnd < audioDuration)

  const handleExport = async () => {
    if (!video) return
    setLoading(true)
    setError(null)
    setDone(null)

    try {
      let subFile = subtitleFilename
      if (hasSubtitles && !subFile) {
        setStep('Saving subtitles...')
        const res = await createSubtitles(subtitles)
        subFile = res.filename
      }

      setStep('Processing and exporting...')
      console.log('[ExportPanel] Exporting with params:', {
        filename: video.filename,
        audioFilename: audioTrack?.filename,
        audioVolume,
        replaceOriginal: replaceOriginalAudio,
      })
      const result = await exportVideo({
        filename: video.filename,
        quality: exportQuality,
        aspectRatio: exportAspectRatio,
        outputName: exportFilename.trim() || undefined,
        startTime: hasTrim ? trimStart : undefined,
        endTime: hasTrim ? trimEnd : undefined,
        audioFilename: audioTrack?.filename,
        audioVolume: hasAppliedAudio ? appliedAudioVolume : undefined,
        audioStartTime: hasAppliedAudioTrim ? appliedAudioTrimStart : undefined,
        audioEndTime: hasAppliedAudioTrim ? appliedAudioTrimEnd : undefined,
        audioOffset: hasAppliedAudio ? appliedAudioOffset : undefined,
        replaceOriginal: hasAppliedAudio ? appliedReplaceOriginal : undefined,
        subtitleFilename: subFile || undefined,
        subtitleStyle,
        titleStyle: titleText.trim() ? {
          text: titleText.trim(),
          font: titleFont,
          size: titleSize,
          color: titleColor,
          bgColor: titleBgColor,
          borderColor: titleBorderColor,
          borderWidth: titleBorderWidth,
          frameColor: titleFrameColor,
          frameWidth: titleFrameWidth,
          padding: titlePadding,
          x: titleX ?? undefined,
          y: titleY ?? undefined,
        } : undefined,
        borderStyle: {
          enabled: borderEnabled,
          sizeX: borderWidth,
          sizeY: borderHeight,
          color: borderColor,
          mode: borderMode,
        },
        logoFilename: logoImage?.filename,
        logoSize,
        logoX: logoX ?? undefined,
        logoY: logoY ?? undefined,
      })

      setProcessedUrl(result.url)
      setDone(result.url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setLoading(false)
      setStep('')
    }
  }


  if (!video) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p>Import a video first</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-1">Export</h2>
        <p className="text-xs text-zinc-500">Review settings and export your final video</p>
      </div>

      {/* Export tabs */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {([
            { id: 'name', label: 'File name' },
            // { id: 'quality', label: 'Quality' },
            { id: 'ratio', label: 'Aspect ratio' },
            { id: 'summary', label: 'Summary' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setExportTab(tab.id)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                exportTab === tab.id
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {exportTab === 'name' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">File name</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={exportFilename}
              onChange={e => setExportFilename(e.target.value)}
              placeholder="my_export"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
            />
            <span className="text-xs text-zinc-500">.mp4</span>
          </div>
        </div>
      )}

      {/*
      {exportTab === 'quality' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">Output quality</label>
          <div className="flex gap-2">
            {(['480p', '720p', '1080p'] as const).map(q => (
              <button
                key={q}
                onClick={() => setExportQuality(q)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  exportQuality === q
                    ? 'bg-cyan-600 text-white'
                    : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
      */}

      {exportTab === 'ratio' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">Aspect ratio</label>
          <div className="grid grid-cols-2 gap-2">
          {([
            {
              id: 'original',
              ratioLabel: 'Original',
              label: 'Original',
              icons: [],
            },
            {
              id: '16:9',
              ratioLabel: '16:9',
              label: 'Standard',
              icons: [
                { node: <Youtube size={12} className="text-white" />, className: 'bg-[#FF0000]' },
                { node: <Linkedin size={12} className="text-white" />, className: 'bg-[#0A66C2]' },
                { node: <Twitter size={12} className="text-white" />, className: 'bg-zinc-900' },
              ],
            },
            {
              id: '9:16',
              ratioLabel: '9:16',
              label: 'Reels / Stories / Shorts',
              icons: [
                { node: <Music2 size={12} className="text-white" />, className: 'bg-black' },
                { node: <Instagram size={12} className="text-white" />, className: 'bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400' },
                { node: <Facebook size={12} className="text-white" />, className: 'bg-[#1877F2]' },
                { node: <Youtube size={12} className="text-white" />, className: 'bg-[#FF0000]' },
                { node: <Twitter size={12} className="text-white" />, className: 'bg-zinc-900' },
              ],
            },
            {
              id: '4:5',
              ratioLabel: '4:5',
              label: 'Feed (best)',
              icons: [
                { node: <Instagram size={12} className="text-white" />, className: 'bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400' },
                { node: <Facebook size={12} className="text-white" />, className: 'bg-[#1877F2]' },
              ],
            },
            {
              id: '1:1',
              ratioLabel: '1:1',
              label: 'Feed',
              icons: [
                { node: <Facebook size={12} className="text-white" />, className: 'bg-[#1877F2]' },
                { node: <Instagram size={12} className="text-white" />, className: 'bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400' },
              ],
            },
            {
              id: '5:4',
              ratioLabel: '5:4',
              label: 'Classic (desktop)',
              icons: [
                { node: <Square size={12} className="text-white" />, className: 'bg-zinc-600' },
              ],
            },
            {
              id: '4:3',
              ratioLabel: '4:3',
              label: 'Classic (TV)',
              icons: [
                { node: <Square size={12} className="text-white" />, className: 'bg-zinc-700' },
              ],
            },
            {
              id: '3:2',
              ratioLabel: '3:2',
              label: 'Photo',
              icons: [
                { node: <ImageIcon size={12} className="text-white" />, className: 'bg-zinc-700' },
              ],
            },
          ] as const).map(r => (
            <button
              key={`${r.id}-${r.label}`}
              onClick={() => setExportAspectRatio(r.id)}
              className={`p-2 rounded-xl text-sm font-medium transition-all ${exportAspectRatio === r.id
                ? 'bg-cyan-600 text-white border border-cyan-700 shadow-[0_8px_20px_rgba(8,145,178,0.25)]'
                : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
                }`}
            >
              {r.id === 'original' ? (
                <div className="flex h-full items-center justify-center">
                  <div className={`text-[11px] font-semibold ${exportAspectRatio === r.id ? 'text-white' : 'text-zinc-700'}`}>{r.label}</div>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`relative border border-current/40 ${exportAspectRatio === r.id ? 'text-white/90' : 'text-zinc-500'
                        } ${r.id === '16:9'
                          ? 'w-12 h-7'
                          : r.id === '9:16'
                            ? 'w-7 h-12'
                            : r.id === '4:5'
                              ? 'w-7 h-9'
                              : r.id === '1:1'
                                ? 'w-8 h-8'
                                : 'w-10 h-7'
                        }`}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold">
                        {r.ratioLabel}
                      </span>
                    </div>
                    <div className={`text-[11px] font-semibold ${exportAspectRatio === r.id ? 'text-white' : 'text-zinc-700'}`}>{r.label}</div>
                  </div>
                  <div className="flex flex-wrap gap-1 min-h-[28px] justify-center">
                    {r.icons.map((icon, index) => (
                      <span
                        key={`${r.id}-${index}`}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${icon.className} ${exportAspectRatio === r.id ? 'ring-2 ring-white/40' : ''}`}
                      >
                        {icon.node}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </button>
          ))}
          </div>
        </div>
      )}

      {exportTab === 'summary' && (
        <div className="bg-zinc-50 rounded-xl p-4 space-y-3 border border-zinc-200">
          <h3 className="text-sm font-semibold text-zinc-700">Export summary</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-zinc-500"><Scissors size={13} /> Trim</span>
              <span className="text-zinc-700 font-mono text-xs">
                {hasTrim ? `${formatTime(trimStart)} → ${formatTime(trimEnd)} (${formatTime(trimEnd - trimStart)})` : 'Full video'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-zinc-500"><Music size={13} /> Audio</span>
              <span className="text-zinc-700 text-xs">
                {hasAppliedAudio
                  ? `${audioTrack!.filename} (${Math.round(appliedAudioVolume * 100)}%, ${appliedReplaceOriginal ? 'replace' : 'mix'})${hasAppliedAudioTrim ? ` — Trim ${formatTime(appliedAudioTrimStart)}→${formatTime(appliedAudioTrimEnd)}` : ''}${appliedAudioOffset > 0 ? ` — Offset ${formatTime(appliedAudioOffset)}` : ''}`
                  : hasAudio ? 'Not applied' : 'Original'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-zinc-500"><FileText size={13} /> Subtitles</span>
              <span className="text-zinc-700 text-xs">
                {hasSubtitles ? `${subtitles.length} entries` : 'None'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-zinc-500"><ImageIcon size={13} /> Logo</span>
              <span className="text-zinc-700 text-xs">
                {hasLogo
                  ? `${logoImage!.filename} (${logoSize}%, x:${Math.round((logoX ?? 0) * 100)}%, y:${Math.round((logoY ?? 0) * 100)}%)`
                  : 'None'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-zinc-500"><Type size={13} /> Title</span>
              <span className="text-zinc-700 text-xs">
                {titleText.trim() ? `${titleText.trim().slice(0, 18)}${titleText.trim().length > 18 ? '…' : ''} (${titleFont}, ${titleSize}px)` : 'None'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-zinc-500"><Square size={13} /> Border</span>
            <span className="text-zinc-700 text-xs">
              {borderEnabled && (borderWidth > 0 || borderHeight > 0)
                ? `${borderWidth}px × ${borderHeight}px ${borderColor} (${borderMode})`
                : 'None'}
            </span>
          </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-zinc-500"><Square size={13} /> Aspect</span>
              <span className="text-zinc-700 text-xs">
                {exportAspectRatio === 'original' ? 'Original' : exportAspectRatio}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-zinc-500"><Square size={13} /> File name</span>
              <span className="text-zinc-700 text-xs">
                {exportFilename.trim() ? `${exportFilename.trim()}.mp4` : 'Auto'}
              </span>
            </div>
          </div>
        </div>
      )}


      {/* Export button */}
      {!done ? (
        <button
          onClick={handleExport}
          disabled={loading}
          className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-xl font-semibold text-base transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              {step || 'Processing...'}
            </>
          ) : (
            <>
              <Download size={18} />
              Export video
            </>
          )}
        </button>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle2 size={16} />
            Export complete!
          </div>
          <a
            href={done}
            download={exportFilename.trim() ? `${exportFilename.trim()}.mp4` : undefined}
            className="w-full py-3.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold text-base text-center transition-colors flex items-center justify-center gap-2"
          >
            <Download size={18} />
            Download MP4
          </a>
          <button
            onClick={() => { setDone(null); setError(null) }}
            className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm transition-colors"
          >
            Export again with different settings
          </button>
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
