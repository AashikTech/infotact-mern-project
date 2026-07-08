import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { disconnectSocket } from '../lib/socket'
import type { Workspace, Channel } from '../types'

interface SidebarProps {
  workspaces: Workspace[]
  channels: Channel[]
  selectedWorkspace: Workspace | null
  selectedChannel: Channel | null
  connected: boolean
  creating: boolean
  onSelectWorkspace: (ws: Workspace) => void
  onSelectChannel: (ch: Channel) => void
  onCreateWorkspace: (name: string) => Promise<void>
  onJoinWorkspace: (inviteCode: string) => Promise<void>
  onCreateChannel: (name: string, workspaceId: string) => Promise<void>
}

export default function Sidebar({
  workspaces, channels, selectedWorkspace, selectedChannel, connected, creating,
  onSelectWorkspace, onSelectChannel,
  onCreateWorkspace, onJoinWorkspace, onCreateChannel,
}: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showNewWs, setShowNewWs] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [showNewCh, setShowNewCh] = useState(false)
  const [wsName, setWsName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [chName, setChName] = useState('')

  const currentMember = selectedWorkspace?.members.find((m) => m.userId === user?.id)
  const canManageChannels = currentMember?.role === 'owner' || currentMember?.role === 'admin'

  const handleCreateWs = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wsName.trim() || creating) return
    await onCreateWorkspace(wsName)
    setWsName('')
    setShowNewWs(false)
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim() || creating) return
    await onJoinWorkspace(inviteCode)
    setInviteCode('')
    setShowJoin(false)
  }

  const handleCreateCh = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chName.trim() || !selectedWorkspace || creating) return
    await onCreateChannel(chName, selectedWorkspace.id)
    setChName('')
    setShowNewCh(false)
  }

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="font-semibold">{user?.name}</span>
        </div>
        <div className="text-sm text-gray-400">{user?.email}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Workspaces */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">
              Workspaces
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => { setShowNewWs(true); setShowJoin(false) }}
                className="text-xs text-gray-400 hover:text-white"
                title="New workspace"
              >
                +
              </button>
              <button
                onClick={() => { setShowJoin(true); setShowNewWs(false) }}
                className="text-xs text-gray-400 hover:text-white"
                title="Join workspace"
              >
                ↪
              </button>
            </div>
          </div>

          {showNewWs && (
            <form onSubmit={handleCreateWs} className="mb-2">
              <input
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                placeholder="Workspace name"
                className="w-full p-1.5 text-sm text-gray-900 bg-white rounded mb-1"
                autoFocus
                disabled={creating}
              />
              <div className="flex gap-1">
                <button type="submit" disabled={creating} className="text-xs bg-indigo-600 px-2 py-1 rounded disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowNewWs(false)} className="text-xs text-gray-400">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {showJoin && (
            <form onSubmit={handleJoin} className="mb-2">
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Invite code"
                className="w-full p-1.5 text-sm text-gray-900 bg-white rounded mb-1"
                autoFocus
                disabled={creating}
              />
              <div className="flex gap-1">
                <button type="submit" disabled={creating} className="text-xs bg-indigo-600 px-2 py-1 rounded disabled:opacity-50">
                  {creating ? 'Joining...' : 'Join'}
                </button>
                <button type="button" onClick={() => setShowJoin(false)} className="text-xs text-gray-400">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-1">
            {workspaces.map((ws) => {
              const member = ws.members.find((m) => m.userId === user?.id)
              const role = member?.role

              return (
                <button
                  key={ws.id}
                  onClick={() => onSelectWorkspace(ws)}
                  className={`w-full text-left p-2 rounded text-sm transition-colors ${
                    selectedWorkspace?.id === ws.id
                      ? 'bg-indigo-600'
                      : 'hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate"># {ws.name}</span>
                    {role && (
                      <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ml-1 ${
                        role === 'owner' ? 'bg-yellow-600 text-yellow-100' :
                        role === 'admin' ? 'bg-blue-600 text-blue-100' :
                        'bg-gray-600 text-gray-300'
                      }`}>
                        {role}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
            {workspaces.length === 0 && (
              <p className="text-xs text-gray-500">No workspaces yet</p>
            )}
          </div>
        </div>

        {/* Channels */}
        {selectedWorkspace && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">
                Channels
              </h2>
              {canManageChannels && (
                <button
                  onClick={() => setShowNewCh(true)}
                  className="text-xs text-gray-400 hover:text-white"
                  title="New channel"
                >
                  +
                </button>
              )}
            </div>

            {showNewCh && canManageChannels && (
              <form onSubmit={handleCreateCh} className="mb-2">
                <input
                  value={chName}
                  onChange={(e) => setChName(e.target.value)}
                  placeholder="Channel name"
                  className="w-full p-1.5 text-sm text-gray-900 bg-white rounded mb-1"
                  autoFocus
                  disabled={creating}
                />
                <div className="flex gap-1">
                  <button type="submit" disabled={creating} className="text-xs bg-indigo-600 px-2 py-1 rounded disabled:opacity-50">
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                  <button type="button" onClick={() => setShowNewCh(false)} className="text-xs text-gray-400">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-1">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => onSelectChannel(ch)}
                  className={`w-full text-left p-2 rounded text-sm transition-colors ${
                    selectedChannel?.id === ch.id
                      ? 'bg-indigo-600'
                      : 'hover:bg-gray-700'
                  }`}
                >
                  # {ch.name}
                </button>
              ))}
              {channels.length === 0 && (
                <p className="text-xs text-gray-500">No channels yet</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-700">
        <button onClick={() => { disconnectSocket(); logout(); navigate('/login') }} className="text-sm text-gray-400 hover:text-white transition-colors">
          Sign out
        </button>
      </div>
    </div>
  )
}
