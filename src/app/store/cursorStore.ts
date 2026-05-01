import { create } from 'zustand'
import type { UserId } from './sessionStore'

export interface CursorPos {
  x: number // 0–1 normalised
  y: number // 0–1 normalised
  pageNumber: number
  userId: UserId
  lastSeen: number
}

interface CursorState {
  remoteCursor: CursorPos | null
  setRemoteCursor: (cursor: CursorPos | null) => void
}

export const useCursorStore = create<CursorState>((set) => ({
  remoteCursor: null,
  setRemoteCursor: (cursor) => set({ remoteCursor: cursor }),
}))
