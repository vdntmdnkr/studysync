import { Pen, Highlighter, StickyNote, Type, MousePointer, Eraser, Timer, Video, MonitorUp, MonitorOff } from 'lucide-react'
import { useSessionStore } from '../../app/store/sessionStore'
import { useAnnotationStore, type AnnotationTool } from '../../app/store/annotationStore'
import type { RefObject } from 'react'
import type { PeerConnection } from '../../lib/webrtc/PeerConnection'

interface ToolbarProps {
  peerConnectionRef: RefObject<PeerConnection | null>
  onTimerClick: () => void
}

interface ToolButton {
  id: AnnotationTool
  icon: React.ReactNode
  label: string
  color?: string
}

const TOOLS: ToolButton[] = [
  { id: 'cursor', icon: <MousePointer size={16} />, label: 'Select' },
  { id: 'pen',    icon: <Pen size={16} />,          label: 'Pen' },
  { id: 'highlight', icon: <Highlighter size={16} />, label: 'Highlight' },
  { id: 'sticky', icon: <StickyNote size={16} />,   label: 'Sticky Note' },
  { id: 'text',   icon: <Type size={16} />,         label: 'Text Box' },
]

const STROKE_WIDTHS = [1, 2, 4, 6]

export default function Toolbar({ peerConnectionRef, onTimerClick }: ToolbarProps) {
  const { activeTool, setActiveTool, strokeWidth, setStrokeWidth } = useAnnotationStore()
  const { localStream, isScreenSharing, setScreenSharing } = useSessionStore()

  const toggleScreenShare = async () => {
    if (!peerConnectionRef.current) return

    if (isScreenSharing) {
      // Stop screen sharing: revert to camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        const videoTrack = stream.getVideoTracks()[0]
        
        await peerConnectionRef.current.replaceVideoTrack(videoTrack)
        
        if (localStream) {
          const oldTrack = localStream.getVideoTracks()[0]
          if (oldTrack) {
            oldTrack.stop()
            localStream.removeTrack(oldTrack)
          }
          localStream.addTrack(videoTrack)
        }
        setScreenSharing(false)
      } catch (err) {
        console.error('Failed to revert to camera:', err)
      }
    } else {
      // Start screen sharing
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        const screenTrack = stream.getVideoTracks()[0]
        
        // Listen for user clicking 'Stop sharing' on browser UI
        screenTrack.onended = () => {
          toggleScreenShare() // revert to camera
        }

        await peerConnectionRef.current.replaceVideoTrack(screenTrack)
        
        if (localStream) {
          const oldTrack = localStream.getVideoTracks()[0]
          if (oldTrack) {
            oldTrack.stop()
            localStream.removeTrack(oldTrack)
          }
          localStream.addTrack(screenTrack)
        }
        setScreenSharing(true)
      } catch (err) {
        console.error('Failed to share screen:', err)
      }
    }
  }

  return (
    <div
      className="flex items-center px-4 gap-2 flex-shrink-0"
      style={{
        height: 48,
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-bg-mid)',
      }}
    >
      {/* Annotation tools */}
      <div className="flex items-center gap-1">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            data-tooltip={tool.label}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/5"
            style={{
              background: activeTool === tool.id ? 'rgba(93, 202, 165, 0.15)' : undefined,
              color: activeTool === tool.id ? 'var(--color-accent-green)' : 'var(--color-text-secondary)',
              border: activeTool === tool.id ? '1px solid rgba(93, 202, 165, 0.3)' : '1px solid transparent',
            }}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Stroke width (only show for pen tool) */}
      {activeTool === 'pen' && (
        <>
          <div className="h-4 w-px mx-1" style={{ background: 'var(--color-border)' }} />
          <div className="flex items-center gap-1.5">
            {STROKE_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setStrokeWidth(w)}
                className="w-7 h-7 rounded flex items-center justify-center transition-all"
                style={{
                  background: strokeWidth === w ? 'rgba(93, 202, 165, 0.15)' : undefined,
                  border: strokeWidth === w ? '1px solid rgba(93, 202, 165, 0.3)' : '1px solid transparent',
                }}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: w * 2 + 2,
                    height: w * 2 + 2,
                    background: strokeWidth === w ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                  }}
                />
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex-1" />

      {/* Right tools */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleScreenShare}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium transition-all hover:bg-white/5"
          style={{
            color: isScreenSharing ? 'var(--color-accent-red)' : 'var(--color-text-secondary)',
            background: isScreenSharing ? 'rgba(255, 107, 107, 0.1)' : undefined,
          }}
          data-tooltip={isScreenSharing ? "Stop Sharing" : "Share Screen"}
        >
          {isScreenSharing ? <MonitorOff size={14} /> : <MonitorUp size={14} />}
          {isScreenSharing ? "Stop Share" : "Share Screen"}
        </button>

        <div className="h-4 w-px mx-1" style={{ background: 'var(--color-border)' }} />

        <button
          onClick={onTimerClick}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium transition-all hover:bg-white/5"
          style={{ color: 'var(--color-text-secondary)' }}
          data-tooltip="Pomodoro Timer"
        >
          <Timer size={14} />
          <span className="font-mono" style={{ fontFamily: 'DM Mono, monospace' }}>25:00</span>
        </button>
      </div>
    </div>
  )
}
