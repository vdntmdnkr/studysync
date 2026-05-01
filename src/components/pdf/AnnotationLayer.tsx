import { useRef, useEffect, useCallback } from 'react'
import { useAnnotationStore } from '../../app/store/annotationStore'
import { useSessionStore } from '../../app/store/sessionStore'
import type { PenData, HighlightData } from '../../app/store/annotationStore'
import type { RefObject } from 'react'
import type { PeerConnection } from '../../lib/webrtc/PeerConnection'

interface AnnotationLayerProps {
  canvasRef: React.RefObject<HTMLCanvasElement>
  pageNumber: number
  peerConnectionRef: RefObject<PeerConnection | null>
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function AnnotationLayer({ canvasRef, pageNumber, peerConnectionRef }: AnnotationLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const isMouseDown = useRef(false)
  const currentPoints = useRef<Array<{ x: number; y: number }>>([])
  const startPos = useRef<{ x: number; y: number } | null>(null)
  const tempPathRef = useRef<SVGPathElement | null>(null)
  const tempRectRef = useRef<SVGRectElement | null>(null)

  const { activeTool, strokeWidth, annotations, addAnnotation, setIsDrawing, getAnnotationsForPage } = useAnnotationStore()
  const { userId } = useSessionStore()

  const peerColor = userId === 'A' ? '#FF6B6B' : '#4ECDC4'

  // Sync SVG size to PDF canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const svg = svgRef.current
    if (!canvas || !svg) return

    const obs = new ResizeObserver(() => {
      svg.setAttribute('width', String(canvas.width))
      svg.setAttribute('height', String(canvas.height))
      svg.style.width = canvas.style.width || `${canvas.width}px`
      svg.style.height = canvas.style.height || `${canvas.height}px`
    })
    obs.observe(canvas)
    return () => obs.disconnect()
  }, [canvasRef])

  const getRelativePos = (e: React.MouseEvent<SVGSVGElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    }
  }

  const getPixelPos = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return { px: 0, py: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      px: e.clientX - rect.left,
      py: e.clientY - rect.top,
    }
  }

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === 'cursor') return
    isMouseDown.current = true
    setIsDrawing(true)

    const { px, py } = getPixelPos(e)
    startPos.current = { x: px, y: py }
    currentPoints.current = [{ x: px, y: py }]

    if (activeTool === 'pen') {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('stroke', peerColor)
      path.setAttribute('stroke-width', String(strokeWidth))
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke-linecap', 'round')
      path.setAttribute('stroke-linejoin', 'round')
      path.setAttribute('opacity', '0.85')
      svgRef.current?.appendChild(path)
      tempPathRef.current = path
    } else if (activeTool === 'highlight') {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('fill', peerColor)
      rect.setAttribute('opacity', '0.25')
      rect.setAttribute('x', String(px))
      rect.setAttribute('y', String(py))
      svgRef.current?.appendChild(rect)
      tempRectRef.current = rect
    }
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isMouseDown.current) return
    const { px, py } = getPixelPos(e)

    if (activeTool === 'pen' && tempPathRef.current) {
      currentPoints.current.push({ x: px, y: py })
      const d = currentPoints.current
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
        .join(' ')
      tempPathRef.current.setAttribute('d', d)
    } else if (activeTool === 'highlight' && startPos.current && tempRectRef.current) {
      const x = Math.min(startPos.current.x, px)
      const y = Math.min(startPos.current.y, py)
      const w = Math.abs(px - startPos.current.x)
      const h = Math.abs(py - startPos.current.y)
      tempRectRef.current.setAttribute('x', String(x))
      tempRectRef.current.setAttribute('y', String(y))
      tempRectRef.current.setAttribute('width', String(w))
      tempRectRef.current.setAttribute('height', String(h))
    }
  }

  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isMouseDown.current) return
    isMouseDown.current = false
    setIsDrawing(false)

    const canvas = canvasRef.current
    if (!canvas) return
    const w = canvas.width
    const h = canvas.height

    if (activeTool === 'pen' && currentPoints.current.length > 1) {
      // Remove temp element
      tempPathRef.current?.remove()
      tempPathRef.current = null

      const annotation = {
        id: generateId(),
        type: 'pen' as const,
        userId: userId!,
        pageNumber,
        createdAt: Date.now(),
        data: {
          points: currentPoints.current.map(p => ({ x: p.x / w, y: p.y / h })),
          color: peerColor,
          strokeWidth,
        } as PenData,
      }
      addAnnotation(annotation)
      peerConnectionRef.current?.sendOnChannel('annotations', annotation)
    } else if (activeTool === 'highlight' && startPos.current) {
      tempRectRef.current?.remove()
      tempRectRef.current = null

      const { px, py } = getPixelPos(e)
      const rx = Math.min(startPos.current.x, px) / w
      const ry = Math.min(startPos.current.y, py) / h
      const rw = Math.abs(px - startPos.current.x) / w
      const rh = Math.abs(py - startPos.current.y) / h

      if (rw > 0.01 && rh > 0.005) {
        const ann = {
          id: generateId(),
          type: 'highlight' as const,
          userId: userId!,
          pageNumber,
          createdAt: Date.now(),
          data: { x: rx, y: ry, width: rw, height: rh, color: peerColor } as HighlightData,
        }
        addAnnotation(ann)
        peerConnectionRef.current?.sendOnChannel('annotations', ann)
      }
    }

    currentPoints.current = []
    startPos.current = null
  }

  // Render stored annotations
  const pageAnnotations = getAnnotationsForPage(pageNumber)
  const canvas = canvasRef.current
  const cw = canvas?.width || 1
  const ch = canvas?.height || 1

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        cursor: activeTool === 'cursor' ? 'default'
          : activeTool === 'pen' ? 'crosshair'
          : 'crosshair',
        pointerEvents: activeTool === 'cursor' ? 'none' : 'all',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {pageAnnotations.map((ann) => {
        if (ann.type === 'pen') {
          const d = ann.data as PenData
          const pathD = d.points.map((p, i) =>
            `${i === 0 ? 'M' : 'L'} ${p.x * cw} ${p.y * ch}`
          ).join(' ')
          return (
            <path
              key={ann.id}
              d={pathD}
              stroke={d.color}
              strokeWidth={d.strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />
          )
        }
        if (ann.type === 'highlight') {
          const d = ann.data as HighlightData
          return (
            <rect
              key={ann.id}
              x={d.x * cw}
              y={d.y * ch}
              width={d.width * cw}
              height={d.height * ch}
              fill={d.color}
              opacity={0.25}
            />
          )
        }
        return null
      })}
    </svg>
  )
}
