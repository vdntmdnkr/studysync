import type { SignalClient } from './SignalClient'
import type { UserId } from '../../app/store/sessionStore'

// Free public STUN + TURN servers (required for cross-network P2P)
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:openrelay.metered.ca:80' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:80?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
]

interface PeerConnectionCallbacks {
  onRemoteStream?: (stream: MediaStream) => void
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
  onDataChannelMessage?: (channel: string, data: unknown) => void
}

// All data channels used in the app
const DATA_CHANNELS = [
  'annotations',
  'chat',
  'notes',
  'music-sync',
  'timer-sync',
  'video-sync',
  'cursors',
  'presence',
]

export class PeerConnection {
  private pc: RTCPeerConnection
  private dataChannels: Map<string, RTCDataChannel> = new Map()
  private isInitiator: boolean
  private signalClient: SignalClient
  private callbacks: PeerConnectionCallbacks
  private localStream: MediaStream | null = null

  constructor(userId: UserId, signalClient: SignalClient, callbacks: PeerConnectionCallbacks) {
    this.isInitiator = userId === 'A'
    this.signalClient = signalClient
    this.callbacks = callbacks

    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    // ICE candidates
    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.signalClient.sendSignal({ type: 'ice', candidate: candidate.toJSON() })
      }
    }

    // Log ICE connection state changes for debugging
    this.pc.oniceconnectionstatechange = () => {
      console.log('[PeerConnection] ICE state:', this.pc.iceConnectionState)
    }

    // Connection state
    this.pc.onconnectionstatechange = () => {
      console.log('[PeerConnection] Connection state:', this.pc.connectionState)
      callbacks.onConnectionStateChange?.(this.pc.connectionState)
    }

    // Remote tracks → set remote stream
    this.pc.ontrack = ({ streams }) => {
      console.log('[PeerConnection] Remote track received, streams:', streams.length)
      if (streams[0]) {
        callbacks.onRemoteStream?.(streams[0])
      }
    }

    // Data channels
    if (this.isInitiator) {
      this.setupInitiatorDataChannels()
    } else {
      this.pc.ondatachannel = ({ channel }) => {
        console.log('[PeerConnection] Received data channel:', channel.label)
        this.registerDataChannel(channel)
      }
    }

    // Signalling messages
    this.signalClient.onSignal(async (msg) => {
      try {
        if (msg.type === 'offer') {
          console.log('[PeerConnection] Received offer')
          await this.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
          const answer = await this.pc.createAnswer()
          await this.pc.setLocalDescription(answer)
          this.signalClient.sendSignal({ type: 'answer', sdp: answer })
        } else if (msg.type === 'answer') {
          console.log('[PeerConnection] Received answer')
          await this.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
        } else if (msg.type === 'ice') {
          await this.pc.addIceCandidate(new RTCIceCandidate(msg.candidate))
        }
      } catch (err) {
        console.error('[PeerConnection] Signal handling error:', err)
      }
    })

    // Initiator waits for peer to join then creates offer
    if (this.isInitiator) {
      this.signalClient.onPeerJoined(async () => {
        console.log('[PeerConnection] Peer joined, starting call')
        await this.startCall()
      })
    }
  }

  async addLocalStream(stream: MediaStream) {
    this.localStream = stream
    stream.getTracks().forEach((track) => {
      console.log('[PeerConnection] Adding local track:', track.kind)
      this.pc.addTrack(track, stream)
    })
  }

  private setupInitiatorDataChannels() {
    DATA_CHANNELS.forEach((name) => {
      const channel = this.pc.createDataChannel(name, {
        ordered: name !== 'cursors',
        maxRetransmits: name === 'cursors' ? 0 : undefined,
      })
      this.registerDataChannel(channel)
      console.log('[PeerConnection] Created data channel:', name)
    })
  }

  private registerDataChannel(channel: RTCDataChannel) {
    this.dataChannels.set(channel.label, channel)
    channel.onopen = () => {
      console.log('[DataChannel] Open:', channel.label)
    }
    channel.onmessage = ({ data }) => {
      try {
        const parsed = JSON.parse(data as string) as unknown
        this.callbacks.onDataChannelMessage?.(channel.label, parsed)
      } catch {
        // binary data — ignore
      }
    }
    channel.onerror = (err) => {
      console.error(`[DataChannel:${channel.label}] Error:`, err)
    }
  }

  async startCall() {
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    this.signalClient.sendSignal({ type: 'offer', sdp: offer })
    console.log('[PeerConnection] Offer sent')
  }

  sendOnChannel(channelName: string, data: unknown) {
    const channel = this.dataChannels.get(channelName)
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify(data))
    } else {
      console.warn(`[DataChannel] "${channelName}" not open (state: ${channel?.readyState ?? 'not found'})`)
    }
  }

  async replaceVideoTrack(track: MediaStreamTrack | null) {
    const sender = this.pc.getSenders().find((s) => s.track?.kind === 'video')
    if (sender) await sender.replaceTrack(track)
  }

  getStats() {
    return this.pc.getStats()
  }

  close() {
    this.pc.close()
    this.dataChannels.clear()
    this.localStream?.getTracks().forEach((t) => t.stop())
  }

  get connectionState() {
    return this.pc.connectionState
  }
}
