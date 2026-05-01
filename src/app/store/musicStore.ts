import { create } from 'zustand'

export interface MusicTrack {
  id: number
  title: string
  artist: string
  url: string        // actual streamable URL
  duration: number   // seconds (0 = live stream)
  genre: 'lofi' | 'ambient' | 'classical' | 'jazz' | 'electronic'
}

// Free, CORS-enabled lofi / ambient study radio streams from SomeFM
export const BUNDLED_TRACKS: MusicTrack[] = [
  {
    id: 0, title: 'Groove Salad', artist: 'SomaFM',
    url: 'https://ice6.somafm.com/groovesalad-256-mp3',
    duration: 0, genre: 'ambient',
  },
  {
    id: 1, title: 'Drone Zone', artist: 'SomaFM',
    url: 'https://ice6.somafm.com/dronezone-256-mp3',
    duration: 0, genre: 'ambient',
  },
  {
    id: 2, title: 'Deep Space One', artist: 'SomaFM',
    url: 'https://ice6.somafm.com/deepspaceone-128-mp3',
    duration: 0, genre: 'electronic',
  },
  {
    id: 3, title: 'Lush', artist: 'SomaFM',
    url: 'https://ice6.somafm.com/lush-128-mp3',
    duration: 0, genre: 'ambient',
  },
  {
    id: 4, title: 'Secret Agent', artist: 'SomaFM',
    url: 'https://ice6.somafm.com/secretagent-128-mp3',
    duration: 0, genre: 'jazz',
  },
  {
    id: 5, title: 'Illinois Street Lounge', artist: 'SomaFM',
    url: 'https://ice6.somafm.com/illstreet-128-mp3',
    duration: 0, genre: 'lofi',
  },
  {
    id: 6, title: 'Suburbs of Goa', artist: 'SomaFM',
    url: 'https://ice6.somafm.com/suburbsofgoa-128-mp3',
    duration: 0, genre: 'ambient',
  },
  {
    id: 7, title: 'Cliqhop Idm', artist: 'SomaFM',
    url: 'https://ice6.somafm.com/cliqhop-128-mp3',
    duration: 0, genre: 'electronic',
  },
]

interface MusicState {
  isPlaying: boolean
  currentTrackIndex: number
  currentTime: number
  volume: number
  isMuted: boolean

  // Actions
  setIsPlaying: (playing: boolean) => void
  setCurrentTrackIndex: (index: number) => void
  setCurrentTime: (time: number) => void
  setVolume: (volume: number) => void
  setIsMuted: (muted: boolean) => void
  nextTrack: () => void
  prevTrack: () => void
  getCurrentTrack: () => MusicTrack
}

export const useMusicStore = create<MusicState>((set, get) => ({
  isPlaying: false,
  currentTrackIndex: 0,
  currentTime: 0,
  volume: 0.7,
  isMuted: false,

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTrackIndex: (index) => set({ currentTrackIndex: index, currentTime: 0 }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setVolume: (volume) => set({ volume }),
  setIsMuted: (muted) => set({ isMuted: muted }),

  nextTrack: () =>
    set((state) => ({
      currentTrackIndex: (state.currentTrackIndex + 1) % BUNDLED_TRACKS.length,
      currentTime: 0,
      isPlaying: true,
    })),

  prevTrack: () =>
    set((state) => ({
      currentTrackIndex:
        (state.currentTrackIndex - 1 + BUNDLED_TRACKS.length) % BUNDLED_TRACKS.length,
      currentTime: 0,
      isPlaying: true,
    })),

  getCurrentTrack: () => BUNDLED_TRACKS[get().currentTrackIndex],
}))
