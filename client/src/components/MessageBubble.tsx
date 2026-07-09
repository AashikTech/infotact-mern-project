import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message, Attachment, Reaction } from '../types'

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '👎', '🔥', '👏', '🎉', '💯']

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  currentUserId: string
  onReaction: (messageId: string, emoji: string) => void
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AttachmentItem({ attachment, isOwn }: { attachment: Attachment; isOwn: boolean }) {
  const isImage = attachment.mimetype.startsWith('image/')

  if (isImage) {
    return (
      <div className="mt-2">
        <a href={attachment.url} target="_blank" rel="noopener noreferrer">
          <img
            src={attachment.url}
            alt={attachment.filename}
            className="max-w-full max-h-[300px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
          />
        </a>
      </div>
    )
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-2 flex items-center gap-3 p-2 rounded-lg border transition-colors ${
        isOwn
          ? 'border-indigo-400 hover:bg-indigo-500'
          : 'border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className={`p-2 rounded ${isOwn ? 'bg-indigo-500' : 'bg-gray-200'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isOwn ? 'text-white' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm truncate ${isOwn ? 'text-white' : 'text-gray-900'}`}>
          {attachment.filename}
        </div>
        <div className={`text-xs ${isOwn ? 'text-indigo-200' : 'text-gray-400'}`}>
          {formatSize(attachment.size)}
        </div>
      </div>
    </a>
  )
}

function ReactionPills({ reactions, currentUserId, messageId, onReaction }: {
  reactions: Reaction[]
  currentUserId: string
  messageId: string
  onReaction: (messageId: string, emoji: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map((reaction) => {
        const hasReacted = reaction.userIds.includes(currentUserId)
        return (
          <button
            key={reaction.emoji}
            onClick={() => onReaction(messageId, reaction.emoji)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
              hasReacted
                ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{reaction.emoji}</span>
            <span>{reaction.userIds.length}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function MessageBubble({ message, isOwn, currentUserId, onReaction }: MessageBubbleProps) {
  const [showReactBar, setShowReactBar] = useState(false)
  const senderName = typeof message.senderId === 'string' ? 'Unknown' : message.senderId.name
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className="relative group">
        <div
          className={`max-w-[70%] p-3 rounded-lg ${
            isOwn ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'
          }`}
        >
          {!isOwn && (
            <div className="text-xs font-semibold text-gray-500 mb-1">{senderName}</div>
          )}
          {message.content && (
            <div className="text-sm prose prose-sm max-w-none prose-p:my-1 prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-code:text-pink-500 prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
          {message.attachments && message.attachments.length > 0 && (
            <div className={message.content ? 'mt-2' : ''}>
              {message.attachments.map((att, i) => (
                <AttachmentItem key={i} attachment={att} isOwn={isOwn} />
              ))}
            </div>
          )}
          {message.reactions && message.reactions.length > 0 && (
            <ReactionPills
              reactions={message.reactions}
              currentUserId={currentUserId}
              messageId={message.id}
              onReaction={onReaction}
            />
          )}
          <div className={`text-xs mt-1 ${isOwn ? 'text-indigo-200' : 'text-gray-400'}`}>
            {time}
          </div>
        </div>
        <button
          onClick={() => setShowReactBar((prev) => !prev)}
          className={`absolute ${isOwn ? '-left-8' : '-right-8'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600`}
          title="Add reaction"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        {showReactBar && (
          <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} -bottom-10 flex gap-0.5 bg-white rounded-lg shadow-lg border border-gray-200 px-1 py-0.5 z-20`}>
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { onReaction(message.id, emoji); setShowReactBar(false) }}
                className="hover:bg-gray-100 rounded p-0.5 text-sm transition-colors"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
