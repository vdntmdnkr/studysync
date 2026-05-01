import { useState, useEffect, useRef } from 'react'
import { Send, MessageCircle } from 'lucide-react'
import { useChatStore } from '../../app/store/chatStore'
import { useSessionStore } from '../../app/store/sessionStore'
import type { RefObject } from 'react'
import type { PeerConnection } from '../../lib/webrtc/PeerConnection'
import type { ChatMessage } from '../../app/store/chatStore'

interface ChatPanelProps {
  peerConnectionRef: RefObject<PeerConnection | null>
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function ChatPanel({ peerConnectionRef }: ChatPanelProps) {
  const { messages, addMessage } = useChatStore()
  const { userId } = useSessionStore()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!text.trim() || !userId) return
    const msg: ChatMessage = {
      id: generateId(),
      userId,
      text: text.trim(),
      timestamp: Date.now(),
    }
    addMessage(msg)
    peerConnectionRef.current?.sendOnChannel('chat', msg)
    setText('')
  }

  const userColor = (uid: string) => uid === 'A' ? '#FF6B6B' : '#4ECDC4'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        <MessageCircle size={12} style={{ color: 'var(--color-accent-teal)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Chat</span>
        <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full"
          style={{ background: `${userColor(userId || 'A')}20`, color: userColor(userId || 'A'), fontSize: 9, fontFamily: 'DM Mono' }}>
          You are {userId}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <MessageCircle size={24} style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
            <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
              No messages yet.<br />Say hi to your study partner!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.userId === userId
            const color = userColor(msg.userId)
            return (
              <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                <div
                  className="max-w-[85%] px-3 py-2 rounded-2xl text-xs"
                  style={{
                    background: isOwn ? `${color}20` : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${color}30`,
                    color: 'var(--color-text-primary)',
                    borderBottomRightRadius: isOwn ? 4 : undefined,
                    borderBottomLeftRadius: !isOwn ? 4 : undefined,
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.text}
                </div>
                <span className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)', fontSize: 9, fontFamily: 'DM Mono' }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3 pt-0">
        <div className="flex gap-2 items-end rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.03)' }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Type a message... (Enter to send)"
            rows={2}
            className="flex-1 p-2.5 text-xs resize-none selectable"
            style={{
              background: 'transparent',
              color: 'var(--color-text-primary)',
              outline: 'none',
              fontFamily: 'Sora, sans-serif',
              maxHeight: 80,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="m-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105 flex-shrink-0"
            style={{
              background: text.trim() ? 'linear-gradient(135deg, #5DCAA5, #4ECDC4)' : 'rgba(255,255,255,0.06)',
              opacity: text.trim() ? 1 : 0.5,
            }}
          >
            <Send size={12} color="white" />
          </button>
        </div>
      </div>
    </div>
  )
}
