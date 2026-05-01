import { useState, useEffect } from 'react'
import { StickyNote, Plus, Trash2, Link, Send } from 'lucide-react'
import { useNotesStore } from '../../app/store/notesStore'
import { useSessionStore } from '../../app/store/sessionStore'
import type { RefObject } from 'react'
import type { PeerConnection } from '../../lib/webrtc/PeerConnection'
import type { Note } from '../../app/store/notesStore'

interface NotesPanelProps {
  peerConnectionRef: RefObject<PeerConnection | null>
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const TAG_COLORS: Record<string, string> = {
  '#important': '#FF6B6B',
  '#exam': '#f0a04b',
  '#review': '#4ECDC4',
}

export default function NotesPanel({ peerConnectionRef }: NotesPanelProps) {
  const { sharedNotes, privateNotes, activeTab, remoteIsTyping,
    setActiveTab, addSharedNote, addPrivateNote, removeSharedNote, removePrivateNote } = useNotesStore()
  const { userId, currentPage } = useSessionStore()
  const [newNoteText, setNewNoteText] = useState('')

  const notes = activeTab === 'shared' ? sharedNotes : privateNotes

  const handleAddNote = () => {
    if (!newNoteText.trim() || !userId) return

    const tags = newNoteText.match(/#\w+/g) || []
    const note: Note = {
      id: generateId(),
      userId,
      content: newNoteText.trim(),
      linkedPage: currentPage || undefined,
      tags,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    if (activeTab === 'shared') {
      addSharedNote(note)
      // Send to peer over WebRTC
      peerConnectionRef.current?.sendOnChannel('notes', { action: 'add', note })
    } else {
      addPrivateNote(note)
    }
    setNewNoteText('')
  }

  const handleDelete = (id: string) => {
    if (activeTab === 'shared') {
      removeSharedNote(id)
      peerConnectionRef.current?.sendOnChannel('notes', { action: 'delete', id })
    } else {
      removePrivateNote(id)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <StickyNote size={12} style={{ color: 'var(--color-accent-teal)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Notes</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {(['shared', 'private'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-2 py-0.5 rounded text-xs font-medium capitalize transition-all"
              style={{
                background: activeTab === tab ? 'rgba(78, 205, 196, 0.15)' : undefined,
                color: activeTab === tab ? 'var(--color-accent-teal)' : 'var(--color-text-muted)',
                border: activeTab === tab ? '1px solid rgba(78, 205, 196, 0.3)' : '1px solid transparent',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Typing indicator */}
      {activeTab === 'shared' && remoteIsTyping && (
        <div className="px-3 py-1 text-xs flex items-center gap-1.5 flex-shrink-0"
          style={{ color: 'var(--color-text-muted)', background: 'rgba(78,205,196,0.04)' }}>
          <div className="flex gap-0.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1 h-1 rounded-full animate-pulse"
                style={{ background: 'var(--color-accent-teal)', animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
          Partner is typing...
        </div>
      )}

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <StickyNote size={20} style={{ color: 'var(--color-text-muted)', opacity: 0.4 }} />
            <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
              {activeTab === 'shared' ? 'No shared notes yet' : 'No private notes yet'}
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              userId={userId}
              onDelete={() => handleDelete(note.id)}
            />
          ))
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3 pt-0">
        <div className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.03)' }}>
          <textarea
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleAddNote()
              }
            }}
            placeholder={`Add a ${activeTab} note... (use #tag)`}
            className="w-full p-2.5 text-xs resize-none selectable"
            style={{
              background: 'transparent',
              color: 'var(--color-text-primary)',
              minHeight: 56,
              maxHeight: 100,
              outline: 'none',
              fontFamily: 'Sora, sans-serif',
            }}
            rows={2}
          />
          <div className="flex items-center justify-between px-2.5 pb-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>
              ⌘↵ to save
            </span>
            <button
              onClick={handleAddNote}
              disabled={!newNoteText.trim()}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all hover:scale-[1.02]"
              style={{
                background: 'var(--color-accent-teal)',
                color: 'white',
                opacity: newNoteText.trim() ? 1 : 0.4,
              }}
            >
              <Plus size={11} />
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function NoteCard({ note, userId, onDelete }: { note: Note; userId: string | null; onDelete: () => void }) {
  const isOwn = note.userId === userId
  const color = note.userId === 'A' ? '#FF6B6B' : '#4ECDC4'

  return (
    <div
      className="group rounded-xl p-2.5 transition-all hover:bg-white/[0.03]"
      style={{
        border: `1px solid ${color}1a`,
        borderLeft: `2px solid ${color}`,
        background: `${color}06`,
      }}
    >
      <p className="text-xs selectable" style={{ color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
        {note.content}
      </p>

      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        {note.linkedPage && (
          <span className="flex items-center gap-1 text-xs"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>
            <Link size={8} />
            p.{note.linkedPage}
          </span>
        )}
        {note.tags.map((tag) => (
          <span
            key={tag}
            className="text-xs px-1.5 py-0 rounded"
            style={{
              background: `${TAG_COLORS[tag] || '#a0a0b8'}22`,
              color: TAG_COLORS[tag] || 'var(--color-text-muted)',
              fontFamily: 'DM Mono, monospace',
              fontSize: 9,
            }}
          >
            {tag}
          </span>
        ))}

        {isOwn && (
          <button
            onClick={onDelete}
            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>
    </div>
  )
}
