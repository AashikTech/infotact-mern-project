# Infotact MERN Internship Project

## Team Members
- Aashik Ahamed
- Gaurav Chaudhari
- Abinaya P
- S S ARUL NIRANJANAA

## Tech Stack
- React
- Node.js
- Express
- MongoDB

## Status
Week 1 Setup Completed
# Weekly Write-up — Infotact Solutions

**Intern:** Aashik
**Project:** Real-Time Collaboration Workspace (MERN Stack)
**Week:** Final Review Week
**Date:** 09 July 2026

---

## Work Completed This Week

### 1. Bug Fix — File Upload (Images & Documents)

**Issue:** Users were unable to upload images and documents in the chat.

**Root Causes Identified:**
- The `uploadFile` function in `api.ts` explicitly set `Content-Type: multipart/form-data` without the multipart boundary, causing multer to fail parsing requests.
- The `content` field in the Message schema had `required: true`, which rejected messages containing only file attachments (empty string content).
- The file input had no `accept` attribute, allowing unsupported file types to be selected.

**Fixes Applied:**
- Removed the explicit `Content-Type` header — Axios sets it automatically with the correct boundary.
- Changed `content` field from `required: true` to `default: ''` in the Message model to allow file-only messages.
- Added `accept` attribute to the file input to restrict to supported MIME types.
- Improved error handling to show server-side error messages instead of generic alerts.

**Files Modified:** `client/src/lib/api.ts`, `server/src/models/Message.ts`, `client/src/components/ChatWindow.tsx`

---

### 2. Feature — Message Reactions

**Requirement:** Add emoji reactions to chat messages so users can react to messages in real-time.

**Implementation:**
- Added `ReactionDoc` sub-schema to the Message model with `emoji` and `userIds` fields.
- Implemented `reaction:add` and `reaction:remove` Socket.IO handlers for real-time sync.
- Built a permanent smiley face button on each message bubble (visible on hover) that opens a quick-react bar with 10 emojis (👍 ❤️ 😂 😮 😢 👎 🔥 👏 🎉 💯).
- Added inline reaction pills below messages showing emoji + count, with highlighting for the current user's reactions.
- Wired up `reaction:update` socket event to broadcast reaction changes to all users in the channel.

**Files Modified:** `server/src/models/Message.ts`, `server/src/sockets/chatHandlers.ts`, `client/src/types/index.ts`, `client/src/components/MessageBubble.tsx`, `client/src/components/ChatWindow.tsx`

---

### 3. Bug Fix — MongoDB Database Configuration

**Issue:** Data was not appearing in the correct MongoDB Atlas database.

**Root Cause:** The `MONGO_URI` in `.env` had no database name specified after the cluster domain, causing MongoDB to default to the `test` database.

**Fix:** Updated `MONGO_URI` to include the database name `infotact`:
```
MONGO_URI=mongodb+srv://...@cluster0.euswdqn.mongodb.net/infotact?appName=Cluster0
```

**File Modified:** `server/.env`

---

### 4. Bug Fix — Paste Handler for Documents

**Issue:** Users could paste images but not documents (PDF, Word, text files).

**Root Cause:** The paste handler in `ChatWindow.tsx` was filtering for `image/*` MIME types only, ignoring all other file types.

**Fix:** Removed the `image/*` filter so the paste handler captures any file from the clipboard.

**File Modified:** `client/src/components/ChatWindow.tsx`

---

## Technical Skills Demonstrated

- **Debugging:** Systematic root cause analysis using the debug skill — traced data flow across client/server, identified multipart boundary issue, Mongoose validation issue, and clipboard handler filter issue.
- **Full-Stack Development:** Modified both Express.js backend and React frontend in TypeScript.
- **Real-Time Features:** Implemented Socket.IO event handlers for reactions with broadcast to channel rooms.
- **Database:** Mongoose schema design with embedded sub-documents (reactions array).

## Current Status

- All features implemented and type-checked (zero TypeScript errors).
- Server running on `localhost:5000`, client on `localhost:5173`.
- MongoDB connected to `infotact` database on Atlas.
- Redis connected for caching and Socket.IO adapter.
