import { create } from 'zustand'

export type NetworkQuality = 'excellent' | 'good' | 'weak' | 'poor' | 'offline'

interface NetworkState {
  quality: NetworkQuality
  rtt: number              // ms
  packetsLost: number      // percentage
  availableBitrate: number // kbps
  videoEnabled: boolean
  cursorFps: number        // 30, 5, or 0

  setQuality: (quality: NetworkQuality) => void
  setStats: (stats: { rtt: number; packetsLost: number; availableBitrate: number }) => void
  setVideoEnabled: (enabled: boolean) => void
  setCursorFps: (fps: number) => void
}

export const useNetworkStore = create<NetworkState>((set) => ({
  quality: 'excellent',
  rtt: 0,
  packetsLost: 0,
  availableBitrate: 0,
  videoEnabled: true,
  cursorFps: 30,

  setQuality: (quality) => set({ quality }),

  setStats: ({ rtt, packetsLost, availableBitrate }) => {
    let quality: NetworkQuality = 'excellent'
    let videoEnabled = true
    let cursorFps = 30

    if (rtt > 1200 || packetsLost > 15) {
      quality = 'offline'
      videoEnabled = false
      cursorFps = 5
    } else if (rtt > 600 || packetsLost > 5) {
      quality = 'poor'
      videoEnabled = false
      cursorFps = 30
    } else if (rtt > 300) {
      quality = 'weak'
      videoEnabled = true
      cursorFps = 30
    } else if (rtt > 150) {
      quality = 'good'
    }

    set({ quality, rtt, packetsLost, availableBitrate, videoEnabled, cursorFps })
  },

  setVideoEnabled: (enabled) => set({ videoEnabled: enabled }),
  setCursorFps: (fps) => set({ cursorFps: fps }),
}))
