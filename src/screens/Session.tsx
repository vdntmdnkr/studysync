import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSessionStore } from '../app/store/sessionStore'
import TopBar from '../components/toolbar/TopBar'
import PDFViewer from '../components/pdf/PDFViewer'
import CameraFeed from '../components/camera/CameraFeed'
import MusicPanel from '../components/music/MusicPanel'
import NotesPanel from '../components/notes/NotesPanel'
import Toolbar from '../components/toolbar/Toolbar'
import NetworkMonitor from '../components/network/NetworkMonitor'
import PomodoroTimer from '../components/timer/PomodoroTimer'
import { SignalClient } from '../lib/webrtc/SignalClient'
import { PeerConnection } from '../lib/webrtc/PeerConnection'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'https://studysync-production-bc61.up.railway.app'

export default function Session() {
  const navigate = useNavigate()
  const { roomCode, userId, token, setConnectionState, setPeerConnected,
    setLocalStream, setRemoteStream, connectionState } = useSessionStore()

  const [rightPanelWidth, setRightPanelWidth] = useState(320)
  const [isDragging, setIsDragging] = useState(false)
  const [showTimerModal, setShowTimerModal] = useState(false)
  const signalClientRef = useRef<SignalClient | null>(null)
  const peerConnectionRef = useRef<PeerConnection | null>(null)

  useEffect(() => {
    if (!roomCode || !userId || !token) {
      navigate('/')
      return
    }

    let mounted = true

    const init = async () => {
      setConnectionState('connecting')

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (!mounted) return
        setLocalStream(stream)
      } catch (err) {
        console.warn('Media access denied:', err)
      }

      const signalClient = new SignalClient(SERVER_URL)
      signalClientRef.current = signalClient

      const peerConn = new PeerConnection(userId, signalClient, {
        onRemoteStream: (stream) => { if (mounted) setRemoteStream(stream) },
        onConnectionStateChange: (state) => {
          if (!mounted) return
          if (state === 'connected') { setConnectionState('connected'); setPeerConnected(true) }
          else if (state === 'disconnected' || state === 'failed') { setConnectionState('reconnecting'); setPeerConnected(false) }
        },
      })
      peerConnectionRef.current = peerConn
      signalClient.connect(roomCode, token)
      setConnectionState('waiting')
    }

    init()
    return () => {
      mounted = false
      signalClientRef.current?.disconnect()
      peerConnectionRef.current?.close()
    }
  }, [])

  const handleResizeDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    const startX = e.clientX
    const startWidth = rightPanelWidth
    const onMove = (ev: MouseEvent) => setRightPanelWidth(Math.max(260, Math.min(480, startWidth + (startX - ev.clientX))))
    const onUp = () => { setIsDragging(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  if (!roomCode) return null

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-deep)' }}>
      <TopBar
        roomCode={roomCode}
        connectionState={connectionState}
        onEndSession={() => navigate('/session-end')}
        onTimerClick={() => setShowTimerModal(!showTimerModal)}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden relative">
          <PDFViewer peerConnectionRef={peerConnectionRef} />
        </div>

        <div className="resize-handle flex-shrink-0 cursor-col-resize" onMouseDown={handleResizeDrag}
          style={{ width: 4, background: isDragging ? 'var(--color-border-hover)' : undefined }} />

        <motion.div className="flex flex-col overflow-hidden flex-shrink-0"
          style={{ width: rightPanelWidth, borderLeft: '1px solid var(--color-border)', background: 'var(--color-bg-mid)' }}>
          <CameraFeed />
          <div style={{ height: 1, background: 'var(--color-border)' }} />
          <MusicPanel peerConnectionRef={peerConnectionRef} />
          <div style={{ height: 1, background: 'var(--color-border)' }} />
          <div className="flex-1 overflow-hidden">
            <NotesPanel peerConnectionRef={peerConnectionRef} />
          </div>
        </motion.div>
      </div>

      <Toolbar peerConnectionRef={peerConnectionRef} onTimerClick={() => setShowTimerModal(!showTimerModal)} />

      {showTimerModal && (
        <PomodoroTimer peerConnectionRef={peerConnectionRef} onClose={() => setShowTimerModal(false)} />
      )}

      <NetworkMonitor peerConnectionRef={peerConnectionRef} />
    </div>
  )
}
