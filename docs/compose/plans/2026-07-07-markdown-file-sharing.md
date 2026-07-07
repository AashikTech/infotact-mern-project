# Markdown Messages & File Sharing Implementation Plan

> [!NOTE]
> This document may not reflect the current implementation.
> See the final report for up-to-date state:
> [Final Report](../reports/markdown-file-sharing.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add markdown rendering for messages and file/image sharing to the collaboration workspace.

**Architecture:** Markdown is purely client-side (react-markdown). File uploads go through a new REST endpoint using multer, stored locally in `uploads/`, with metadata attached to messages via Socket.IO.

**Tech Stack:** react-markdown, remark-gfm, multer, Express static serving

## Global Constraints

- Max file upload size: 10MB
- Max 5 files per message
- Allowed upload types: images (png, jpg, gif, webp), PDFs, common documents
- Files stored in `server/uploads/` directory
- All existing tests must continue passing
- Follow existing code patterns and style

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `client/package.json` | Modify | Add react-markdown, remark-gfm |
| `server/package.json` | Modify | Add multer |
| `client/src/types/index.ts` | Modify | Add Attachment type, update Message type |
| `client/src/components/MessageBubble.tsx` | Modify | Render markdown + attachments |
| `client/src/components/ChatWindow.tsx` | Modify | File upload UI (button, drag-drop, preview) |
| `client/src/lib/api.ts` | Modify | Add uploadFile function |
| `server/src/models/Message.ts` | Modify | Add attachments field |
| `server/src/index.ts` | Modify | Add static file serving for uploads |
| `server/src/routes/messageRoutes.ts` | Modify | Add upload route |
| `server/src/controllers/messageController.ts` | Modify | Add upload controller |
| `server/src/sockets/chatHandlers.ts` | Modify | Handle attachments in chat:message |

---

### Task 1: Install Dependencies

**Covers:** [S3, S4]

**Files:**
- Modify: `client/package.json`
- Modify: `server/package.json`

- [ ] **Step 1: Install client dependencies**

```bash
cd client && npm install react-markdown remark-gfm
```

- [ ] **Step 2: Install server dependencies**

```bash
cd server && npm install multer && npm install -D @types/multer
```

- [ ] **Step 3: Verify installs**

```bash
cd client && npm ls react-markdown remark-gfm
cd server && npm ls multer
```

Expected: All packages listed without errors.

- [ ] **Step 4: Commit**

```bash
git add client/package.json client/package-lock.json server/package.json server/package-lock.json
git commit -m "deps: add react-markdown, remark-gfm, multer"
```

---

### Task 2: Update Types

**Covers:** [S3, S4]

**Files:**
- Modify: `client/src/types/index.ts`

**Interfaces:**
- Produces: `Attachment` type, updated `Message` type with optional `attachments` field

- [ ] **Step 1: Add Attachment type and update Message**

```typescript
// client/src/types/index.ts

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
  members: string[]
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
```

- [ ] **Step 2: Commit**

```bash
git add client/src/types/index.ts
git commit -m "feat: add Attachment type and update Message type"
```

---

### Task 3: Update Message Model (Backend)

**Covers:** [S4]

**Files:**
- Modify: `server/src/models/Message.ts`

**Interfaces:**
- Produces: `attachments` field on MessageDoc for downstream socket handler and controller

- [ ] **Step 1: Add attachments field to Message schema**

```typescript
// server/src/models/Message.ts

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface AttachmentDoc {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
}

export interface MessageDoc extends Document {
  content: string;
  senderId: mongoose.Types.ObjectId;
  channelId: mongoose.Types.ObjectId;
  attachments: AttachmentDoc[];
}

const attachmentSchema = new Schema<AttachmentDoc>(
  {
    url: { type: String, required: true },
    filename: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false }
);

const messageSchema = new Schema<MessageDoc>(
  {
    content: { type: String, required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: true },
    attachments: { type: [attachmentSchema], default: [] },
  },
  { timestamps: true }
);

export const Message: Model<MessageDoc> = mongoose.model<MessageDoc>(
  'Message',
  messageSchema
);
```

- [ ] **Step 2: Commit**

```bash
git add server/src/models/Message.ts
git commit -m "feat: add attachments field to Message model"
```

---

### Task 4: File Upload Endpoint (Backend)

**Covers:** [S4]

**Files:**
- Create: `server/uploads/` directory (gitkeep)
- Modify: `server/src/controllers/messageController.ts`
- Modify: `server/src/routes/messageRoutes.ts`
- Modify: `server/src/index.ts`

**Interfaces:**
- Consumes: `authMiddleware` (existing), `Message` model (updated in Task 3)
- Produces: `POST /api/upload` endpoint returning `{ url, filename, mimetype, size }`

- [ ] **Step 1: Create uploads directory**

```bash
mkdir -p server/uploads
touch server/uploads/.gitkeep
```

- [ ] **Step 2: Add upload controller**

Add to `server/src/controllers/messageController.ts`:

```typescript
import { Request, Response } from 'express';
import { Message } from '../models/Message';
import { cleanMany } from '../utils/transform';
import path from 'path';

export async function getByChannel(req: Request, res: Response) {
  try {
    const { channelId } = req.params;
    const messages = await Message.find({ channelId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name');
    res.json(cleanMany(messages));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function uploadFile(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = req.file;
    const url = `/uploads/${file.filename}`;

    res.json({
      url,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
}
```

- [ ] **Step 3: Add upload route**

Update `server/src/routes/messageRoutes.ts`:

```typescript
import { Router } from 'express';
import { param, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { getByChannel, uploadFile } from '../controllers/messageController';
import { requireChannelWorkspaceMember } from '../middleware/workspaceAuth';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const router = Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/png', 'image/jpeg', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

router.use(authMiddleware);

router.get(
  '/:channelId',
  [param('channelId').isMongoId().withMessage('Invalid channel ID')],
  validate,
  requireChannelWorkspaceMember,
  getByChannel
);

router.post('/upload', upload.single('file'), uploadFile);

export default router;
```

- [ ] **Step 4: Add static file serving**

Update `server/src/index.ts` — add after `app.use(express.json())`:

```typescript
import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import http from 'http';
import path from 'path';
import { config } from './config';
// ... existing imports ...

const app = express();

app.use(cors({ origin: config.clientUrl }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// ... rest unchanged ...
```

- [ ] **Step 5: Update .gitignore**

Add to `server/.gitignore`:

```
uploads/*
!uploads/.gitkeep
```

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/messageController.ts server/src/routes/messageRoutes.ts server/src/index.ts server/uploads/ server/.gitignore
git commit -m "feat: add file upload endpoint with multer"
```

---

### Task 5: Socket Handler — Attachments

**Covers:** [S4]

**Files:**
- Modify: `server/src/sockets/chatHandlers.ts`

**Interfaces:**
- Consumes: Updated `Message` model (Task 3), `clean` util (existing)
- Produces: `chat:message` event now includes `attachments` array in emitted payload

- [ ] **Step 1: Update chat:message handler to accept attachments**

```typescript
// server/src/sockets/chatHandlers.ts

import { Server, Socket } from 'socket.io';
import { Message } from '../models/Message';
import { clean } from '../utils/transform';

export function registerChatHandlers(io: Server, socket: Socket) {
  socket.on('channel:join', (channelId: string) => {
    socket.join(channelId);
    (socket as any).currentChannel = channelId;
    console.log(`🔌 ${(socket as any).userId} joined channel ${channelId}`);
  });

  socket.on('chat:message', async ({ channelId, content, attachments }: {
    channelId: string;
    content: string;
    attachments?: { url: string; filename: string; mimetype: string; size: number }[];
  }) => {
    try {
      const msg = await Message.create({
        content,
        senderId: (socket as any).userId,
        channelId,
        attachments: attachments || [],
      });
      const populated = await msg.populate('senderId', 'name');
      io.to(channelId).emit('chat:message', clean(populated));
    } catch (err) {
      socket.emit('error', { error: 'Failed to send message' });
    }
  });

  socket.on('typing:start', ({ channelId, name }: { channelId: string; name: string }) => {
    socket.to(channelId).emit('typing:start', { name });
  });

  socket.on('typing:stop', ({ channelId }: { channelId: string }) => {
    socket.to(channelId).emit('typing:stop');
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/sockets/chatHandlers.ts
git commit -m "feat: handle attachments in chat:message socket event"
```

---

### Task 6: Markdown Rendering (Frontend)

**Covers:** [S3]

**Files:**
- Modify: `client/src/components/MessageBubble.tsx`

**Interfaces:**
- Consumes: `Message` type (updated in Task 2)
- Produces: Markdown-rendered message content

- [ ] **Step 1: Update MessageBubble to render markdown**

```tsx
// client/src/components/MessageBubble.tsx

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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
        <div className="text-sm prose prose-sm max-w-none prose-p:my-1 prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-code:text-pink-500 prose-code:before:content-none prose-code:after:content-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
        <div className={`text-xs mt-1 ${isOwn ? 'text-indigo-200' : 'text-gray-400'}`}>
          {time}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/MessageBubble.tsx
git commit -m "feat: render messages as markdown with GFM support"
```

---

### Task 7: File Upload UI (Frontend)

**Covers:** [S4]

**Files:**
- Modify: `client/src/lib/api.ts`
- Modify: `client/src/components/ChatWindow.tsx`

**Interfaces:**
- Consumes: `Attachment` type (Task 2), existing socket/API setup
- Produces: `uploadFile` API function, file upload UI in ChatWindow

- [ ] **Step 1: Add uploadFile to API**

Add to `client/src/lib/api.ts`:

```typescript
export const uploadFile = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<Attachment>('/api/messages/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)
}
```

Also update the import at the top:

```typescript
import type { Workspace, Channel, Message, Attachment } from '../types'
```

- [ ] **Step 2: Update ChatWindow with file upload UI**

```tsx
// client/src/components/ChatWindow.tsx

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

    socket.on('chat:message', onMessage)
    socket.on('typing:start', onTypingStart)
    socket.on('typing:stop', onTypingStop)

    return () => {
      socket.off('chat:message', onMessage)
      socket.off('typing:start', onTypingStart)
      socket.off('typing:stop', onTypingStop)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      sendTypingStop()
    }
  }, [channelId, sendTypingStop, socket])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleFiles = (files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, 5) // max 5 files
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

  const send = async (e: React.FormEvent) => {
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
    } catch (err) {
      alert('Failed to upload files. Please try again.')
    } finally {
      setUploading(false)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      sendTypingStop()
    }
  }

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
            <MessageBubble key={msg.id} message={msg} isOwn={senderId === user.id} />
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
                ×
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
          <input
            value={text}
            onChange={(e) => { setText(e.target.value); emitTyping() }}
            placeholder="Type a message... (Markdown supported)"
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
```

- [ ] **Step 3: Commit**

```bash
git add client/src/lib/api.ts client/src/components/ChatWindow.tsx
git commit -m "feat: add file upload UI with drag-and-drop and preview"
```

---

### Task 8: Render Attachments in MessageBubble

**Covers:** [S4]

**Files:**
- Modify: `client/src/components/MessageBubble.tsx`

**Interfaces:**
- Consumes: `Attachment` type (Task 2), `Message` type with optional `attachments`

- [ ] **Step 1: Add attachment rendering to MessageBubble**

```tsx
// client/src/components/MessageBubble.tsx

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '../types'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AttachmentItem({ attachment, isOwn }: { attachment: { url: string; filename: string; mimetype: string; size: number }; isOwn: boolean }) {
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
        <div className={`text-xs mt-1 ${isOwn ? 'text-indigo-200' : 'text-gray-400'}`}>
          {time}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/MessageBubble.tsx
git commit -m "feat: render image previews and file download cards for attachments"
```

---

### Task 9: Verification

**Covers:** [S3, S4, S6]

**Files:** None (verification only)

- [ ] **Step 1: Type check client**

```bash
cd client && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Type check server**

```bash
cd server && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Lint client**

```bash
cd client && npm run lint
```

Expected: No errors.

- [ ] **Step 4: Build client**

```bash
cd client && npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Manual smoke test**

1. Start server: `cd server && npm run dev`
2. Start client: `cd client && npm run dev`
3. Open browser, login, navigate to a channel
4. Type a message with markdown: `**bold** and `code``
5. Verify markdown renders correctly
6. Click paperclip, select an image
7. Verify preview chip appears
8. Send message, verify image renders inline
9. Send a PDF, verify download card appears
10. Drag and drop a file onto chat area, verify drop zone appears

- [ ] **Step 6: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address review feedback for markdown and file sharing"
```
