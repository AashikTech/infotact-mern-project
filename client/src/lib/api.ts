import axios from 'axios'
import type { Workspace, Channel, Message, Attachment, WorkspaceDocument } from '../types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const getWorkspaces = () =>
  api.get<Workspace[]>('/api/workspaces').then((r) => r.data)

export const createWorkspace = (name: string) =>
  api.post<Workspace>('/api/workspaces', { name }).then((r) => r.data)

export const joinWorkspace = (inviteCode: string) =>
  api.post<Workspace>('/api/workspaces/join', { inviteCode }).then((r) => r.data)

export const getChannels = (workspaceId: string) =>
  api.get<Channel[]>(`/api/channels/workspace/${workspaceId}`).then((r) => r.data)

export const createChannel = (name: string, workspaceId: string) =>
  api.post<Channel>('/api/channels', { name, workspaceId }).then((r) => r.data)

export const getMessages = (channelId: string) =>
  api.get<Message[]>(`/api/messages/${channelId}`).then((r) => r.data)

export const uploadFile = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<Attachment>('/api/messages/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)
}

export const getDocument = (workspaceId: string) =>
  api.get<WorkspaceDocument>(`/api/docs/${workspaceId}`).then((r) => r.data)

export const updateDocument = (workspaceId: string, content: string) =>
  api.put<WorkspaceDocument>(`/api/docs/${workspaceId}`, { content }).then((r) => r.data)
