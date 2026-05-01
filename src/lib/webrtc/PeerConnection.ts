import type { SignalClient } from './SignalClient'
import type { UserId } from '../../app/store/sessionStore'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

interface PeerConnectionCallbacks {
  onRemoteStream?: (stream: MediaStream) => void
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
  onDataChannelMessage?: (channel: string, data: unknown) => void
}

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

    // Connection state
    this.pc.onconnectionstatechange = () => {
      callbacks.onConnectionStateChange?.(this.pc.connectionState)
    }

    // Remote tracks
    this.pc.ontrack = ({ streams }) => {
      if (streams[0]) {
        callbacks.onRemoteStream?.(streams[0])
      }
    }

    // Data channels (initiator creates them, responder receives them)
    if (this.isInitiator) {
      this.setupInitiatorDataChannels()
    } else {
      this.pc.ondatachannel = ({ channel }) => {
        this.registerDataChannel(channel)
      }
    }

    // Listen for signals
    this.signalClient.onSignal(async (msg) => {
      if (msg.type === 'offer') {
        await this.pc.setRemoteDescription(msg.sdp)
        const answer = await this.pc.createAnswer()
        await this.pc.setLocalDescription(answer)
        this.signalClient.sendSignal({ type: 'answer', sdp: answer })
      } else if (msg.type === 'answer') {
        await this.pc.setRemoteDescription(msg.sdp)
      } else if (msg.type === 'ice') {
        await this.pc.addIceCandidate(msg.candidate)
      }
    })

    // Peer joined → initiator creates offer
    if (this.isInitiator) {
      this.signalClient.onPeerJoined(async () => {
        await this.startCall()
      })
    }
  }

  async addLocalStream(stream: MediaStream) {
    this.localStream = stream
    stream.getTracks().forEach((track) => {
      this.pc.addTrack(track, stream)
    })
  }

  private setupInitiatorDataChannels() {
    const channelNames = ['annotations', 'cursors', 'music-sync', 'video-sync', 'timer-sync', 'notes', 'presence']
    channelNames.forEach((name) => {
      const ordered = name !== 'cursors'
      const reliable = name !== 'cursors'
      const channel = this.pc.createDataChannel(name, { ordered, maxRetransmits: reliable ? undefined : 0 })
      this.registerDataChannel(channel)
    })
  }

  private registerDataChannel(channel: RTCDataChannel) {
    this.dataChannels.set(channel.label, channel)
    channel.onmessage = ({ data }) => {
      try {
        const parsed = JSON.parse(data as string) as unknown
        this.callbacks.onDataChannelMessage?.(channel.label, parsed)
      } catch {
        // binary data
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
  }

  sendOnChannel(channelName: string, data: unknown) {
    const channel = this.dataChannels.get(channelName)
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify(data))
    }
  }

  onChannelMessage(channelName: string, handler: (data: unknown) => void) {
    const channel = this.dataChannels.get(channelName)
    if (channel) {
      const prev = channel.onmessage
      channel.onmessage = (ev) => {
        prev?.call(channel, ev)
        try {
          handler(JSON.parse(ev.data as string))
        } catch { /* ignore */ }
      }
    }
  }

  async replaceVideoTrack(track: MediaStreamTrack | null) {
    const sender = this.pc.getSenders().find((s) => s.track?.kind === 'video')
    if (sender) {
      if (track) {
        await sender.replaceTrack(track)
      } else {
        await sender.replaceTrack(null)
      }
    }
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
