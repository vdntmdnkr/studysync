import { create } from 'zustand'
import type { UserId } from './sessionStore'

export type AnnotationType = 'highlight' | 'pen' | 'sticky' | 'text'
export type AnnotationTool = AnnotationType | 'cursor'

export interface HighlightData {
  x: number; y: number; width: number; height: number
  color: string
}

export interface PenData {
  points: Array<{ x: number; y: number }>
  color: string
  strokeWidth: number
}

export interface StickyData {
  x: number; y: number
  content: string
  color: string
}

export interface TextData {
  x: number; y: number
  content: string
  fontSize: number
  color: string
}

export interface Annotation {
  id: string
  type: AnnotationType
  userId: UserId
  pageNumber: number
  data: HighlightData | PenData | StickyData | TextData
  createdAt: number
}

interface AnnotationState {
  annotations: Map<string, Annotation>
  activeTool: AnnotationTool
  strokeWidth: number
  isDrawing: boolean

  // Actions
  addAnnotation: (annotation: Annotation) => void
  removeAnnotation: (id: string) => void
  updateAnnotation: (id: string, update: Partial<Annotation>) => void
  setActiveTool: (tool: AnnotationTool) => void
  setStrokeWidth: (width: number) => void
  setIsDrawing: (drawing: boolean) => void
  getAnnotationsForPage: (pageNumber: number) => Annotation[]
  clearAll: () => void
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  annotations: new Map(),
  activeTool: 'cursor',
  strokeWidth: 2,
  isDrawing: false,

  addAnnotation: (annotation) =>
    set((state) => {
      const next = new Map(state.annotations)
      next.set(annotation.id, annotation)
      return { annotations: next }
    }),

  removeAnnotation: (id) =>
    set((state) => {
      const next = new Map(state.annotations)
      next.delete(id)
      return { annotations: next }
    }),

  updateAnnotation: (id, update) =>
    set((state) => {
      const existing = state.annotations.get(id)
      if (!existing) return state
      const next = new Map(state.annotations)
      next.set(id, { ...existing, ...update })
      return { annotations: next }
    }),

  setActiveTool: (tool) => set({ activeTool: tool }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setIsDrawing: (drawing) => set({ isDrawing: drawing }),

  getAnnotationsForPage: (pageNumber) => {
    return Array.from(get().annotations.values())
      .filter((a) => a.pageNumber === pageNumber)
      .sort((a, b) => a.createdAt - b.createdAt)
  },

  clearAll: () => set({ annotations: new Map() }),
}))
