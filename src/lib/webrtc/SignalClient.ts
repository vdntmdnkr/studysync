import { io, Socket } from 'socket.io-client'

export type SignalMessage =
  | { type: 'offer';     sdp: RTCSessionDescriptionInit; from?: 'A' | 'B' }
  | { type: 'answer';    sdp: RTCSessionDescriptionInit; from?: 'A' | 'B' }
  | { type: 'ice';       candidate: RTCIceCandidateInit; from?: 'A' | 'B' }
  | { type: 'peer-joined'; userId?: 'A' | 'B' }
  | { type: 'peer-left';   userId?: 'A' | 'B' }
  | { type: 'room-full' }
  | { type: 'error'; message: string }

// Outbound signals — only the ones we actually send (no 'from' field)
export type OutboundSignal =
  | { type: 'offer';  sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice';    candidate: RTCIceCandidateInit }

type SignalHandler = (msg: SignalMessage) => void
type PeerEventHandler = (userId: 'A' | 'B') => void

export class SignalClient {
  private socket: Socket
  private signalHandlers: SignalHandler[] = []
  private peerJoinedHandlers: PeerEventHandler[] = []
  private peerLeftHandlers: PeerEventHandler[] = []

  constructor(serverUrl: string) {
    this.socket = io(serverUrl, {
      autoConnect: false,
      transports: ['websocket'],
    })

    this.socket.on('signal', (data: SignalMessage) => {
      this.signalHandlers.forEach((h) => h(data))
    })

    this.socket.on('peer-joined', ({ userId }: { userId: 'A' | 'B' }) => {
      this.peerJoinedHandlers.forEach((h) => h(userId))
    })

    this.socket.on('peer-left', ({ userId }: { userId: 'A' | 'B' }) => {
      this.peerLeftHandlers.forEach((h) => h(userId))
    })

    this.socket.on('error', (err: { message: string }) => {
      console.error('[SignalClient] Error:', err.message)
    })
  }

  connect(roomCode: string, token: string) {
    this.socket.connect()
    this.socket.emit('join-room', { roomCode, token })
  }

  disconnect() {
    this.socket.disconnect()
  }

  sendSignal(msg: OutboundSignal) {
    this.socket.emit('signal', msg)
  }

  onSignal(handler: SignalHandler) {
    this.signalHandlers.push(handler)
    return () => {
      this.signalHandlers = this.signalHandlers.filter((h) => h !== handler)
    }
  }

  onPeerJoined(handler: PeerEventHandler) {
    this.peerJoinedHandlers.push(handler)
    return () => {
      this.peerJoinedHandlers = this.peerJoinedHandlers.filter((h) => h !== handler)
    }
  }

  onPeerLeft(handler: PeerEventHandler) {
    this.peerLeftHandlers.push(handler)
    return () => {
      this.peerLeftHandlers = this.peerLeftHandlers.filter((h) => h !== handler)
    }
  }

  get isConnected() {
    return this.socket.connected
  }
}
