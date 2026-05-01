import { BookOpen, Copy, Check, LogOut, Timer } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import type { ConnectionState } from '../../app/store/sessionStore'

interface TopBarProps {
  roomCode: string
  connectionState: ConnectionState
  onEndSession: () => void
  onTimerClick: () => void
}

const CONNECTION_LABELS: Record<ConnectionState, string> = {
  idle: 'Idle', connecting: 'Connecting...', waiting: 'Waiting for partner...',
  connected: 'Live', reconnecting: 'Reconnecting...', disconnected: 'Disconnected',
}
const CONNECTION_COLORS: Record<ConnectionState, string> = {
  idle: '#a0a0b8', connecting: '#5DCAA5', waiting: '#f0a04b',
  connected: '#5DCAA5', reconnecting: '#FF6B6B', disconnected: '#FF6B6B',
}

export default function TopBar({ roomCode, connectionState, onEndSession, onTimerClick }: TopBarProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const statusColor = CONNECTION_COLORS[connectionState]

  return (
    <div className="flex items-center justify-between px-5 flex-shrink-0"
      style={{ height: 48, borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-mid)' }}>

      {/* Left */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <BookOpen size={16} style={{ color: 'var(--color-accent-green)' }} />
          <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 15, color: 'var(--color-text-primary)' }}>
            StudySync
          </span>
        </div>
        <div className="h-4 w-px" style={{ background: 'var(--color-border)' }} />
        <button onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-white/5 transition-all"
          title="Click to copy room code">
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: 'var(--color-text-secondary)', letterSpacing: '0.15em' }}>
            {roomCode}
          </span>
          {copied
            ? <Check size={11} style={{ color: 'var(--color-accent-green)' }} />
            : <Copy size={11} style={{ color: 'var(--color-text-muted)' }} />}
        </button>
      </div>

      {/* Center — status */}
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor }}
        />
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: statusColor }}>
          {CONNECTION_LABELS[connectionState]}
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <button onClick={onTimerClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-white/5 transition-all"
          style={{ color: 'var(--color-text-secondary)' }}>
          <Timer size={14} /> Timer
        </button>
        <button onClick={onEndSession}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-500/10 transition-all"
          style={{ color: 'var(--color-accent-red)' }}>
          <LogOut size={14} /> End Session
        </button>
      </div>
    </div>
  )
}
