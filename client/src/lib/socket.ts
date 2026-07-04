import { io, type Socket } from 'socket.io-client'

const URL = import.meta.env.VITE_API_URL || ''

export const socket: Socket = io(URL, {
  auth: { token: localStorage.getItem('token') },
  autoConnect: false,
  transports: ['websocket', 'polling'],
})

export function connectSocket() {
  const token = localStorage.getItem('token')
  if (token) {
    socket.auth = { token }
    if (!socket.connected) {
      socket.connect()
    }
  }
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect()
  }
}
