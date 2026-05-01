import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Timer, Play, Pause, RotateCcw, Settings, X } from 'lucide-react'
import type { RefObject } from 'react'
import type { PeerConnection } from '../../lib/webrtc/PeerConnection'

interface PomodoroTimerProps {
  peerConnectionRef: RefObject<PeerConnection | null>
  onClose: () => void
}

type Phase = 'focus' | 'break'

export default function PomodoroTimer({ peerConnectionRef, onClose }: PomodoroTimerProps) {
  const [phase, setPhase] = useState<Phase>('focus')
  const [isRunning, setIsRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(25 * 60) // seconds
  const [focusDuration, setFocusDuration] = useState(25)
  const [breakDuration, setBreakDuration] = useState(5)
  const [showSettings, setShowSettings] = useState(false)
  const [sessionsCompleted, setSessionsCompleted] = useState(0)
  const endsAtRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)

  const totalDuration = (phase === 'focus' ? focusDuration : breakDuration) * 60
  const progress = 1 - timeLeft / totalDuration

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        if (endsAtRef.current) {
          const remaining = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000))
          setTimeLeft(remaining)
          if (remaining === 0) {
            handlePhaseComplete()
          }
        }
      }, 500)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning])

  const handlePhaseComplete = () => {
    setIsRunning(false)
    const nextPhase: Phase = phase === 'focus' ? 'break' : 'focus'
    if (phase === 'focus') setSessionsCompleted(s => s + 1)

    setPhase(nextPhase)
    setTimeLeft((nextPhase === 'focus' ? focusDuration : breakDuration) * 60)

    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification(nextPhase === 'break' ? '☕ Break Time!' : '📚 Focus Time!', {
        body: nextPhase === 'break' ? 'Take a well-deserved break.' : 'Time to focus!',
      })
    } else {
      Notification.requestPermission()
    }
  }

  const handleStartPause = () => {
    const next = !isRunning
    if (next) {
      endsAtRef.current = Date.now() + timeLeft * 1000
    }
    setIsRunning(next)

    // Sync to peer
    peerConnectionRef.current?.sendOnChannel('timer-sync', {
      action: next ? 'start' : 'pause',
      phase,
      endsAt: endsAtRef.current,
      focusDuration,
      breakDuration,
    })
  }

  const handleReset = () => {
    setIsRunning(false)
    endsAtRef.current = null
    setTimeLeft((phase === 'focus' ? focusDuration : breakDuration) * 60)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference * (1 - progress)

  const phaseColor = phase === 'focus' ? 'var(--color-accent-green)' : 'var(--color-accent-teal)'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(13,13,26,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="glass rounded-2xl p-8 flex flex-col items-center gap-6 relative"
        style={{ width: 320, boxShadow: 'var(--shadow-elevated)' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <X size={15} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2">
          <Timer size={16} style={{ color: phaseColor }} />
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Pomodoro Timer
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
              <div className="flex gap-4 pt-2">
                <DurationSetting
                  label="Focus"
                  value={focusDuration}
                  onChange={(v) => { setFocusDuration(v); if (phase === 'focus') setTimeLeft(v * 60) }}
                />
                <DurationSetting
                  label="Break"
                  value={breakDuration}
                  onChange={(v) => { setBreakDuration(v); if (phase === 'break') setTimeLeft(v * 60) }}
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
