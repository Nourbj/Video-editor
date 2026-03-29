import React from 'react'
import { Upload, Scissors, Music, FileText, Download, Film, RotateCcw } from 'lucide-react'
import { useStore } from './store/useStore'
import ImportPanel from './components/ImportPanel/ImportPanel'
import VideoPlayer from './components/VideoPlayer/VideoPlayer'
import AudioEditor from './components/AudioEditor/AudioEditor'
import SubtitleEditor from './components/SubtitleEditor/SubtitleEditor'
import ExportPanel from './components/ExportPanel/ExportPanel'

type Tab = 'import' | 'edit' | 'audio' | 'subtitles' | 'export'

const TABS: { id: Tab; label: string; icon: React.ReactNode; requiresVideo?: boolean }[] = [
  { id: 'import',    label: 'Import',     icon: <Upload size={15} /> },
  { id: 'edit',      label: 'Edit',       icon: <Scissors size={15} />, requiresVideo: true },
  { id: 'audio',     label: 'Audio',      icon: <Music size={15} />,   requiresVideo: true },
  { id: 'subtitles', label: 'Subtitles',  icon: <FileText size={15} />, requiresVideo: true },
  { id: 'export',    label: 'Export',     icon: <Download size={15} />, requiresVideo: true },
]

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function App() {
  const { video, activeTab, setActiveTab, reset, trimStart, trimEnd, audioTrack, subtitles } = useStore()

  return (
    <div className="min-h-screen bg-zinc-950 text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Top bar */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
              <Film size={14} className="text-white" />
            </div>
            <span className="font-semibold text-white tracking-tight">ClipForge</span>
          </div>

          {video && (
            <div className="flex items-center gap-3">
              <div className="text-xs text-zinc-500 max-w-xs truncate hidden sm:block">
                {video.title}
              </div>
              <button
                onClick={reset}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <RotateCcw size={12} /> New project
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* LEFT: Sidebar nav + panel */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
            {/* Tab nav */}
            <nav className="bg-zinc-900 rounded-2xl p-1.5 border border-zinc-800">
              {TABS.map(tab => {
                const disabled = tab.requiresVideo && !video
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => !disabled && setActiveTab(tab.id)}
                    disabled={disabled}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40'
                        : disabled
                        ? 'text-zinc-700 cursor-not-allowed'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    {/* badges */}
                    {tab.id === 'audio' && audioTrack && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
                    )}
                    {tab.id === 'subtitles' && subtitles.length > 0 && (
                      <span className="ml-auto text-xs bg-zinc-700 text-zinc-400 rounded-full px-1.5 py-0.5">
                        {subtitles.length}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Active panel */}
            <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 min-h-[360px] sm:min-h-[400px]">
              {activeTab === 'import'    && <ImportPanel />}
              {activeTab === 'edit'      && <EditPanel />}
              {activeTab === 'audio'     && <AudioEditor />}
              {activeTab === 'subtitles' && <SubtitleEditor />}
              {activeTab === 'export'    && <ExportPanel />}
            </div>
          </div>

          {/* RIGHT: Preview */}
          <div className="flex-1 min-w-0">
            {video ? (
              <div className="space-y-4">
                {/* Video info bar */}
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  {video.thumbnail && (
                    <img src={video.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{video.title}</p>
                    <p className="text-xs text-zinc-500">
                      {formatTime(video.duration)} &nbsp;·&nbsp; Trim: {formatTime(trimStart)}–{formatTime(trimEnd)}
                      {audioTrack && <>&nbsp;·&nbsp; <span className="text-violet-400">Audio ♪</span></>}
                      {subtitles.length > 0 && <>&nbsp;·&nbsp; <span className="text-violet-400">{subtitles.length} subs</span></>}
                    </p>
                  </div>
                </div>

                {/* Player */}
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
                  <VideoPlayer />
                </div>

                {/* Subtitle preview overlay info */}
                {subtitles.length > 0 && (
                  <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
                    <h3 className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Subtitle preview</h3>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {subtitles.slice(0, 10).map((s, i) => (
                        <div key={i} className="flex items-start gap-3 text-xs">
                          <span className="font-mono text-zinc-600 flex-shrink-0">{s.startTime.slice(0,8)}</span>
                          <span className="text-zinc-300">{s.text}</span>
                        </div>
                      ))}
                      {subtitles.length > 10 && (
                        <p className="text-zinc-600 text-xs">+{subtitles.length - 10} more...</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Empty state */
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 border-dashed h-full min-h-[360px] sm:min-h-[500px] flex flex-col items-center justify-center text-center p-8 sm:p-10">
                <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4">
                  <Film size={28} className="text-zinc-600" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-400 mb-2">No video loaded</h2>
                <p className="text-sm text-zinc-600 max-w-xs">
                  Import a video from YouTube, Instagram, Facebook, or upload a local file to start editing.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Inline edit panel (trim info + quick action)
function EditPanel() {
  const { video, trimStart, trimEnd, setActiveTab, setTrimStart, setTrimEnd } = useStore()
  if (!video) return null

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Edit</h2>
        <p className="text-sm text-zinc-400">Use the player on the right to set trim points</p>
      </div>

      <div className="bg-zinc-800/60 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-medium text-zinc-300">Current selection</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-700/60 rounded-lg p-3">
            <p className="text-xs text-zinc-500 mb-1">Start</p>
            <p className="text-lg font-mono font-semibold text-violet-400">
              {formatTime2(trimStart)}
            </p>
          </div>
          <div className="bg-zinc-700/60 rounded-lg p-3">
            <p className="text-xs text-zinc-500 mb-1">End</p>
            <p className="text-lg font-mono font-semibold text-violet-400">
              {formatTime2(trimEnd)}
            </p>
          </div>
        </div>
        <div className="bg-zinc-700/60 rounded-lg p-3">
          <p className="text-xs text-zinc-500 mb-1">Duration</p>
          <p className="text-lg font-mono font-semibold text-white">
            {formatTime2(trimEnd - trimStart)}
          </p>
        </div>
      </div>

      <button
        onClick={() => { setTrimStart(0); setTrimEnd(video.duration) }}
        className="w-full py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-xl text-sm transition-colors"
      >
        Reset to full video
      </button>

      <button
        onClick={() => setActiveTab('audio')}
        className="w-full py-2.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 rounded-xl text-sm transition-colors"
      >
        Next: Add audio →
      </button>
    </div>
  )
}

function formatTime2(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
