import { useState, useEffect, useCallback, useRef } from 'react'
import { getSocket } from '../lib/socket'
import { getDocument } from '../lib/api'

interface DocumentEditorProps {
  workspaceId: string
}

export default function DocumentEditor({ workspaceId }: DocumentEditorProps) {
  const [content, setContent] = useState('')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'loading'>('loading')
  const socket = getSocket()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ignoreNextUpdate = useRef(false)

  useEffect(() => {
    setSaveStatus('loading')
    ignoreNextUpdate.current = false

    getDocument(workspaceId).then((doc) => {
      setContent(doc.content)
      setSaveStatus('saved')
    })

    if (!socket.connected) {
      socket.connect()
    }
    socket.emit('doc:join', { workspaceId })

    const onContent = ({ content: newContent }: { content: string }) => {
      if (!ignoreNextUpdate.current) {
        setContent(newContent)
        setSaveStatus('saved')
      }
      ignoreNextUpdate.current = false
    }

    socket.on('doc:content', onContent)

    return () => {
      socket.off('doc:content', onContent)
      socket.emit('doc:leave', { workspaceId })
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [workspaceId, socket])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    setSaveStatus('saving')
    ignoreNextUpdate.current = true

    socket.emit('doc:update', { workspaceId, content: newContent })

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSaveStatus('saved')
    }, 2000)
  }, [workspaceId, socket])

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Shared Document</h3>
        <span className={`text-xs ${
          saveStatus === 'saved' ? 'text-green-500' :
          saveStatus === 'saving' ? 'text-yellow-500' :
          'text-gray-400'
        }`}>
          {saveStatus === 'saved' ? 'Saved' :
           saveStatus === 'saving' ? 'Saving...' :
           'Loading...'}
        </span>
      </div>
      <textarea
        value={content}
        onChange={handleChange}
        placeholder="Start typing... (changes sync in real-time)"
        className="flex-1 p-4 resize-none focus:outline-none text-sm leading-relaxed"
      />
    </div>
  )
}
