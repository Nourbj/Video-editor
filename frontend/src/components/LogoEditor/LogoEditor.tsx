import { useRef, useState } from 'react'
import { Image as ImageIcon, X } from 'lucide-react'
import { uploadImage } from '../../api/client'
import { useStore } from '../../store/useStore'

export default function LogoEditor() {
  const {
    logoImage, setLogoImage,
    logoSize, setLogoSize,
    logoPosition, setLogoPosition,
  } = useStore()

  const [logoUploading, setLogoUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const logoFileRef = useRef<HTMLInputElement>(null)

  const hasLogo = !!logoImage

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG/JPG/SVG).')
      return
    }
    setLogoUploading(true)
    setError(null)
    try {
      const res = await uploadImage(file)
      setLogoImage(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Logo upload failed')
    } finally {
      setLogoUploading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-1">Logo</h2>
        <p className="text-sm text-zinc-500">Upload a logo/watermark and choose its size and position</p>
      </div>

      <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4 space-y-3">
        <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
          <ImageIcon size={16} /> Logo file
        </label>
        <div className="flex items-center gap-3">
          <input
            ref={logoFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
          />
          <button
            onClick={() => logoFileRef.current?.click()}
            disabled={logoUploading}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:bg-zinc-200 disabled:text-zinc-400 transition-colors"
          >
            {logoUploading ? 'Uploading...' : (hasLogo ? 'Replace logo' : 'Upload logo')}
          </button>
          {hasLogo && (
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <img src={logoImage!.url} alt="" className="w-10 h-10 rounded-md object-contain bg-white border border-zinc-200" />
              <span className="truncate max-w-[160px]">{logoImage!.filename}</span>
              <button
                onClick={() => setLogoImage(null)}
                className="text-zinc-400 hover:text-zinc-600"
                aria-label="Remove logo"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4 space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Size ({logoSize}% of video width)</span>
            <span className="font-mono">{logoSize}%</span>
          </div>
          <input
            type="range"
            min={5}
            max={60}
            step={1}
            value={logoSize}
            onChange={e => setLogoSize(Number(e.target.value))}
            disabled={!hasLogo}
            className="w-full accent-cyan-600 h-1 disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <div className="text-xs text-zinc-500">Position</div>
          <div className="grid grid-cols-3 gap-2">
            {(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'] as const).map(pos => (
              <button
                key={pos}
                onClick={() => setLogoPosition(pos)}
                disabled={!hasLogo}
                className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  logoPosition === pos
                    ? 'bg-cyan-600 text-white border-cyan-600'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                } ${!hasLogo ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {pos.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
