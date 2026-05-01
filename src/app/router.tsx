import { Routes, Route } from 'react-router-dom'
import Home from '../screens/Home'
import Session from '../screens/Session'
import SessionEnd from '../screens/SessionEnd'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/session" element={<Session />} />
      <Route path="/session-end" element={<SessionEnd />} />
    </Routes>
  )
}
