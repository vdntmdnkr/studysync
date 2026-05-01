import { create } from 'zustand'

export interface MusicTrack {
  id: number
  title: string
  artist: string
  filename: string
  duration: number   // seconds
  bpm: 'slow' | 'medium' | 'fast'
  genre: 'lofi' | 'ambient' | 'classical' | 'jazz'
}

export const BUNDLED_TRACKS: MusicTrack[] = [
  { id: 0, title: 'Midnight Study', artist: 'Lo-Fi Dreams', filename: 'midnight_study.mp3', duration: 187, bpm: 'slow', genre: 'lofi' },
  { id: 1, title: 'Rain on Glass', artist: 'Ambient Collective', filename: 'rain_on_glass.mp3', duration: 214, bpm: 'slow', genre: 'ambient' },
  { id: 2, title: 'Coffee & Code', artist: 'Chill Beats Studio', filename: 'coffee_code.mp3', duration: 203, bpm: 'medium', genre: 'lofi' },
  { id: 3, title: 'Autumn Leaves', artist: 'Jazz Trio', filename: 'autumn_leaves.mp3', duration: 256, bpm: 'medium', genre: 'jazz' },
  { id: 4, title: 'Deep Focus', artist: 'Study Waves', filename: 'deep_focus.mp3', duration: 298, bpm: 'slow', genre: 'ambient' },
  { id: 5, title: 'Morning Pages', artist: 'Lo-Fi Dreams', filename: 'morning_pages.mp3', duration: 178, bpm: 'slow', genre: 'lofi' },
  { id: 6, title: 'Zen Garden', artist: 'Ambient Collective', filename: 'zen_garden.mp3', duration: 312, bpm: 'slow', genre: 'classical' },
  { id: 7, title: 'Starlight Session', artist: 'Chill Beats Studio', filename: 'starlight_session.mp3', duration: 234, bpm: 'medium', genre: 'lofi' },
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
