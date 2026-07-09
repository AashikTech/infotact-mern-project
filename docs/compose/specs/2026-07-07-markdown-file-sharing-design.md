# Markdown Messages & File Sharing

> [!NOTE]
> This document may not reflect the current implementation.
> See the final report for up-to-date state:
> [Final Report](../reports/markdown-file-sharing.md)

## [S1] Problem

The current chat system sends and renders plain text only. Users expect rich formatting (bold, code, links) and the ability to share files/images — standard features in any collaboration tool.

## [S2] Solution Overview

Two features added together:

1. **Markdown rendering** — parse message content as GitHub-Flavored Markdown (GFM) on the client. No backend changes.
2. **File & image sharing** — upload files via a new REST endpoint, store locally in `uploads/`, attach metadata to messages, render images inline and other files as download links.

## [S3] Markdown Messages

- Replace `<input>` in ChatWindow with `<textarea>` for multi-line support
- Add `react-markdown` + `remark-gfm` + `rehype-raw` (disabled for XSS safety)
- Render `message.content` through `<ReactMarkdown>` in MessageBubble
- Apply Tailwind prose classes for markdown styling
- No backend changes — `content` field stays a string

### Supported syntax
- Bold (`**text**`), italic (`*text*`), strikethrough (`~~text~~`)
- Inline code (`code`), code blocks (``` fenced)
- Links, images (via markdown syntax)
- Lists (ordered, unordered), task lists
- Blockquotes

## [S4] File & Image Sharing

### Backend

- **New dependency:** `multer` for multipart form handling
- **New route:** `POST /api/upload` — accepts multipart form with `file` field
  - Validates: max 10MB, allowed mimetypes (images, PDFs, common docs)
  - Saves to `uploads/<timestamp>-<random>.<ext>`
  - Returns `{ url, filename, mimetype, size }`
  - Protected by `authMiddleware`
- **Static serving:** `app.use('/uploads', express.static('uploads'))`
- **Message model update:** Add `attachments` array field:
  ```ts
  attachments: [{
    url: string,
    filename: string,
    mimetype: string,
    size: number
  }]
  ```
- **Socket handler update:** `chat:message` accepts optional `attachments` array, stores with message

### Frontend

- **New dependency:** none (native `fetch` + `FormData` for upload)
- **ChatWindow changes:**
  - Add paperclip button to open file picker
  - Add drag-and-drop zone on the chat area
  - Show selected files as preview chips before sending
  - On send: upload files first, then emit socket message with attachment metadata
- **MessageBubble changes:**
  - Image attachments render as `<img>` with click-to-expand
  - Other attachments render as download cards (icon + filename + human-readable size)
- **Types update:** Add `Attachment` interface, add `attachments?` to `Message`

### File constraints
- Max 10MB per file
- Max 5 files per message
- Allowed types: images (png, jpg, gif, webp), PDFs, common document types
- Files served from `/uploads/` path

## [S5] Error Handling

- Upload failures show toast/alert to user
- Invalid file type/size rejected server-side with descriptive error
- Socket message send failure already handled (existing error event)

## [S6] Testing

- Verify markdown renders correctly (bold, code blocks, links)
- Verify file upload → message creation → display flow
- Verify image inline preview
- Verify file download link works
- Verify drag-and-drop upload
