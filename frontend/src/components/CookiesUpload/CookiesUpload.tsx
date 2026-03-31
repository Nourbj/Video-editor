import { useRef, useState } from 'react'
import { Upload, Cookie } from 'lucide-react'
import { uploadCookies } from '../../api/client'

export default function CookiesUpload() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.txt')) {
      setError('Please upload a .txt cookies file')
      return
    }
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const res = await uploadCookies(file)
      setMessage(`Cookies uploaded: ${res.path}`)
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-1">Cookies</h2>
        <p className="text-sm text-zinc-500">Upload yt-dlp cookies (public)</p>
      </div>

      <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <Cookie size={16} />
          <span>File must be Netscape format (.txt)</span>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".txt"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="px-3 py-2 rounded-lg text-xs font-medium bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:bg-zinc-200 disabled:text-zinc-400 transition-colors flex items-center gap-2"
        >
          <Upload size={14} />
          {loading ? 'Uploading...' : 'Upload cookies file'}
        </button>
      </div>

      {message && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-500 text-sm">
          {message}
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
