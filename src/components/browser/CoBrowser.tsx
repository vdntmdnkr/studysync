import { useState, useEffect } from 'react'
import { Globe, Search, PlaySquare } from 'lucide-react'
import { useSessionStore } from '../../app/store/sessionStore'
import type { PeerConnection } from '../../lib/webrtc/PeerConnection'

interface CoBrowserProps {
  peerConnectionRef: React.RefObject<PeerConnection | null>
}

// Convert normal youtube links to embed links so they can be iframed
function transformUrl(inputUrl: string): string {
  try {
    const url = new URL(inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`)
    if (url.hostname.includes('youtube.com') && url.pathname === '/watch') {
      const v = url.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`
    } else if (url.hostname.includes('youtu.be')) {
      const v = url.pathname.slice(1)
      if (v) return `https://www.youtube.com/embed/${v}`
    }
    return url.toString()
  } catch {
    return inputUrl
  }
}

export default function CoBrowser({ peerConnectionRef }: CoBrowserProps) {
  const { coBrowserUrl, setCoBrowserUrl } = useSessionStore()
  const [inputUrl, setInputUrl] = useState('')

  useEffect(() => {
    if (coBrowserUrl) setInputUrl(coBrowserUrl)
  }, [coBrowserUrl])

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputUrl) return
    
    const finalUrl = transformUrl(inputUrl)
    setCoBrowserUrl(finalUrl)
    
    // Broadcast to peer
    if (peerConnectionRef.current) {
      peerConnectionRef.current.sendOnChannel('video-sync', { action: 'navigate', url: finalUrl })
    }
  }

  return (
    <div className="h-full w-full flex flex-col" style={{ background: 'var(--color-bg-deep)' }}>
      {/* Browser Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-mid)' }}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: 'rgba(93, 202, 165, 0.1)' }}>
          <Globe size={16} style={{ color: 'var(--color-accent-green)' }} />
        </div>
        
        <form onSubmit={handleNavigate} className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--color-border)', background: 'rgba(0,0,0,0.2)' }}>
          <Search size={14} style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Enter YouTube URL or Website Link..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-white font-mono"
          />
        </form>
        
        <button onClick={handleNavigate} className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-white/5 text-white" style={{ background: 'var(--color-accent-teal)' }}>
          Go
        </button>
      </div>

      {/* Browser Viewport */}
      <div className="flex-1 relative bg-black">
        {!coBrowserUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <PlaySquare size={48} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Enter a URL to watch or browse together</p>
            <p className="text-xs max-w-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
              Note: Many websites (like Wikipedia) block being embedded. YouTube links will automatically be converted to embeds to bypass this.
            </p>
          </div>
        ) : (
          <iframe
            src={coBrowserUrl}
            className="w-full h-full border-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        )}
      </div>
    </div>
  )
}
