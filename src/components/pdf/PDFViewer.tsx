import { useEffect, useRef, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Upload, ZoomIn, ZoomOut } from 'lucide-react'
import { useSessionStore } from '../../app/store/sessionStore'
import AnnotationLayer from './AnnotationLayer'
import CursorLayer from './CursorLayer'
import type { RefObject } from 'react'
import type { PeerConnection } from '../../lib/webrtc/PeerConnection'

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168'

interface PDFViewerProps {
  peerConnectionRef: RefObject<PeerConnection | null>
}

export default function PDFViewer({ peerConnectionRef }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pdfDocRef = useRef<unknown>(null)
  const [scale, setScale] = useState(1.2)
  const [isRendering, setIsRendering] = useState(false)
  const [pdfjsReady, setPdfjsReady] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  const { currentPdfUrl, currentPage, totalPages, setPdf, setCurrentPage, pdfTransferProgress } = useSessionStore()

  // Load PDF.js from CDN once
  useEffect(() => {
    const existing = document.getElementById('pdfjs-script')
    if (existing) { setPdfjsReady(true); return }

    const script = document.createElement('script')
    script.id = 'pdfjs-script'
    script.src = `${PDFJS_CDN}/pdf.min.mjs`
    script.type = 'module'
    script.onload = () => {
      const pdfjs = (window as unknown as { pdfjsLib?: { GlobalWorkerOptions: { workerSrc: string } } }).pdfjsLib
      if (pdfjs) pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.mjs`
      setPdfjsReady(true)
    }
    document.head.appendChild(script)
  }, [])

  const renderPage = useCallback(async (doc: unknown, pageNum: number, sc: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    setIsRendering(true)
    try {
      const page = await (doc as { getPage: (n: number) => Promise<unknown> }).getPage(pageNum)
      const viewport = (page as { getViewport: (o: { scale: number }) => { width: number; height: number } }).getViewport({ scale: sc })
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!
      await (page as { render: (o: unknown) => { promise: Promise<void> } }).render({ canvasContext: ctx, viewport }).promise
    } finally {
      setIsRendering(false)
    }
  }, [])

  // Load PDF from URL
  useEffect(() => {
    if (!currentPdfUrl || !pdfjsReady) return
    const pdfjs = (window as unknown as { pdfjsLib?: { getDocument: (src: string) => { promise: Promise<unknown> } } }).pdfjsLib
    if (!pdfjs) return

    pdfjs.getDocument(currentPdfUrl).promise.then((doc: unknown) => {
      pdfDocRef.current = doc
      const numPages = (doc as { numPages: number }).numPages
      setPdf(currentPdfUrl, numPages)
      renderPage(doc, 1, scale)
    }).catch(console.error)
  }, [currentPdfUrl, pdfjsReady])

  useEffect(() => {
    if (pdfDocRef.current) renderPage(pdfDocRef.current, currentPage, scale)
  }, [currentPage, scale])

  // Open file via browser input
  const handleOpenFile = () => fileInputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPdf(url, 0)
    
    // Transfer to peer!
    if (peerConnectionRef.current) {
      try {
        setUploadProgress(0)
        await peerConnectionRef.current.sendFile(file, (pct) => {
          setUploadProgress(pct)
        })
      } catch (err) {
        console.error('File transfer failed:', err)
      } finally {
        setUploadProgress(null)
      }
    }
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-deep)' }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Controls bar */}
      {currentPdfUrl && (
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-mid)' }}>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5"
              style={{ color: 'var(--color-text-secondary)' }}>
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs" style={{ fontFamily: 'DM Mono, monospace', color: 'var(--color-text-secondary)', minWidth: 70, textAlign: 'center' }}>
              {currentPage} / {totalPages || '—'}
            </span>
            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5"
              style={{ color: 'var(--color-text-secondary)' }}>
              <ChevronRight size={15} />
            </button>
          </div>

          <button onClick={handleOpenFile}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs hover:bg-white/5"
            style={{ color: 'var(--color-text-muted)' }}>
            <Upload size={12} /> Open PDF
          </button>

          <div className="flex items-center gap-1">
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5"
              style={{ color: 'var(--color-text-secondary)' }}>
              <ZoomOut size={14} />
            </button>
            <span className="text-xs w-10 text-center" style={{ fontFamily: 'DM Mono, monospace', color: 'var(--color-text-muted)' }}>
              {Math.round(scale * 100)}%
            </span>
            <button onClick={() => setScale(s => Math.min(3, s + 0.2))}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5"
              style={{ color: 'var(--color-text-secondary)' }}>
              <ZoomIn size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Progress Bars */}
      {(uploadProgress !== null || pdfTransferProgress !== null) && (
        <div className="w-full h-1" style={{ background: 'var(--color-bg-mid)' }}>
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${uploadProgress !== null ? uploadProgress : pdfTransferProgress}%`,
              background: 'var(--color-accent-green)',
              boxShadow: 'var(--shadow-glow-green)'
            }}
          />
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-8">
        {!currentPdfUrl ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)' }}>
              <Upload size={24} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <div className="text-center">
              <p className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Open a PDF to start studying</p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Annotations sync with your partner in real time</p>
            </div>
            <button onClick={handleOpenFile}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #5DCAA5, #4ECDC4)', boxShadow: 'var(--shadow-glow-green)' }}>
              <Upload size={15} /> Open PDF
            </button>
          </div>
        ) : (
          <div
            className="relative"
            style={{ display: 'inline-block' }}
            onMouseMove={(e) => {
              if (!canvasRef.current || !peerConnectionRef.current) return
              const rect = canvasRef.current.getBoundingClientRect()
              const x = (e.clientX - rect.left) / rect.width
              const y = (e.clientY - rect.top) / rect.height
              
              // Only send if inside bounds
              if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
                const { userId } = useSessionStore.getState()
                peerConnectionRef.current.sendOnChannel('cursors', {
                  x, y, pageNumber: currentPage, userId
                })
              }
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                display: 'block',
                borderRadius: 8,
                background: 'white',
                boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                opacity: isRendering ? 0.7 : 1,
                transition: 'opacity 0.2s ease',
              }}
            />
            <AnnotationLayer canvasRef={canvasRef} pageNumber={currentPage} peerConnectionRef={peerConnectionRef} />
            <CursorLayer canvasRef={canvasRef} />
          </div>
        )}
      </div>
    </div>
  )
}
