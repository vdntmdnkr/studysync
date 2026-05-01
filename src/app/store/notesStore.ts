import { create } from 'zustand'
import type { UserId } from './sessionStore'

export interface Note {
  id: string
  userId: UserId
  content: string
  linkedPage?: number
  linkedTimestamp?: number
  tags: string[]
  createdAt: number
  updatedAt: number
}

interface NotesState {
  sharedNotes: Note[]
  privateNotes: Note[]
  activeTab: 'shared' | 'private'
  isTyping: boolean
  remoteIsTyping: boolean

  // Actions
  addSharedNote: (note: Note) => void
  updateSharedNote: (id: string, update: Partial<Note>) => void
  removeSharedNote: (id: string) => void
  setSharedNotes: (notes: Note[]) => void
  addPrivateNote: (note: Note) => void
  updatePrivateNote: (id: string, update: Partial<Note>) => void
  removePrivateNote: (id: string) => void
  setActiveTab: (tab: 'shared' | 'private') => void
  setIsTyping: (typing: boolean) => void
  setRemoteIsTyping: (typing: boolean) => void
}

export const useNotesStore = create<NotesState>((set) => ({
  sharedNotes: [],
  privateNotes: [],
  activeTab: 'shared',
  isTyping: false,
  remoteIsTyping: false,

  addSharedNote: (note) =>
    set((state) => ({
      sharedNotes: [...state.sharedNotes, note].sort((a, b) => a.createdAt - b.createdAt),
    })),

  updateSharedNote: (id, update) =>
    set((state) => ({
      sharedNotes: state.sharedNotes.map((n) =>
        n.id === id ? { ...n, ...update, updatedAt: Date.now() } : n
      ),
    })),

  removeSharedNote: (id) =>
    set((state) => ({
      sharedNotes: state.sharedNotes.filter((n) => n.id !== id),
    })),

  setSharedNotes: (notes) => set({ sharedNotes: notes }),

  addPrivateNote: (note) =>
    set((state) => ({
      privateNotes: [...state.privateNotes, note],
    })),

  updatePrivateNote: (id, update) =>
    set((state) => ({
      privateNotes: state.privateNotes.map((n) =>
        n.id === id ? { ...n, ...update, updatedAt: Date.now() } : n
      ),
    })),

  removePrivateNote: (id) =>
    set((state) => ({
      privateNotes: state.privateNotes.filter((n) => n.id !== id),
    })),

  setActiveTab: (tab) => set({ activeTab: tab }),
  setIsTyping: (typing) => set({ isTyping: typing }),
  setRemoteIsTyping: (typing) => set({ remoteIsTyping: typing }),
}))
