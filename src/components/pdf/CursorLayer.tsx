import { useEffect, useRef, useState } from 'react'
import { useSessionStore } from '../../app/store/sessionStore'

interface CursorPos {
  x: number // 0–1 normalised
  y: number // 0–1 normalised
  pageNumber: number
  userId: 'A' | 'B'
  lastSeen: number
}

interface CursorLayerProps {
  canvasRef: React.RefObject<HTMLCanvasElement>
}

export default function CursorLayer({ canvasRef }: CursorLayerProps) {
  const { userId } = useSessionStore()
  const [remoteCursor, setRemoteCursor] = useState<CursorPos | null>(null)
  const fadeTimerRef = useRef<number | null>(null)

  // Fade out cursor after 2 seconds of inactivity
  useEffect(() => {
    if (!remoteCursor) return
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    fadeTimerRef.current = window.setTimeout(() => {
      setRemoteCursor(null)
    }, 2000)
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [remoteCursor])

  const canvas = canvasRef.current
  if (!canvas || !remoteCursor) return null

  const cw = canvas.width
  const ch = canvas.height
  const px = remoteCursor.x * cw
  const py = remoteCursor.y * ch
  const remoteId = remoteCursor.userId
  const color = remoteId === 'A' ? '#FF6B6B' : '#4ECDC4'
  const label = remoteId === 'A' ? 'Peer A' : 'Peer B'

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <g transform={`translate(${px}, ${py})`}>
        {/* SVG cursor arrow */}
        <path
          d="M0 0 L0 16 L4 12 L7 18 L9 17 L6 11 L12 11 Z"
          fill={color}
          stroke="rgba(0,0,0,0.4)"
          strokeWidth={0.5}
        />
        {/* Name badge */}
        <g transform="translate(14, 4)">
          <rect rx={4} ry={4} width={50} height={18} fill={color} opacity={0.9} />
          <text
            x={25}
            y={13}
            textAnchor="middle"
            fill="white"
            fontSize={10}
            fontFamily="DM Mono, monospace"
            fontWeight="500"
          >
            {label}
          </text>
        </g>
      </g>
    </svg>
  )
}
