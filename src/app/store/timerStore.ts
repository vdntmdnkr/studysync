import { create } from 'zustand'

export type TimerPhase = 'focus' | 'break'

interface TimerState {
  phase: TimerPhase
  isRunning: boolean
  timeLeft: number // seconds
  focusDuration: number // minutes
  breakDuration: number // minutes
  sessionsCompleted: number
  endsAt: number | null // timestamp for syncing

  setPhase: (phase: TimerPhase) => void
  setIsRunning: (running: boolean) => void
  setTimeLeft: (seconds: number) => void
  setDurations: (focus: number, breakDur: number) => void
  completePhase: () => void
  resetTimer: () => void
  syncTimer: (data: { action: 'start'|'pause', phase: TimerPhase, endsAt: number | null, focusDuration: number, breakDuration: number }) => void
}

export const useTimerStore = create<TimerState>((set, get) => ({
  phase: 'focus',
  isRunning: false,
  timeLeft: 25 * 60,
  focusDuration: 25,
  breakDuration: 5,
  sessionsCompleted: 0,
  endsAt: null,

  setPhase: (phase) => set({ phase }),
  setIsRunning: (isRunning) => set({ isRunning }),
  setTimeLeft: (timeLeft) => set({ timeLeft }),
  setDurations: (focusDuration, breakDuration) => set({ focusDuration, breakDuration }),

  completePhase: () => {
    const { phase, focusDuration, breakDuration, sessionsCompleted } = get()
    const nextPhase = phase === 'focus' ? 'break' : 'focus'
    
    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification(nextPhase === 'break' ? '☕ Break Time!' : '📚 Focus Time!', {
        body: nextPhase === 'break' ? 'Take a well-deserved break.' : 'Time to focus!',
      })
    } else {
      Notification.requestPermission()
    }

    set({
      isRunning: false,
      phase: nextPhase,
      timeLeft: (nextPhase === 'focus' ? focusDuration : breakDuration) * 60,
      sessionsCompleted: phase === 'focus' ? sessionsCompleted + 1 : sessionsCompleted,
      endsAt: null
    })
  },

  resetTimer: () => {
    const { phase, focusDuration, breakDuration } = get()
    set({
      isRunning: false,
      endsAt: null,
      timeLeft: (phase === 'focus' ? focusDuration : breakDuration) * 60
    })
  },

  syncTimer: (data) => {
    const { action, phase, endsAt, focusDuration, breakDuration } = data
    const isRunning = action === 'start'
    let timeLeft = (phase === 'focus' ? focusDuration : breakDuration) * 60
    
    if (isRunning && endsAt) {
      timeLeft = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
    }

    set({
      isRunning,
      phase,
      endsAt,
      focusDuration,
      breakDuration,
      timeLeft
    })
  }
}))
