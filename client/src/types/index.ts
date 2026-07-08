export type MemberRole = 'owner' | 'admin' | 'member'

export interface WorkspaceMember {
  userId: string
  role: MemberRole
}

export interface Attachment {
  url: string
  filename: string
  mimetype: string
  size: number
}

export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

export interface Workspace {
  id: string
  name: string
  inviteCode: string
  members: WorkspaceMember[]
}

export interface Channel {
  id: string
  name: string
  workspaceId: string
}

export interface Message {
  id: string
  content: string
  senderId: string | { id: string; name: string }
  channelId: string
  attachments?: Attachment[]
  createdAt: string
}

export interface WorkspaceDocument {
  id: string
  workspaceId: string
  content: string
  updatedAt: string
}
