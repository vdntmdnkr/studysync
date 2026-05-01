import { useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music, Radio } from 'lucide-react'
import { useMusicStore, BUNDLED_TRACKS } from '../../app/store/musicStore'
import type { RefObject } from 'react'
import type { PeerConnection } from '../../lib/webrtc/PeerConnection'

interface MusicPanelProps {
  peerConnectionRef: RefObject<PeerConnection | null>
}

export default function MusicPanel({ peerConnectionRef }: MusicPanelProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const {
    isPlaying, currentTrackIndex, volume, isMuted,
    setIsPlaying, setVolume, setIsMuted,
    nextTrack, prevTrack, getCurrentTrack,
  } = useMusicStore()

  const currentTrack = getCurrentTrack()

  // When track changes: update src and reload
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = currentTrack.url
    audio.load()
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false))
    }
  }, [currentTrackIndex])

  // When play/pause or volume changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = isMuted ? 0 : volume
    if (isPlaying) {
      // If no src yet, set it
      if (!audio.src || audio.src === window.location.href) {
        audio.src = currentTrack.url
        audio.load()
      }
      audio.play().catch(() => setIsPlaying(false))
    } else {
      audio.pause()
    }
  }, [isPlaying, volume, isMuted])

  const handlePlayPause = () => {
    const newPlaying = !isPlaying
    setIsPlaying(newPlaying)
    peerConnectionRef.current?.sendOnChannel('music-sync', {
      action: newPlaying ? 'play' : 'pause',
      channelIndex: currentTrackIndex,
    })
  }

  const handleNext = () => {
    nextTrack()
    peerConnectionRef.current?.sendOnChannel('music-sync', {
      action: 'channel',
      channelIndex: (currentTrackIndex + 1) % BUNDLED_TRACKS.length,
    })
  }

  const handlePrev = () => {
    prevTrack()
    peerConnectionRef.current?.sendOnChannel('music-sync', {
      action: 'channel',
      channelIndex: (currentTrackIndex - 1 + BUNDLED_TRACKS.length) % BUNDLED_TRACKS.length,
    })
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
  }

  const genreColor: Record<string, string> = {
    lofi: '#5DCAA5',
    ambient: '#4ECDC4',
    classical: '#a78bfa',
    jazz: '#f0a04b',
    electronic: '#60a5fa',
  }

  return (
    <div className="p-3 flex flex-col gap-3 flex-shrink-0" style={{ minHeight: 130 }}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Radio size={12} style={{ color: 'var(--color-accent-green)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Study Radio</span>
        <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full" style={{
          background: `${genreColor[currentTrack.genre] || '#5DCAA5'}20`,
          color: genreColor[currentTrack.genre] || '#5DCAA5',
          fontSize: 9,
          fontFamily: 'DM Mono, monospace',
        }}>
          {currentTrack.genre}
        </span>
      </div>

      {/* Track info */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${genreColor[currentTrack.genre] || '#5DCAA5'}, #4ECDC4)` }}>
          <Music size={14} color="white" />
          {isPlaying && (
            <div className="absolute inset-0 flex items-end justify-around px-1 pb-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1 rounded-full animate-pulse"
                  style={{ height: `${[40, 70, 55][i]}%`, background: 'rgba(255,255,255,0.6)', animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
            {currentTrack.title}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
            {currentTrack.artist}
          </p>
        </div>
      </div>

      {/* Live indicator */}
      {isPlaying && (
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>LIVE</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={handlePrev}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5"
            style={{ color: 'var(--color-text-secondary)' }}>
            <SkipBack size={13} />
          </button>
          <button
            onClick={handlePlayPause}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #5DCAA5, #4ECDC4)',
              boxShadow: isPlaying ? 'var(--shadow-glow-green)' : undefined,
            }}
          >
            {isPlaying
              ? <Pause size={13} color="white" />
              : <Play size={13} color="white" style={{ marginLeft: 1 }} />}
          </button>
          <button onClick={handleNext}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5"
            style={{ color: 'var(--color-text-secondary)' }}>
            <SkipForward size={13} />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMuted(!isMuted)}
            className="hover:opacity-70"
            style={{ color: 'var(--color-text-muted)' }}>
            {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
          <input
            type="range" min="0" max="1" step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: 'var(--color-accent-green)' }}
          />
        </div>
      </div>

      {/* Audio element with src */}
      <audio
        ref={audioRef}
        src={currentTrack.url}
        onEnded={handleNext}
        crossOrigin="anonymous"
      />
    </div>
  )
}
