import { useEffect, useRef } from 'react'
import { Mic, MicOff, Video, VideoOff } from 'lucide-react'
import { useSessionStore } from '../../app/store/sessionStore'

export default function CameraFeed() {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const { localStream, remoteStream, isMicOn, isCameraOn, userId,
    setMicOn, setCameraOn } = useSessionStore()

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => { t.enabled = !isMicOn })
    }
    setMicOn(!isMicOn)
  }

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => { t.enabled = !isCameraOn })
    }
    setCameraOn(!isCameraOn)
  }

  const peerAColor = '#FF6B6B'
  const peerBColor = '#4ECDC4'
  const myColor = userId === 'A' ? peerAColor : peerBColor
  const theirColor = userId === 'A' ? peerBColor : peerAColor
  const myLabel = `You (${userId})`
  const theirLabel = `Partner (${userId === 'A' ? 'B' : 'A'})`

  const VideoFeed = ({
    videoRef,
    stream,
    label,
    borderColor,
    muted,
    showControls,
  }: {
    videoRef: React.RefObject<HTMLVideoElement>
    stream: MediaStream | null
    label: string
    borderColor: string
    muted: boolean
    showControls?: boolean
  }) => (
    <div
      className="relative overflow-hidden rounded-xl flex-1"
      style={{
        border: `1.5px solid ${borderColor}`,
        boxShadow: `0 0 12px ${borderColor}22`,
        background: '#0d0d1a',
        minHeight: 90,
      }}
    >
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: muted ? 'scaleX(-1)' : undefined, // mirror local
          }}
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: borderColor + '22' }}>
            <Video size={14} style={{ color: borderColor }} />
          </div>
        </div>
      )}

      {/* Label */}
      <div
        className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-xs font-mono"
        style={{
          background: 'rgba(0,0,0,0.65)',
          color: borderColor,
          fontFamily: 'DM Mono, monospace',
          fontSize: 9,
          backdropFilter: 'blur(4px)',
        }}
      >
        {label}
      </div>

      {/* Controls (only on local) */}
      {showControls && (
        <div className="absolute top-1.5 right-1.5 flex gap-1">
          <button
            onClick={toggleMic}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
            style={{
              background: isMicOn ? 'rgba(0,0,0,0.5)' : 'rgba(255,107,107,0.8)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {isMicOn
              ? <Mic size={10} color="white" />
              : <MicOff size={10} color="white" />}
          </button>
          <button
            onClick={toggleCamera}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
            style={{
              background: isCameraOn ? 'rgba(0,0,0,0.5)' : 'rgba(255,107,107,0.8)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {isCameraOn
              ? <Video size={10} color="white" />
              : <VideoOff size={10} color="white" />}
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex gap-2 p-3 flex-shrink-0" style={{ height: 130 }}>
      <VideoFeed
        videoRef={localVideoRef}
        stream={localStream}
        label={myLabel}
        borderColor={myColor}
        muted={true}
        showControls={true}
      />
      <VideoFeed
        videoRef={remoteVideoRef}
        stream={remoteStream}
        label={theirLabel}
        borderColor={theirColor}
        muted={false}
      />
    </div>
  )
}
