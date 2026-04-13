import React, { useState, useRef } from 'react'
import { Link, Upload, Loader2, Youtube, Instagram, Facebook, Download, CheckCircle, Video, X } from 'lucide-react'
import { downloadFromUrl, uploadVideo } from '../../api/client'
import { useStore } from '../../store/useStore'
import AudioUploadSection from '../AudioEditor/AudioUploadSection'

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  youtube: <Youtube size={16} className="text-red-400" />,
  instagram: <Instagram size={16} className="text-pink-400" />,
  facebook: <Facebook size={16} className="text-blue-400" />,
}

function detectPlatform(url: string) {
  if (url.includes('youtube') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('instagram')) return 'instagram'
  if (url.includes('facebook') || url.includes('fb.com')) return 'facebook'
  return null
}

function isLikelyPublicFacebookVideo(rawUrl: string) {
  try {
    const u = new URL(rawUrl)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'fb.watch') return true
    const path = u.pathname
    if (/\/reel\/\d+/.test(path)) return true
    if (/\/videos\/\d+/.test(path)) return true
    if (path === '/watch/' && u.searchParams.get('v')) return true
    return false
  } catch {
    return false
  }
}

export default function ImportPanel() {
  const { video, setVideo, setActiveTab } = useStore()
  const [importTab, setImportTab] = useState<'video' | 'audio'>('video')
  const [videoTab, setVideoTab] = useState<'file' | 'url'>('file')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const platform = detectPlatform(url)

  const handleUrlDownload = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    if (platform === 'facebook' && !isLikelyPublicFacebookVideo(url)) {
      setLoading(false)
      setError('Please paste a direct public Facebook video/reel link (with an ID).')
      return
    }
    try {
      const info = await downloadFromUrl(url)
      setVideo(info)
      setActiveTab('edit')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Please select a video file')
      return
    }
    setLoading(true)
    setError(null)
    setUploadProgress(0)
    try {
      const info = await uploadVideo(file, setUploadProgress)
      setVideo(info)
      setActiveTab('edit')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Import media</h2>
        <p className="text-xs text-zinc-500">Upload video and audio files</p>
      </div>

      {/* Tabs */}
      <div className="bg-zinc-100 rounded-2xl p-1 border border-zinc-200">
        <div className="grid grid-cols-2 gap-1">
          {[
            { id: 'video', label: 'Video' },
            { id: 'audio', label: 'Audio' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setImportTab(tab.id as typeof importTab)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${importTab === tab.id
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Video Tab */}
      {importTab === 'video' && (
        <div className="space-y-3">
          {/* Video loaded state */}
          {video ? (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle size={24} className="text-green-600" />
                  </div>
                  <div>
                    {video.thumbnail && (
                      <img src={video.thumbnail} alt="" className="w-16 h-16 rounded-lg object-cover mb-2 border border-green-200" />
                    )}
                    <p className="text-sm font-semibold text-green-900">{video.title}</p>
                    <p className="text-xs text-green-700 mt-0.5">{video.filename}</p>
                  </div>
                </div>
                <button
                  onClick={() => setVideo(null)}
                  className="p-1 hover:bg-green-200 rounded-lg transition-colors text-green-600"
                  aria-label="Remove video"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tab switcher for File/URL */}
              <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
                <button
                  onClick={() => setVideoTab('file')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${videoTab === 'file' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                >
                  <Upload size={13} /> File
                </button>
                <button
                  onClick={() => setVideoTab('url')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${videoTab === 'url' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                >
                  <Link size={13} /> URL
                </button>
              </div>

              {videoTab === 'file' ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center cursor-pointer transition-all ${dragOver ? 'border-cyan-600 bg-cyan-600/10' : 'border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50'}`}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    aria-label="Upload video file"
                    onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  />
                  <Upload size={32} className="mx-auto mb-3 text-zinc-400" />
                  <p className="text-zinc-700 font-medium">Drop video here or click to browse</p>
                  <p className="text-zinc-500 text-xs mt-1">MP4, MOV, AVI, MKV</p>
                  {uploadProgress > 0 && (
                    <div className="mt-4 mx-auto max-w-xs">
                      <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-600 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">{uploadProgress}%</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500">Download video from YouTube, Instagram, or Facebook</p>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      {platform ? PLATFORM_ICONS[platform] : <Link size={16} className="text-zinc-400" />}
                    </div>
                    <input
                      id="video-url"
                      type="url"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleUrlDownload()}
                      placeholder="https://youtube.com/watch?v=... or Instagram / Facebook"
                      className="w-full bg-white border border-zinc-300 rounded-xl pl-10 pr-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 transition-all text-sm"
                    />
                  </div>
                  <button
                    onClick={handleUrlDownload}
                    disabled={loading || !url.trim()}
                    className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 w-full text-sm"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    {loading ? 'Downloading...' : 'Download'}
                  </button>
                  <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><Youtube size={12} className="text-red-400" /> YouTube</span>
                    <span className="flex items-center gap-1"><Instagram size={12} className="text-pink-400" /> Instagram</span>
                    <span className="flex items-center gap-1"><Facebook size={12} className="text-blue-400" /> Facebook</span>
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Audio Tab */}
      {importTab === 'audio' && (
        <AudioUploadSection />
      )}
    </div>
  )
}
