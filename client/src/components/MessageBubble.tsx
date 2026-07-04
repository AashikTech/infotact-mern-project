import type { Message } from '../types'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
}

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const senderName = typeof message.senderId === 'string' ? 'Unknown' : message.senderId.name
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] p-3 rounded-lg ${
          isOwn ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'
        }`}
      >
        {!isOwn && (
          <div className="text-xs font-semibold text-gray-500 mb-1">{senderName}</div>
        )}
        <div className="text-sm">{message.content}</div>
        <div className={`text-xs mt-1 ${isOwn ? 'text-indigo-200' : 'text-gray-400'}`}>
          {time}
        </div>
      </div>
    </div>
  )
}
