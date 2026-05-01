import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Timer, Play, Pause, RotateCcw, Settings, X } from 'lucide-react'
import type { RefObject } from 'react'
import type { PeerConnection } from '../../lib/webrtc/PeerConnection'
import { useTimerStore } from '../../app/store/timerStore'

interface PomodoroTimerProps {
  peerConnectionRef: RefObject<PeerConnection | null>
  onClose: () => void
}

export default function PomodoroTimer({ peerConnectionRef, onClose }: PomodoroTimerProps) {
  const { 
    phase, isRunning, timeLeft, focusDuration, breakDuration, 
    sessionsCompleted, setDurations, setIsRunning, setTimeLeft, completePhase
  } = useTimerStore()
  
  const [showSettings, setShowSettings] = useState(false)

  const totalDuration = (phase === 'focus' ? focusDuration : breakDuration) * 60
  const progress = 1 - timeLeft / totalDuration

  const handleStartPause = () => {
    const next = !isRunning
    let newEndsAt = null
    if (next) {
      newEndsAt = Date.now() + timeLeft * 1000
      useTimerStore.setState({ endsAt: newEndsAt })
    } else {
      useTimerStore.setState({ endsAt: null })
    }
    setIsRunning(next)

    // Sync to peer
    peerConnectionRef.current?.sendOnChannel('timer-sync', {
      action: next ? 'start' : 'pause',
      phase,
      endsAt: newEndsAt,
      focusDuration,
      breakDuration,
    })
  }

  const handleReset = () => {
    useTimerStore.getState().resetTimer()
    peerConnectionRef.current?.sendOnChannel('timer-sync', {
      action: 'pause',
      phase,
      endsAt: null,
      focusDuration,
      breakDuration,
    })
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference * (1 - progress)

  const phaseColor = phase === 'focus' ? 'var(--color-accent-green)' : 'var(--color-accent-teal)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="absolute z-40"
      style={{ bottom: 60, right: 20 }} // Floating position above toolbar
    >
      <div
        className="glass rounded-2xl p-6 flex flex-col items-center gap-6 relative"
        style={{ width: 280, boxShadow: 'var(--shadow-elevated)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <X size={15} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2">
          <Timer size={16} style={{ color: phaseColor }} />
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Pomodoro
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-mono capitalize"
            style={{
              background: `${phaseColor}22`,
              color: phaseColor,
              fontFamily: 'DM Mono, monospace',
              border: `1px solid ${phaseColor}44`,
            }}>
            {phase}
          </span>
        </div>

        {/* Circular progress */}
        <div className="relative" style={{ width: 128, height: 128 }}>
          <svg width="128" height="128" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <circle
              cx="64" cy="64" r="54" fill="none"
              stroke={phaseColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-3xl font-mono"
              style={{ fontFamily: 'DM Mono, monospace', color: 'var(--color-text-primary)' }}
            >
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {sessionsCompleted} done
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5"
            style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
          >
            <RotateCcw size={15} />
          </button>
          <button
            onClick={handleStartPause}
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-semibold transition-all hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${phaseColor}, ${phase === 'focus' ? '#4ECDC4' : '#5DCAA5'})`,
              boxShadow: `0 0 20px ${phaseColor}44`,
            }}
          >
            {isRunning ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: 2 }} />}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5"
            style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
          >
            <Settings size={15} />
          </button>
        </div>

        {/* Settings expandable */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full overflow-hidden"
            >
              <div className="flex gap-4 pt-2 border-t mt-4" style={{ borderColor: 'var(--color-border)' }}>
                <DurationSetting
                  label="Focus"
                  value={focusDuration}
                  onChange={(v) => { 
                    setDurations(v, breakDuration); 
                    if (phase === 'focus') setTimeLeft(v * 60) 
                  }}
                />
                <DurationSetting
                  label="Break"
                  value={breakDuration}
                  onChange={(v) => { 
                    setDurations(focusDuration, v); 
                    if (phase === 'break') setTimeLeft(v * 60) 
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function DurationSetting({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex-1 flex flex-col gap-1">
      <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label} (min)</label>
      <input
        type="number"
        min={1}
        max={60}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 1)}
        className="w-full px-2 py-1.5 rounded-lg text-sm text-center selectable"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)',
          fontFamily: 'DM Mono, monospace',
        }}
      />
    </div>
  )
}
