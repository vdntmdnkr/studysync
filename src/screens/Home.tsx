import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, ArrowRight, Loader2, BookOpen, Users, Zap, Lock } from 'lucide-react'
import { useSessionStore } from '../app/store/sessionStore'

// Change this to your server URL
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'https://studysync-production-bc61.up.railway.app'

type HomeMode = 'landing' | 'creating' | 'created' | 'joining'

export default function Home() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<HomeMode>('landing')
  const [roomCode, setRoomCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const joinInputRef = useRef<HTMLInputElement>(null)

  const { setRoom } = useSessionStore()

  const handleCreateRoom = async () => {
    setIsLoading(true)
    setError('')
    setMode('creating')
    try {
      const res = await fetch(`${SERVER_URL}/rooms`, { method: 'POST' })
      if (!res.ok) throw new Error('Server error')
      const data: { roomCode: string; token: string } = await res.json()
      setRoomCode(data.roomCode)
      setRoom(data.roomCode, data.token, 'A')
      setMode('created')
    } catch {
      setError('Could not connect to server. Make sure the signalling server is running on port 3001.')
      setMode('landing')
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 6) {
      setError('Room code must be 6 characters')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch(`${SERVER_URL}/rooms/${code}/join`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not join room')
        return
      }
      setRoom(data.roomCode, data.token, 'B')
      navigate('/session')
    } catch {
      setError('Could not connect to server. Make sure the signalling server is running on port 3001.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleJoinCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    setJoinCode(val)
    setError('')
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center gradient-bg relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, #5DCAA5, transparent 70%)' }} />
      <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full opacity-[0.06]"
        style={{ background: 'radial-gradient(circle, #4ECDC4, transparent 70%)' }} />
      <div className="absolute top-[30%] right-[-150px] w-[400px] h-[400px] rounded-full opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, #FF6B6B, transparent 70%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center w-full max-w-md px-6"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex items-center gap-3 mb-3"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #5DCAA5, #4ECDC4)' }}>
            <BookOpen size={20} color="white" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.9rem', color: '#e8e8f0' }}>
            StudySync
          </h1>
        </motion.div>

        <p className="text-sm mb-10" style={{ color: 'var(--color-text-secondary)' }}>
          Study together, anywhere
        </p>

        {/* Main Card */}
        <div className="w-full glass rounded-2xl p-8 shadow-2xl" style={{ boxShadow: 'var(--shadow-elevated)' }}>
          <AnimatePresence mode="wait">

            {/* Landing */}
            {(mode === 'landing' || mode === 'joining') && (
              <motion.div
                key="landing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4"
              >
                <button
                  onClick={handleCreateRoom}
                  disabled={isLoading}
                  className="w-full py-4 px-6 rounded-xl flex items-center justify-center gap-3 font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #5DCAA5, #4ECDC4)', boxShadow: 'var(--shadow-glow-green)' }}
                >
                  <Users size={18} />
                  Create a Room
                </button>

                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>or join with a code</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                </div>

                <div className="flex gap-2">
                  <input
                    ref={joinInputRef}
                    type="text"
                    placeholder="XXXXXX"
                    value={joinCode}
                    onChange={handleJoinCodeChange}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                    className="flex-1 px-4 py-3 rounded-xl text-sm border text-center"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                      fontFamily: 'DM Mono, monospace',
                      letterSpacing: '0.25em',
                    }}
                    maxLength={6}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    onClick={handleJoinRoom}
                    disabled={isLoading || joinCode.length === 0}
                    className="px-5 py-3 rounded-xl flex items-center gap-2 font-semibold text-sm transition-all hover:scale-[1.02]"
                    style={{
                      background: 'var(--color-bg-surface)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin-slow" /> : <ArrowRight size={16} />}
                    Join
                  </button>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-center mt-1"
                    style={{ color: 'var(--color-accent-red)' }}
                  >
                    {error}
                  </motion.p>
                )}
              </motion.div>
            )}

            {/* Creating */}
            {mode === 'creating' && (
              <motion.div
                key="creating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-4"
              >
                <Loader2 size={32} className="animate-spin-slow" style={{ color: 'var(--color-accent-green)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Creating your room...</p>
              </motion.div>
            )}

            {/* Created */}
            {mode === 'created' && (
              <motion.div
                key="created"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-6"
              >
                <div className="text-center">
                  <p className="text-xs font-medium mb-3 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    Share this code with your study partner
                  </p>
                  <div style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '2.2rem',
                    letterSpacing: '0.3em',
                    color: 'var(--color-accent-green)',
                    fontWeight: 500,
                  }}>
                    {roomCode.split('').map((char, i) => (
                      <motion.span key={i} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                        {char}
                      </motion.span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm transition-all hover:scale-[1.02]"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--color-border)',
                    color: copied ? 'var(--color-accent-green)' : 'var(--color-text-secondary)',
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>

                <div className="w-full py-3 px-4 rounded-xl flex items-center gap-3"
                  style={{ background: 'rgba(93, 202, 165, 0.06)', border: '1px solid rgba(93, 202, 165, 0.12)' }}>
                  <div className="w-2 h-2 rounded-full animate-pulse-live flex-shrink-0" style={{ background: 'var(--color-accent-green)' }} />
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Waiting for your study partner to join...
                  </p>
                </div>

                <button
                  onClick={() => navigate('/session')}
                  className="w-full py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 font-semibold text-sm text-white transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #5DCAA5, #4ECDC4)', boxShadow: 'var(--shadow-glow-green)' }}
                >
                  Enter Session <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Feature pills */}
        {mode === 'landing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-2 mt-8"
          >
            {[
              { icon: <Zap size={11} />, label: 'Real-time Sync' },
              { icon: <Lock size={11} />, label: 'Peer-to-Peer' },
              { icon: <Users size={11} />, label: 'Two-Person Focus' },
            ].map((pill) => (
              <div key={pill.label}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                {pill.icon}{pill.label}
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
