import { io, type Socket } from 'socket.io-client'

const URL = import.meta.env.VITE_API_URL || ''

let socket: Socket | null = null

export function getSocket(): Socket {
  const token = localStorage.getItem('token')

  if (socket) {
    socket.auth = { token }
    if (!socket.connected) {
      socket.connect()
    }
    return socket
  }

  socket = io(URL, {
    auth: { token },
    autoConnect: false,
    transports: ['websocket'],
  })

  return socket
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect()
  }
  socket = null
}
