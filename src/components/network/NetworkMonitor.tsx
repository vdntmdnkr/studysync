import { useEffect, useRef } from 'react'
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import { useNetworkStore, type NetworkQuality } from '../../app/store/networkStore'
import type { RefObject } from 'react'
import type { PeerConnection } from '../../lib/webrtc/PeerConnection'

interface NetworkMonitorProps {
  peerConnectionRef: RefObject<PeerConnection | null>
}

const QUALITY_CONFIG: Record<NetworkQuality, { label: string; color: string; icon: React.ReactNode }> = {
  excellent: { label: 'Excellent', color: 'var(--color-accent-green)', icon: <Wifi size={11} /> },
  good:      { label: 'Good',      color: '#8bc4ff',                   icon: <Wifi size={11} /> },
  weak:      { label: 'Weak',      color: '#f0a04b',                   icon: <AlertTriangle size={11} /> },
  poor:      { label: 'Poor',      color: 'var(--color-accent-red)',    icon: <AlertTriangle size={11} /> },
  offline:   { label: 'Offline',   color: 'var(--color-accent-red)',    icon: <WifiOff size={11} /> },
}

export default function NetworkMonitor({ peerConnectionRef }: NetworkMonitorProps) {
  const { quality, setStats } = useNetworkStore()
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    intervalRef.current = window.setInterval(async () => {
      const pc = peerConnectionRef.current
      if (!pc) return

      try {
        const stats = await pc.getStats()
        let rtt = 0
        let packetsLost = 0
        let availableBitrate = 0

        stats.forEach((report) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = ((report as Record<string, number>).currentRoundTripTime || 0) * 1000
          }
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            const r = report as Record<string, number>
            packetsLost = r.packetsLost
              ? (r.packetsLost / Math.max(1, r.packetsReceived + r.packetsLost)) * 100
              : 0
          }
          if (report.type === 'candidate-pair') {
            const r = report as Record<string, number>
            availableBitrate = (r.availableOutgoingBitrate || 0) / 1000
          }
        })

        setStats({ rtt, packetsLost, availableBitrate })
      } catch { /* ignore */ }
    }, 3000)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [peerConnectionRef])

  const config = QUALITY_CONFIG[quality]

  return (
    <div
      className="fixed bottom-14 right-4 network-badge"
      style={{
        background: `${config.color}14`,
        border: `1px solid ${config.color}44`,
        color: config.color,
        fontFamily: 'DM Mono, monospace',
      }}
    >
      {config.icon}
      {config.label}
    </div>
  )
}
