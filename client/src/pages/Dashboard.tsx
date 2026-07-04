import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import { getSocket } from '../lib/socket'
import { getWorkspaces, createWorkspace, joinWorkspace, getChannels, createChannel } from '../lib/api'
import type { Workspace, Channel } from '../types'

export default function Dashboard() {
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)

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

    getWorkspaces().then((ws) => { setWorkspaces(ws); setLoading(false) })

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [])

  const handleSelectWorkspace = useCallback(async (ws: Workspace) => {
    setSelectedWorkspace(ws)
    setSelectedChannel(null)
    const chs = await getChannels(ws.id)
    setChannels(chs)
  }, [])

  const handleCreateWorkspace = useCallback(async (name: string) => {
    const ws = await createWorkspace(name)
    setWorkspaces((prev) => [...prev, ws])
  }, [])

  const handleJoinWorkspace = useCallback(async (inviteCode: string) => {
    const ws = await joinWorkspace(inviteCode)
    setWorkspaces((prev) => [...prev, ws])
  }, [])

  const handleCreateChannel = useCallback(async (name: string, workspaceId: string) => {
    const ch = await createChannel(name, workspaceId)
    setChannels((prev) => [...prev, ch])
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
        onSelectWorkspace={handleSelectWorkspace}
        onSelectChannel={setSelectedChannel}
        onCreateWorkspace={handleCreateWorkspace}
        onJoinWorkspace={handleJoinWorkspace}
        onCreateChannel={handleCreateChannel}
      />
      <main className="flex-1 flex flex-col">
        {selectedChannel && user ? (
          <>
            <div className="px-4 py-3 border-b border-gray-200 bg-white">
              <h2 className="font-semibold text-gray-800"># {selectedChannel.name}</h2>
            </div>
            <ChatWindow channelId={selectedChannel.id} user={user} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-100 text-gray-500">
            Select a channel
          </div>
        )}
      </main>
    </div>
  )
}
