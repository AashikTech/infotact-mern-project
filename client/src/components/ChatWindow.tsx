import { useState, useEffect, useRef } from 'react'
import { socket, connectSocket } from '../lib/socket'
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
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages([])

    getMessages(channelId).then(setMessages)

    connectSocket()

    if (!socket.connected) {
      socket.connect()
    }
    socket.emit('channel:join', channelId)

    const handler = (msg: Message) => {
      if (msg.channelId === channelId) {
        setMessages((prev) => [...prev, msg])
      }
    }
    socket.on('chat:message', handler)

    return () => {
      socket.off('chat:message', handler)
    }
  }, [channelId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    socket.emit('chat:message', { channelId, content: text })
    setText('')
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

      <form onSubmit={send} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
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
