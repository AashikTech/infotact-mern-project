import { useState, useEffect, useRef, useCallback } from 'react'
import { getSocket } from '../lib/socket'
import { getMessages, uploadFile } from '../lib/api'
import MessageBubble from './MessageBubble'
import type { User, Message, Attachment } from '../types'

interface ChatWindowProps {
  channelId: string
  user: User
}

export default function ChatWindow({ channelId, user }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

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
    setPendingFiles([])

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
    const onReactionUpdate = ({ messageId, reactions }: { messageId: string; reactions: any[] }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      )
    }

    socket.on('chat:message', onMessage)
    socket.on('typing:start', onTypingStart)
    socket.on('typing:stop', onTypingStop)
    socket.on('reaction:update', onReactionUpdate)

    return () => {
      socket.off('chat:message', onMessage)
      socket.off('typing:start', onTypingStart)
      socket.off('typing:stop', onTypingStop)
      socket.off('reaction:update', onReactionUpdate)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      sendTypingStop()
    }
  }, [channelId, sendTypingStop, socket])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleFiles = (files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, 5)
    setPendingFiles((prev) => [...prev, ...arr].slice(0, 5))
  }

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          files.push(new File([file], file.name || `pasted-${Date.now()}`, { type: file.type }))
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault()
      handleFiles(files)
    }
  }

  const send = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault()
    if (!text.trim() && pendingFiles.length === 0) return

    setUploading(true)
    let attachments: Attachment[] = []

    try {
      if (pendingFiles.length > 0) {
        const results = await Promise.all(pendingFiles.map((f) => uploadFile(f)))
        attachments = results
      }

      socket.emit('chat:message', {
        channelId,
        content: text,
        attachments: attachments.length > 0 ? attachments : undefined,
      })
      setText('')
      setPendingFiles([])
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to upload files. Please try again.'
      alert(msg)
    } finally {
      setUploading(false)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      sendTypingStop()
    }
  }

  const handleReaction = useCallback((messageId: string, emoji: string) => {
    const msg = messages.find((m) => m.id === messageId)
    if (!msg) return

    const existing = msg.reactions?.find((r) => r.emoji === emoji)
    const hasReacted = existing?.userIds.includes(user.id)

    if (hasReacted) {
      socket.emit('reaction:remove', { messageId, emoji })
    } else {
      socket.emit('reaction:add', { messageId, emoji })
    }
  }, [messages, user.id, socket])

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div
      className="flex-1 flex flex-col min-h-0 bg-white relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-10 bg-indigo-50 border-2 border-dashed border-indigo-400 flex items-center justify-center">
          <div className="text-indigo-600 text-lg font-semibold">Drop files here</div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-2">
        {messages.map((msg) => {
          const senderId = typeof msg.senderId === 'string' ? msg.senderId : msg.senderId.id
          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={senderId === user.id}
              currentUserId={user.id}
              onReaction={handleReaction}
            />
          )
        })}
        <div ref={bottomRef} />
      </div>

      {typingUser && (
        <div className="px-4 py-1 text-sm text-gray-400 italic">{typingUser} is typing...</div>
      )}

      {pendingFiles.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 flex flex-wrap gap-2">
          {pendingFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 text-sm">
              <span className="truncate max-w-[150px]">{file.name}</span>
              <span className="text-gray-400 text-xs">{formatSize(file.size)}</span>
              <button
                type="button"
                onClick={() => removePendingFile(i)}
                className="text-gray-500 hover:text-red-500 ml-1"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={send} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Attach files"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); emitTyping() }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(e)
              }
            }}
            onPaste={handlePaste}
            placeholder="Type a message... (Ctrl+V to paste images)"
            rows={1}
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <button
            type="submit"
            disabled={uploading || (!text.trim() && pendingFiles.length === 0)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}
