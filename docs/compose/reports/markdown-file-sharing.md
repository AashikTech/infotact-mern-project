---
feature: markdown-file-sharing
status: delivered
specs:
  - docs/compose/specs/2026-07-07-markdown-file-sharing-design.md
plans:
  - docs/compose/plans/2026-07-07-markdown-file-sharing.md
branch: aashik-feature
commits: pending
---

# Markdown Messages & File Sharing — Final Report

## What Was Built

Two features added to the collaboration workspace:

1. **Markdown messages** — Chat messages now render as GitHub-Flavored Markdown. Users can write bold, italic, code blocks, lists, links, and tables directly in their messages. The input field is a textarea supporting multi-line content.

2. **File & image sharing** — Users can upload files via a paperclip button or drag-and-drop. Images render inline as previews; other files appear as downloadable cards with filename and size. Files are stored locally in `server/uploads/` and served as static assets.

## Architecture

### Markdown Rendering (Client-only)

- `react-markdown` + `remark-gfm` parse message content into rendered HTML
- `MessageBubble.tsx` wraps content in `<ReactMarkdown>` with Tailwind prose classes
- No backend changes — the `content` field remains a plain string

### File Upload Flow

```
User selects/drops file
  → ChatWindow shows preview chip
  → On send: POST /api/messages/upload (multer)
  → Server saves to uploads/<timestamp>-<random>.<ext>
  → Returns { url, filename, mimetype, size }
  → Socket emits chat:message with attachments array
  → Message saved to MongoDB with attachments subdocument
  → All clients receive and render the message
```

### Key Files

| File | Change |
|---|---|
| `client/src/types/index.ts` | Added `Attachment` interface, updated `Message` type |
| `client/src/components/MessageBubble.tsx` | Markdown rendering + attachment display |
| `client/src/components/ChatWindow.tsx` | File upload UI (button, drag-drop, preview) |
| `client/src/lib/api.ts` | Added `uploadFile()` function |
| `server/src/models/Message.ts` | Added `attachments` subdocument schema |
| `server/src/controllers/messageController.ts` | Added `uploadFile` handler |
| `server/src/routes/messageRoutes.ts` | Added `POST /upload` route with multer config |
| `server/src/sockets/chatHandlers.ts` | Updated `chat:message` to accept attachments |
| `server/src/index.ts` | Added static file serving for `/uploads` |

### Design Decisions

- **Local filesystem over cloud storage** — Simpler for demo/learning; no external service dependencies. Can be swapped to S3/Cloudinary by changing the multer storage adapter.
- **Multer disk storage** — Files saved with timestamp + random hex filename to prevent collisions and overwrites.
- **10MB limit, 5 files max** — Reasonable defaults for a chat application. Enforced server-side via multer limits.
- **Attachments as subdocument** — Stored inline on the Message document (not a separate collection) since attachments are always fetched with their message.

## Usage

### Sending Markdown

Type markdown directly in the message input:
- `**bold**` → **bold**
- `*italic*` → *italic*
- `` `code` `` → `code`
- Triple backticks for code blocks
- `- item` for lists
- `[text](url)` for links

### Sending Files

1. Click the paperclip icon to open file picker, OR
2. Drag files onto the chat area (drop zone appears)
3. Preview chips show selected files with size
4. Click "x" to remove a file before sending
5. Click "Send" — files upload then message sends

### Supported File Types

- Images: PNG, JPG, GIF, WebP (rendered inline)
- Documents: PDF, DOC, DOCX, TXT (download card)

## Verification

- TypeScript: `tsc --noEmit` passes on both client and server
- Lint: `oxlint` passes (1 pre-existing warning in AuthContext, unrelated)
- Build: `vite build` succeeds,产出 494KB JS bundle
- Manual testing required: start server + client, login, send markdown message, upload image, upload PDF, verify drag-and-drop

## Journey Log

- [lesson] Tailwind prose classes need `prose-code:before:content-none prose-code:after:content-none` to remove backtick decorations in inline code
- [lesson] multer `diskStorage` destination path must be relative to compiled output (`../../uploads` from routes file), not source directory
