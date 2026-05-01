import { Pen, Highlighter, StickyNote, Type, MousePointer, Eraser, Timer, Video } from 'lucide-react'
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

export default function Toolbar({ peerConnectionRef: _peerConnectionRef, onTimerClick }: ToolbarProps) {
  const { activeTool, setActiveTool, strokeWidth, setStrokeWidth } = useAnnotationStore()

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
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium transition-all hover:bg-white/5"
          style={{ color: 'var(--color-text-secondary)' }}
          data-tooltip="Shared Video"
        >
          <Video size={14} />
          Video
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
