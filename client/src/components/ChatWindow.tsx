import { useState, useEffect, useRef, useCallback } from 'react'
import { getSocket } from '../lib/socket'
import { getMessages } from '../lib/api'
import MessageBubble from './MessageBubble'
import type { User, Message } from '../types'

interface ChatWindowProps {
  channelId: string
  user: User
}

export default function ChatWindow({ channelId, user }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const socket = getSocket()

  const sendTypingStop = useCallback(() => {
    socket.emit('typing:stop', { channelId })
  }, [channelId, socket])

  const emitTyping = useCallback(() => {
    socket.emit('typing:start', { channelId, name: user.name })
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(sendTypingStop, 1500)
  }, [channelId, user.name, sendTypingStop, socket])

  useEffect(() => {
    setMessages([])
    setTypingUser(null)

    getMessages(channelId).then(setMessages)

    if (!socket.connected) {
      socket.connect()
    }
    socket.emit('channel:join', channelId)

    const onMessage = (msg: Message) => {
      if (msg.channelId === channelId) {
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])
      }
    }
    const onTypingStart = ({ name }: { name: string }) => setTypingUser(name)
    const onTypingStop = () => setTypingUser(null)

    socket.on('chat:message', onMessage)
    socket.on('typing:start', onTypingStart)
    socket.on('typing:stop', onTypingStop)

    return () => {
      socket.off('chat:message', onMessage)
      socket.off('typing:start', onTypingStart)
      socket.off('typing:stop', onTypingStop)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      sendTypingStop()
    }
  }, [channelId, sendTypingStop, socket])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    socket.emit('chat:message', { channelId, content: text })
    setText('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    sendTypingStop()
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => {
          const senderId = typeof msg.senderId === 'string' ? msg.senderId : msg.senderId.id
          return (
            <MessageBubble key={msg.id} message={msg} isOwn={senderId === user.id} />
          )
        })}
        <div ref={bottomRef} />
      </div>

      {typingUser && (
        <div className="px-4 py-1 text-sm text-gray-400 italic">{typingUser} is typing...</div>
      )}

      <form onSubmit={send} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => { setText(e.target.value); emitTyping() }}
            placeholder="Type a message..."
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
