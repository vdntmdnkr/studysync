import { create } from 'zustand'

export type UserId = 'A' | 'B'
export type ConnectionState = 'idle' | 'connecting' | 'waiting' | 'connected' | 'reconnecting' | 'disconnected'

interface SessionState {
  // Room
  roomCode: string | null
  token: string | null
  userId: UserId | null

  // Connection
  connectionState: ConnectionState
  peerConnected: boolean

  // Media
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  isMicOn: boolean
  isCameraOn: boolean
  isScreenSharing: boolean

  // PDF
  currentPdfUrl: string | null
  currentPage: number
  totalPages: number
  pdfTransferProgress: number | null // 0-100, null if not transferring
  coBrowserUrl: string | null

  // Actions
  setRoom: (roomCode: string, token: string, userId: UserId) => void
  clearRoom: () => void
  setConnectionState: (state: ConnectionState) => void
  setPeerConnected: (connected: boolean) => void
  setLocalStream: (stream: MediaStream | null) => void
  setRemoteStream: (stream: MediaStream | null) => void
  setMicOn: (on: boolean) => void
  setCameraOn: (on: boolean) => void
  setScreenSharing: (sharing: boolean) => void
  setPdf: (url: string, totalPages: number) => void
  setCurrentPage: (page: number) => void
  setTotalPages: (total: number) => void
  setPdfTransferProgress: (progress: number | null) => void
  setCoBrowserUrl: (url: string | null) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  roomCode: null,
  token: null,
  userId: null,
  connectionState: 'idle',
  peerConnected: false,
  localStream: null,
  remoteStream: null,
  isMicOn: true,
  isCameraOn: true,
  isScreenSharing: false,
  currentPdfUrl: null,
  currentPage: 1,
  totalPages: 0,
  pdfTransferProgress: null,
  coBrowserUrl: null,

  setRoom: (roomCode, token, userId) =>
    set({ roomCode, token, userId }),

  clearRoom: () =>
    set({
      roomCode: null,
      token: null,
      userId: null,
      connectionState: 'idle',
      peerConnected: false,
      localStream: null,
      remoteStream: null,
      currentPdfUrl: null,
      currentPage: 1,
      totalPages: 0,
      pdfTransferProgress: null,
      coBrowserUrl: null,
    }),

  setConnectionState: (state) => set({ connectionState: state }),
  setPeerConnected: (connected) => set({ peerConnected: connected }),
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setMicOn: (on) => set({ isMicOn: on }),
  setCameraOn: (on) => set({ isCameraOn: on }),
  setScreenSharing: (sharing) => set({ isScreenSharing: sharing }),
  setPdf: (url, totalPages) => set({ currentPdfUrl: url, totalPages, currentPage: 1, pdfTransferProgress: null }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setTotalPages: (total) => set({ totalPages: total }),
  setPdfTransferProgress: (progress) => set({ pdfTransferProgress: progress }),
  setCoBrowserUrl: (url) => set({ coBrowserUrl: url }),
}))
