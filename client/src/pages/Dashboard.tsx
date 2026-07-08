import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import DocumentEditor from '../components/DocumentEditor'
import { getSocket } from '../lib/socket'
import { getWorkspaces, createWorkspace, joinWorkspace, getChannels, createChannel } from '../lib/api'
import type { Workspace, Channel } from '../types'

const STORAGE_KEYS = {
  workspace: 'selectedWorkspaceId',
  channel: 'selectedChannelId',
} as const

export default function Dashboard() {
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [creating, setCreating] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'document'>('chat')

  useEffect(() => {
    const socket = getSocket()
    if (!socket.connected) {
      socket.connect()
    }
    setConnected(socket.connected)

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    getWorkspaces()
      .then((ws) => {
        setWorkspaces(ws)
        setLoading(false)

        const savedWsId = localStorage.getItem(STORAGE_KEYS.workspace)
        if (savedWsId) {
          const savedWs = ws.find((w) => w.id === savedWsId)
          if (savedWs) {
            setSelectedWorkspace(savedWs)
            getChannels(savedWs.id).then((chs) => {
              setChannels(chs)
              const savedChId = localStorage.getItem(STORAGE_KEYS.channel)
              if (savedChId) {
                const savedCh = chs.find((ch) => ch.id === savedChId)
                if (savedCh) setSelectedChannel(savedCh)
              }
            }).catch(() => setChannels([]))
          }
        }
      })
      .catch(() => setLoading(false))

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [])

  const handleSelectWorkspace = useCallback(async (ws: Workspace) => {
    setSelectedWorkspace(ws)
    setSelectedChannel(null)
    setActiveTab('chat')
    localStorage.setItem(STORAGE_KEYS.workspace, ws.id)
    localStorage.removeItem(STORAGE_KEYS.channel)
    try {
      const chs = await getChannels(ws.id)
      setChannels(chs)
    } catch {
      setChannels([])
    }
  }, [])

  const handleSelectChannel = useCallback((ch: Channel | null) => {
    setSelectedChannel(ch)
    setActiveTab('chat')
    if (ch) {
      localStorage.setItem(STORAGE_KEYS.channel, ch.id)
    } else {
      localStorage.removeItem(STORAGE_KEYS.channel)
    }
  }, [])

  const handleCreateWorkspace = useCallback(async (name: string) => {
    setCreating(true)
    try {
      const ws = await createWorkspace(name)
      setWorkspaces((prev) => [...prev, ws])
      setSelectedWorkspace(ws)
      localStorage.setItem(STORAGE_KEYS.workspace, ws.id)
      const chs = await getChannels(ws.id)
      setChannels(chs)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create workspace'
      alert(message)
    } finally {
      setCreating(false)
    }
  }, [])

  const handleJoinWorkspace = useCallback(async (inviteCode: string) => {
    setCreating(true)
    try {
      const ws = await joinWorkspace(inviteCode)
      setWorkspaces((prev) => {
        if (prev.some((w) => w.id === ws.id)) return prev
        return [...prev, ws]
      })
      setSelectedWorkspace(ws)
      localStorage.setItem(STORAGE_KEYS.workspace, ws.id)
      const chs = await getChannels(ws.id)
      setChannels(chs)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join workspace'
      alert(message)
    } finally {
      setCreating(false)
    }
  }, [])

  const handleCreateChannel = useCallback(async (name: string, workspaceId: string) => {
    setCreating(true)
    try {
      const ch = await createChannel(name, workspaceId)
      setChannels((prev) => [...prev, ch])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create channel'
      alert(message)
    } finally {
      setCreating(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading workspaces...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        workspaces={workspaces}
        channels={channels}
        selectedWorkspace={selectedWorkspace}
        selectedChannel={selectedChannel}
        connected={connected}
        creating={creating}
        onSelectWorkspace={handleSelectWorkspace}
        onSelectChannel={handleSelectChannel}
        onCreateWorkspace={handleCreateWorkspace}
        onJoinWorkspace={handleJoinWorkspace}
        onCreateChannel={handleCreateChannel}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedWorkspace ? (
          <>
            <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    activeTab === 'chat'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setActiveTab('document')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    activeTab === 'document'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Document
                </button>
              </div>
              {activeTab === 'chat' && selectedChannel && (
                <h2 className="font-semibold text-gray-800"># {selectedChannel.name}</h2>
              )}
            </div>
            {activeTab === 'chat' ? (
              selectedChannel && user ? (
                <ChatWindow channelId={selectedChannel.id} user={user} />
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-100 text-gray-500">
                  Select a channel to start chatting
                </div>
              )
            ) : (
              <DocumentEditor workspaceId={selectedWorkspace.id} />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-100 text-gray-500">
            Select a workspace
          </div>
        )}
      </main>
    </div>
  )
}
