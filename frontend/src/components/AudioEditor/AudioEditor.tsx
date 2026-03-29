import React, { useRef, useState } from 'react'
import { Music, Upload, X, Volume2, Replace } from 'lucide-react'
import { uploadAudio } from '../../api/client'
import { useStore } from '../../store/useStore'

export default function AudioEditor() {
  const {
    audioTrack, setAudioTrack,
    audioVolume, setAudioVolume,
    replaceOriginalAudio, setReplaceOriginalAudio,
  } = useStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleAudioUpload = async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      setError('Please select an audio file (MP3, WAV, AAC...)')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await uploadAudio(file)
      setAudioTrack({ ...result, volume: audioVolume, replaceOriginal: replaceOriginalAudio })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-1">Audio</h2>
        <p className="text-sm text-zinc-500">Add background music or replace the original audio</p>
      </div>

      {/* Upload zone */}
      {!audioTrack ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-zinc-300 hover:border-zinc-400 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-zinc-50"
        >
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            aria-label="Upload audio file"
            onChange={e => e.target.files?.[0] && handleAudioUpload(e.target.files[0])}
          />
          <Music size={28} className="mx-auto mb-3 text-zinc-400" />
          <p className="text-zinc-700 font-medium">Upload audio track</p>
          <p className="text-zinc-500 text-sm mt-1">MP3, WAV, AAC, FLAC</p>
          {loading && <p className="text-violet-400 text-sm mt-2 animate-pulse">Uploading...</p>}
        </div>
      ) : (
        <div className="bg-zinc-50 rounded-xl p-4 space-y-4 border border-zinc-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-600/20 rounded-lg flex items-center justify-center">
                <Music size={18} className="text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900">{audioTrack.filename}</p>
                <p className="text-xs text-zinc-500">Audio track loaded</p>
              </div>
            </div>
            <button
              onClick={() => setAudioTrack(null)}
              aria-label="Remove audio track"
              className="p-1.5 hover:bg-zinc-200 rounded-lg transition-colors text-zinc-500 hover:text-zinc-900"
            >
              <X size={16} />
            </button>
          </div>

          {/* Audio element for preview */}
          <audio controls src={audioTrack.url} className="w-full h-8" style={{ height: 32 }} />
        </div>
      )}

      {audioTrack && (
        <>
          {/* Replace or mix */}
          <div className="bg-zinc-50 rounded-xl p-4 space-y-3 border border-zinc-200">
            <h3 className="text-sm font-medium text-zinc-700 flex items-center gap-2">
              <Replace size={14} />
              Mode
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setReplaceOriginalAudio(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  !replaceOriginalAudio
                    ? 'bg-violet-600 text-white'
                    : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
                }`}
              >
                Mix with original
              </button>
              <button
                onClick={() => setReplaceOriginalAudio(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  replaceOriginalAudio
                    ? 'bg-violet-600 text-white'
                    : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
                }`}
              >
                Replace original
              </button>
            </div>
          </div>

          {/* Volume */}
          <div className="bg-zinc-50 rounded-xl p-4 space-y-3 border border-zinc-200">
            <h3 className="text-sm font-medium text-zinc-700 flex items-center gap-2">
              <Volume2 size={14} />
              Audio volume — {Math.round(audioVolume * 100)}%
            </h3>
            <input
              type="range" min={0} max={2} step={0.05} value={audioVolume}
              onChange={e => setAudioVolume(parseFloat(e.target.value))}
              aria-label="Audio volume"
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Mute</span><span>Normal</span><span>Boost ×2</span>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
