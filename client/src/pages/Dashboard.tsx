import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import { getWorkspaces, createWorkspace, joinWorkspace, getChannels, createChannel } from '../lib/api'
import type { Workspace, Channel } from '../types'

export default function Dashboard() {
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)

  useEffect(() => {
    getWorkspaces().then(setWorkspaces)
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

  return (
    <div className="flex h-screen">
      <Sidebar
        workspaces={workspaces}
        channels={channels}
        selectedWorkspace={selectedWorkspace}
        selectedChannel={selectedChannel}
        onSelectWorkspace={handleSelectWorkspace}
        onSelectChannel={setSelectedChannel}
        onCreateWorkspace={handleCreateWorkspace}
        onJoinWorkspace={handleJoinWorkspace}
        onCreateChannel={handleCreateChannel}
      />
      <main className="flex-1 flex flex-col">
        {selectedChannel && user ? (
          <>
            <div className="p-4 border-b border-gray-200 bg-white">
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
