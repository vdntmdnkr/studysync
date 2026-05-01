import { useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music } from 'lucide-react'
import { useMusicStore, BUNDLED_TRACKS } from '../../app/store/musicStore'
import type { RefObject } from 'react'
import type { PeerConnection } from '../../lib/webrtc/PeerConnection'

interface MusicPanelProps {
  peerConnectionRef: RefObject<PeerConnection | null>
}

export default function MusicPanel({ peerConnectionRef }: MusicPanelProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const {
    isPlaying, currentTrackIndex, currentTime, volume, isMuted,
    setIsPlaying, setCurrentTime, setVolume, setIsMuted,
    nextTrack, prevTrack, getCurrentTrack,
  } = useMusicStore()

  const currentTrack = getCurrentTrack()

  // Sync audio element with store
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = isMuted ? 0 : volume
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false))
    } else {
      audio.pause()
    }
  }, [isPlaying, volume, isMuted])

  const handlePlayPause = () => {
    const newPlaying = !isPlaying
    setIsPlaying(newPlaying)

    // Sync to peer
    peerConnectionRef.current?.sendOnChannel('music-sync', {
      action: newPlaying ? 'play' : 'pause',
      trackIndex: currentTrackIndex,
      timestamp: audioRef.current?.currentTime || 0,
      serverTime: Date.now(),
    })
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value))
    if (audioRef.current) audioRef.current.volume = parseFloat(e.target.value)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const progress = currentTrack.duration > 0
    ? ((audioRef.current?.currentTime || currentTime) / currentTrack.duration) * 100
    : 0

  return (
    <div className="p-3 flex flex-col gap-3 flex-shrink-0" style={{ minHeight: 120 }}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Music size={12} style={{ color: 'var(--color-accent-green)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Study Music</span>
      </div>

      {/* Track info */}
      <div className="flex items-center gap-3">
        {/* Album art placeholder */}
        <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #5DCAA5, #4ECDC4)', opacity: isPlaying ? 1 : 0.5 }}>
          <Music size={14} color="white" />
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

      {/* Progress bar */}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #5DCAA5, #4ECDC4)',
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={prevTrack}
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
          <button onClick={nextTrack}
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
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: 'var(--color-accent-green)' }}
          />
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={nextTrack}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
        }}
      />
    </div>
  )
}
