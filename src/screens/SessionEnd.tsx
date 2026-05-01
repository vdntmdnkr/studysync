import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, Clock, FileDown, Repeat, Home } from 'lucide-react'
import { useSessionStore } from '../app/store/sessionStore'

export default function SessionEnd() {
  const navigate = useNavigate()
  const { clearRoom } = useSessionStore()
  const [sessionDuration] = useState(() => {
    // Read from localStorage if available
    const start = localStorage.getItem('session_start')
    if (start) {
      return Math.floor((Date.now() - parseInt(start)) / 1000)
    }
    return 0
  })

  useEffect(() => {
    localStorage.removeItem('session_start')
  }, [])

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  const handleGoHome = () => {
    clearRoom()
    navigate('/')
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center gradient-bg">
      {/* Titlebar drag */}
      <div className="absolute top-0 left-0 right-0 h-12 titlebar-drag" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center max-w-md w-full px-6"
      >
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: 'linear-gradient(135deg, #5DCAA5, #4ECDC4)', boxShadow: 'var(--shadow-glow-green)' }}>
          <BookOpen size={28} color="white" />
        </div>

        <h1 className="text-3xl mb-2 text-center" style={{ fontFamily: 'DM Serif Display, serif' }}>
          Session Complete
        </h1>
        <p className="text-sm mb-10 text-center" style={{ color: 'var(--color-text-secondary)' }}>
          Great work! Here's your session summary.
        </p>

        {/* Stats Card */}
        <div className="w-full glass rounded-2xl p-6 mb-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Session Stats
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <StatItem
              icon={<Clock size={16} />}
              label="Duration"
              value={sessionDuration > 0 ? formatDuration(sessionDuration) : '—'}
            />
            <StatItem
              icon={<BookOpen size={16} />}
              label="Pages Covered"
              value="—"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-3">
          <button
            className="w-full py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 font-semibold text-sm text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #5DCAA5, #4ECDC4)', boxShadow: 'var(--shadow-glow-green)' }}
          >
            <FileDown size={16} />
            Export Annotated PDF
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/session')}
              className="flex-1 py-3 px-5 rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition-all hover:scale-[1.02]"
              style={{
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              <Repeat size={15} />
              Back to Session
            </button>
            <button
              onClick={handleGoHome}
              className="flex-1 py-3 px-5 rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition-all hover:scale-[1.02]"
              style={{
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <Home size={15} />
              Home
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-xl font-semibold font-mono" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </span>
    </div>
  )
}
