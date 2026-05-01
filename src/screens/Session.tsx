import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSessionStore } from '../app/store/sessionStore'
import { useAnnotationStore } from '../app/store/annotationStore'
import { useNotesStore } from '../app/store/notesStore'
import { useMusicStore } from '../app/store/musicStore'
import { useChatStore } from '../app/store/chatStore'
import { useCursorStore } from '../app/store/cursorStore'
import { useTimerStore } from '../app/store/timerStore'
import type { ChatMessage } from '../app/store/chatStore'
import type { CursorPos } from '../app/store/cursorStore'
import TopBar from '../components/toolbar/TopBar'
import PDFViewer from '../components/pdf/PDFViewer'
import CoBrowser from '../components/browser/CoBrowser'
import CameraFeed from '../components/camera/CameraFeed'
import MusicPanel from '../components/music/MusicPanel'
import NotesPanel from '../components/notes/NotesPanel'
import ChatPanel from '../components/chat/ChatPanel'
import Toolbar from '../components/toolbar/Toolbar'
import NetworkMonitor from '../components/network/NetworkMonitor'
import PomodoroTimer from '../components/timer/PomodoroTimer'
import { SignalClient } from '../lib/webrtc/SignalClient'
import { PeerConnection } from '../lib/webrtc/PeerConnection'
import type { Annotation } from '../app/store/annotationStore'
import type { Note } from '../app/store/notesStore'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'https://studysync-production-bc61.up.railway.app'

export default function Session() {
  const navigate = useNavigate()
  const { roomCode, userId, token, setConnectionState, setPeerConnected,
    setLocalStream, setRemoteStream, connectionState, setPdfTransferProgress, setPdf } = useSessionStore()
    
  const incomingFileChunks = useRef<ArrayBuffer[]>([])
  const incomingFileMeta = useRef<{ name: string, size: number, mime: string } | null>(null)
  const incomingBytesReceived = useRef(0)

  const [leftPanelTab, setLeftPanelTab] = useState<'pdf' | 'browser'>('pdf')
  const [rightPanelWidth, setRightPanelWidth] = useState(320)
  const [isDragging, setIsDragging] = useState(false)
  const [showTimerModal, setShowTimerModal] = useState(false)
  const [activeRightPanel, setActiveRightPanel] = useState<'camera' | 'chat'>('camera')
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

      // 1. Get local media stream first
      let stream: MediaStream | null = null
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (!mounted) return
        setLocalStream(stream)
      } catch (err) {
        console.warn('[Session] Media access denied:', err)
      }

      // 2. Set up signal client
      const signalClient = new SignalClient(SERVER_URL)
      signalClientRef.current = signalClient

      // 3. Set up peer connection with full data channel handler
      const peerConn = new PeerConnection(userId, signalClient, {
        onRemoteStream: (remoteStream) => {
          if (mounted) setRemoteStream(remoteStream)
        },
        onConnectionStateChange: (state) => {
          if (!mounted) return
          if (state === 'connected') {
            setConnectionState('connected')
            setPeerConnected(true)
          } else if (state === 'disconnected' || state === 'failed') {
            setConnectionState('reconnecting')
            setPeerConnected(false)
          }
        },
        onDataChannelMessage: (channel, data) => {
          if (!mounted) return
          handleIncomingDataChannel(channel, data)
        },
      })

      peerConnectionRef.current = peerConn

      // 4. CRITICAL: add local stream to peer connection BEFORE connecting
      if (stream) {
        peerConn.addLocalStream(stream)
      }

      signalClient.onPeerJoined(() => {
        setPeerConnected(true)
      })

      signalClient.onPeerLeft(() => {
        setPeerConnected(false)
        setConnectionState('disconnected')
        alert('Your study partner has left the session.')
      })

      // 5. Connect to signalling server
      signalClient.connect(roomCode, token)
      setConnectionState('waiting')
    }

    init()

    // Timer Background Ticker
    const timerInterval = setInterval(() => {
      const { isRunning, endsAt, completePhase, setTimeLeft } = useTimerStore.getState()
      if (isRunning && endsAt) {
        const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
        setTimeLeft(remaining)
        if (remaining === 0) completePhase()
      }
    }, 500)

    return () => {
      mounted = false
      signalClientRef.current?.disconnect()
      peerConnectionRef.current?.close()
    }
  }, [])

  // ── Data channel incoming handler ─────────────────────────────────────────
  const handleIncomingDataChannel = (channel: string, data: unknown) => {
    const msg = data as Record<string, unknown>

    if (channel === 'annotations') {
      useAnnotationStore.getState().addAnnotation(data as Annotation)

    } else if (channel === 'notes') {
      const { addSharedNote, removeSharedNote } = useNotesStore.getState()
      if (msg.action === 'add' && msg.note) addSharedNote(msg.note as Note)
      else if (msg.action === 'delete' && msg.id) removeSharedNote(msg.id as string)

    } else if (channel === 'cursors') {
      useCursorStore.getState().setRemoteCursor({ ...(msg as unknown as CursorPos), lastSeen: Date.now() })

    } else if (channel === 'file-meta') {
      const meta = msg as any
      if (meta.type === 'start') {
        incomingFileChunks.current = []
        incomingFileMeta.current = { name: meta.name, size: meta.size, mime: meta.mime }
        incomingBytesReceived.current = 0
        setPdfTransferProgress(0)
      }

    } else if (channel === 'file-transfer') {
      // Could be binary data or the 'done' JSON message
      if (data && typeof data === 'object' && 'type' in data && (data as any).type === 'done') {
        const blob = new Blob(incomingFileChunks.current, { type: incomingFileMeta.current?.mime || 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setPdf(url, 0)
        setPdfTransferProgress(null)
        incomingFileChunks.current = []
        incomingFileMeta.current = null
        incomingBytesReceived.current = 0
        return
      }

      // It's binary data (ArrayBuffer)
      incomingFileChunks.current.push(data as ArrayBuffer)
      incomingBytesReceived.current += (data as ArrayBuffer).byteLength
      if (incomingFileMeta.current && incomingFileMeta.current.size > 0) {
        setPdfTransferProgress(Math.min(100, Math.round((incomingBytesReceived.current / incomingFileMeta.current.size) * 100)))
      }

    } else if (channel === 'chat') {
      useChatStore.getState().addMessage(msg as unknown as ChatMessage)

    } else if (channel === 'video-sync') {
      const parsed = msg as any
      if (parsed.action === 'navigate' && parsed.url) {
        useSessionStore.getState().setCoBrowserUrl(parsed.url)
        setLeftPanelTab('browser')
      }

    } else if (channel === 'timer-sync') {
      useTimerStore.getState().syncTimer(msg as any)

    } else if (channel === 'music-sync') {
      const store = useMusicStore.getState()
      if (msg.action === 'play') store.setIsPlaying(true)
      else if (msg.action === 'pause') store.setIsPlaying(false)
      else if (msg.action === 'channel' && typeof msg.channelIndex === 'number')
        store.setCurrentTrackIndex(msg.channelIndex)

    } else if (channel === 'timer-sync') {
      // handled in PomodoroTimer
    }
  }

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
        {/* Left: Main Content Panel */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {/* Main Tabs */}
          <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-mid)' }}>
            <button onClick={() => setLeftPanelTab('pdf')}
              className="flex-1 py-2 text-sm font-medium transition-all flex items-center justify-center gap-2"
              style={{
                color: leftPanelTab === 'pdf' ? 'var(--color-accent-teal)' : 'var(--color-text-muted)',
                borderBottom: leftPanelTab === 'pdf' ? '2px solid var(--color-accent-teal)' : '2px solid transparent',
                background: leftPanelTab === 'pdf' ? 'rgba(78,205,196,0.05)' : 'transparent',
              }}>
              📄 PDF Viewer
            </button>
            <button onClick={() => setLeftPanelTab('browser')}
              className="flex-1 py-2 text-sm font-medium transition-all flex items-center justify-center gap-2"
              style={{
                color: leftPanelTab === 'browser' ? 'var(--color-accent-teal)' : 'var(--color-text-muted)',
                borderBottom: leftPanelTab === 'browser' ? '2px solid var(--color-accent-teal)' : '2px solid transparent',
                background: leftPanelTab === 'browser' ? 'rgba(78,205,196,0.05)' : 'transparent',
              }}>
              🌐 Co-Browser
            </button>
          </div>

          <div className="flex-1 overflow-hidden relative">
            {leftPanelTab === 'pdf' ? (
              <PDFViewer peerConnectionRef={peerConnectionRef} />
            ) : (
              <CoBrowser peerConnectionRef={peerConnectionRef} />
            )}
          </div>
        </div>

        {/* Resize handle */}
        <div className="resize-handle flex-shrink-0 cursor-col-resize" onMouseDown={handleResizeDrag}
          style={{ width: 4, background: isDragging ? 'var(--color-border-hover)' : undefined }} />

        {/* Right panel */}
        <motion.div className="flex flex-col overflow-hidden flex-shrink-0"
          style={{ width: rightPanelWidth, borderLeft: '1px solid var(--color-border)', background: 'var(--color-bg-mid)' }}>
          
          {/* Panel tab switcher */}
          <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
            {(['camera', 'chat'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveRightPanel(tab)}
                className="flex-1 py-1.5 text-xs font-medium capitalize transition-all"
                style={{
                  color: activeRightPanel === tab ? 'var(--color-accent-teal)' : 'var(--color-text-muted)',
                  borderBottom: activeRightPanel === tab ? '2px solid var(--color-accent-teal)' : '2px solid transparent',
                  background: activeRightPanel === tab ? 'rgba(78,205,196,0.05)' : 'transparent',
                }}>
                {tab === 'camera' ? '📹 Video' : '💬 Chat'}
              </button>
            ))}
          </div>

          {activeRightPanel === 'camera' ? (
            <>
              <CameraFeed />
              <div style={{ height: 1, background: 'var(--color-border)' }} />
              <MusicPanel peerConnectionRef={peerConnectionRef} />
              <div style={{ height: 1, background: 'var(--color-border)' }} />
              <div className="flex-1 overflow-hidden">
                <NotesPanel peerConnectionRef={peerConnectionRef} />
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-hidden">
              <ChatPanel peerConnectionRef={peerConnectionRef} />
            </div>
          )}
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
