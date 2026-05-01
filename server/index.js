import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

app.use(cors())
app.use(express.json())

// ─── Room Manager ─────────────────────────────────────
const rooms = new Map()

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code
  do { code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') }
  while (rooms.has(code))
  return code
}

// ─── REST ──────────────────────────────────────────────
app.post('/rooms', (req, res) => {
  const code = generateCode()
  const tokenA = Math.random().toString(36).slice(2)
  const tokenB = Math.random().toString(36).slice(2)
  rooms.set(code, { code, tokenA, tokenB, peers: new Map(), createdAt: Date.now() })
  console.log(`[Room Created] ${code}`)
  res.json({ roomCode: code, token: tokenA })
})

app.post('/rooms/:code/join', (req, res) => {
  const { code } = req.params
  const room = rooms.get(code.toUpperCase())
  if (!room) return res.status(404).json({ error: 'Room not found' })
  if (room.peers.size >= 2) return res.status(409).json({ error: 'Room is full' })
  console.log(`[Room Joined] ${code}`)
  res.json({ roomCode: code, token: room.tokenB })
})

app.get('/rooms/:code/status', (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase())
  if (!room) return res.status(404).json({ error: 'Room not found' })
  res.json({ roomCode: room.code, peerCount: room.peers.size, full: room.peers.size >= 2 })
})

// ─── WebSocket Signalling ──────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`)

  socket.on('join-room', ({ roomCode, token }) => {
    const room = rooms.get(roomCode)
    if (!room) { socket.emit('error', { message: 'Room not found' }); return }
    if (room.peers.size >= 2) { socket.emit('error', { message: 'Room is full' }); return }

    const userId = room.peers.size === 0 ? 'A' : 'B'
    room.peers.set(socket.id, { userId, token })
    socket.join(roomCode)
    socket.data.roomCode = roomCode
    socket.data.userId = userId

    socket.emit('joined-room', { userId, roomCode })
    console.log(`[Peer ${userId}] Joined room ${roomCode}`)

    if (userId === 'B') socket.to(roomCode).emit('peer-joined', { userId: 'B' })
  })

  socket.on('signal', (data) => {
    const roomCode = socket.data.roomCode
    if (!roomCode) return
    socket.to(roomCode).emit('signal', { ...data, from: socket.data.userId })
  })

  socket.on('disconnect', () => {
    const roomCode = socket.data.roomCode
    if (!roomCode) return
    const room = rooms.get(roomCode)
    if (room) {
      room.peers.delete(socket.id)
      socket.to(roomCode).emit('peer-left', { userId: socket.data.userId })
      console.log(`[Peer ${socket.data.userId}] Left room ${roomCode}`)
    }
  })
})

// ─── Cleanup expired rooms (1h) ────────────────────────
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000
  for (const [code, room] of rooms.entries()) {
    if (room.createdAt < cutoff && room.peers.size === 0) {
      rooms.delete(code)
      console.log(`[Room Expired] ${code}`)
    }
  }
}, 10 * 60 * 1000)

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`\n🚀 StudySync Signalling Server`)
  console.log(`   Running on http://localhost:${PORT}\n`)
})
