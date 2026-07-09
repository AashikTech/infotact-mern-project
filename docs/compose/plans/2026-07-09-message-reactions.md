# Message Reactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add emoji reactions to chat messages — users hover a message to see a quick-react bar of 10 emojis, click to toggle, and see inline reaction pills with counts below messages.

**Architecture:** Add a `reactions` sub-schema to the Message model. Socket events `reaction:add` / `reaction:remove` / `reaction:update` handle real-time sync. Client renders a hover-triggered emoji bar and inline reaction pills on each message bubble.

**Tech Stack:** Mongoose (schema), Socket.IO (real-time), React + Tailwind (UI)

## Global Constraints

- TypeScript strict mode for both server and client
- Follow existing codebase patterns (controllers, socket handlers, component structure)
- Reactions are real-time only — no REST endpoints
- No new npm dependencies required

---

## File Structure

| Action | File | Purpose |
|--------|------|---------|
| Modify | `server/src/models/Message.ts` | Add reactions sub-schema |
| Modify | `server/src/sockets/chatHandlers.ts` | Add reaction socket handlers |
| Modify | `client/src/types/index.ts` | Add Reaction type |
| Modify | `client/src/components/MessageBubble.tsx` | Render reaction pills + quick-react bar |
| Modify | `client/src/components/ChatWindow.tsx` | Handle reaction socket events in state |

---

### Task 1: Update Message model with reactions sub-schema

**Covers:** Data model for reactions

**Files:**
- Modify: `server/src/models/Message.ts`

**Interfaces:**
- Produces: `ReactionDoc` interface with `{emoji: string, userIds: ObjectId[]}`, added to `MessageDoc.reactions`

- [ ] **Step 1: Add ReactionDoc interface and sub-schema**

Add to `server/src/models/Message.ts` after the existing `AttachmentDoc` interface:

```typescript
export interface ReactionDoc {
  emoji: string;
  userIds: mongoose.Types.ObjectId[];
}
```

- [ ] **Step 2: Add reactionSchema and embed in messageSchema**

Add after the `attachmentSchema`:

```typescript
const reactionSchema = new Schema<ReactionDoc>(
  {
    emoji: { type: String, required: true },
    userIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false }
);
```

Add `reactions` field to `messageSchema`:

```typescript
const messageSchema = new Schema<MessageDoc>(
  {
    content: { type: String, default: '' },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: true },
    attachments: { type: [attachmentSchema], default: [] },
    reactions: { type: [reactionSchema], default: [] },
  },
  { timestamps: true }
);
```

Also add `reactions` to `MessageDoc` interface:

```typescript
export interface MessageDoc extends Document {
  content: string;
  senderId: mongoose.Types.ObjectId;
  channelId: mongoose.Types.ObjectId;
  attachments: AttachmentDoc[];
  reactions: ReactionDoc[];
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` in `server/`
Expected: No errors

---

### Task 2: Add reaction socket handlers

**Covers:** Server-side real-time reaction logic

**Files:**
- Modify: `server/src/sockets/chatHandlers.ts`

**Interfaces:**
- Consumes: `MessageDoc.reactions` from Task 1
- Produces: Socket events `reaction:add`, `reaction:remove`, `reaction:update` broadcast to channel

- [ ] **Step 1: Add reaction:add handler**

Add inside `registerChatHandlers` in `server/src/sockets/chatHandlers.ts`, after the existing `chat:message` handler:

```typescript
socket.on('reaction:add', async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
  try {
    const userId = (socket as any).userId;
    const msg = await Message.findById(messageId);
    if (!msg) return;

    const existing = msg.reactions.find((r) => r.emoji === emoji);
    if (existing) {
      if (!existing.userIds.some((id) => id.toString() === userId)) {
        existing.userIds.push(new (mongoose.Types.ObjectId)(userId));
      }
    } else {
      msg.reactions.push({ emoji, userIds: [new (mongoose.Types.ObjectId)(userId)] });
    }
    await msg.save();

    io.to(msg.channelId.toString()).emit('reaction:update', {
      messageId,
      reactions: msg.reactions,
    });
  } catch (err) {
    console.error('reaction:add error:', err);
  }
});
```

- [ ] **Step 2: Add reaction:remove handler**

Add after the `reaction:add` handler:

```typescript
socket.on('reaction:remove', async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
  try {
    const userId = (socket as any).userId;
    const msg = await Message.findById(messageId);
    if (!msg) return;

    const reaction = msg.reactions.find((r) => r.emoji === emoji);
    if (reaction) {
      reaction.userIds = reaction.userIds.filter((id) => id.toString() !== userId);
      if (reaction.userIds.length === 0) {
        msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji);
      }
    }
    await msg.save();

    io.to(msg.channelId.toString()).emit('reaction:update', {
      messageId,
      reactions: msg.reactions,
    });
  } catch (err) {
    console.error('reaction:remove error:', err);
  }
});
```

- [ ] **Step 3: Add mongoose import**

Add `import mongoose from 'mongoose';` at the top of `server/src/sockets/chatHandlers.ts` (if not already present).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit` in `server/`
Expected: No errors

---

### Task 3: Add client types

**Covers:** Client-side type definitions for reactions

**Files:**
- Modify: `client/src/types/index.ts`

**Interfaces:**
- Produces: `Reaction` type `{emoji: string, userIds: string[]}`

- [ ] **Step 1: Add Reaction type and update Message type**

Add to `client/src/types/index.ts`:

```typescript
export interface Reaction {
  emoji: string
  userIds: string[]
}
```

Update the `Message` interface to include reactions:

```typescript
export interface Message {
  id: string
  content: string
  senderId: string | { id: string; name: string }
  channelId: string
  attachments?: Attachment[]
  reactions?: Reaction[]
  createdAt: string
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` in `client/`
Expected: No errors

---

### Task 4: Update MessageBubble with reaction pills and quick-react bar

**Covers:** UI for displaying and adding reactions

**Files:**
- Modify: `client/src/components/MessageBubble.tsx`

**Interfaces:**
- Consumes: `Reaction` type from Task 3
- Produces: `onReaction(messageId, emoji)` callback prop

- [ ] **Step 1: Update MessageBubbleProps and add reaction bar state**

Replace the existing props interface and add state:

```typescript
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '👎', '🔥', '👏', '🎉', '💯']

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  onReaction: (messageId: string, emoji: string) => void
}
```

Add `useState` for hover state inside the component:

```typescript
const [showReactBar, setShowReactBar] = useState(false)
```

Import `useState` at the top.

- [ ] **Step 2: Add reaction pills rendering**

After the `{message.attachments && ...}` block and before the timestamp `<div>`, add:

```typescript
{message.reactions && message.reactions.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1">
    {message.reactions.map((reaction) => (
      <button
        key={reaction.emoji}
        onClick={() => onReaction(message.id, reaction.emoji)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
          reaction.userIds.includes(/* current user id - pass as prop */)
            ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
            : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
        }`}
      >
        <span>{reaction.emoji}</span>
        <span>{reaction.userIds.length}</span>
      </button>
    ))}
  </div>
)}
```

- [ ] **Step 3: Add quick-react bar on hover**

Wrap the message bubble `<div>` with a container that tracks hover:

```tsx
<div
  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
  onMouseEnter={() => setShowReactBar(true)}
  onMouseLeave={() => setShowReactBar(false)}
>
  <div className="relative">
    {showReactBar && (
      <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} -top-8 flex gap-0.5 bg-white rounded-lg shadow-lg border border-gray-200 px-1 py-0.5 z-20`}>
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onReaction(message.id, emoji)}
            className="hover:bg-gray-100 rounded p-0.5 text-sm transition-colors"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    )}
    <div
      className={`max-w-[70%] p-3 rounded-lg ${
        isOwn ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'
      }`}
    >
      {/* existing message content, attachments, reactions, timestamp */}
    </div>
  </div>
</div>
```

- [ ] **Step 4: Update senderName to handle currentUserId for reaction highlighting**

Pass `currentUserId` as a prop:

```typescript
interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  currentUserId: string
  onReaction: (messageId: string, emoji: string) => void
}
```

Use `currentUserId` in the reaction pill class to highlight the user's own reactions.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit` in `client/`
Expected: No errors

---

### Task 5: Wire up reactions in ChatWindow

**Covers:** Real-time reaction state management

**Files:**
- Modify: `client/src/components/ChatWindow.tsx`

**Interfaces:**
- Consumes: `reaction:update` socket event, `onReaction` callback from MessageBubble
- Produces: Updated messages state with reactions

- [ ] **Step 1: Add reaction socket listener**

Inside the `useEffect` that sets up socket listeners, add:

```typescript
const onReactionUpdate = ({ messageId, reactions }: { messageId: string; reactions: any[] }) => {
  setMessages((prev) =>
    prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
  )
}

socket.on('reaction:update', onReactionUpdate)
```

And add cleanup:

```typescript
socket.off('reaction:update', onReactionUpdate)
```

- [ ] **Step 2: Add onReaction handler**

Add a callback function:

```typescript
const handleReaction = useCallback((messageId: string, emoji: string) => {
  const msg = messages.find((m) => m.id === messageId)
  if (!msg) return

  const existing = msg.reactions?.find((r) => r.emoji === emoji)
  const hasReacted = existing?.userIds.includes(user.id)

  if (hasReacted) {
    socket.emit('reaction:remove', { messageId, emoji })
  } else {
    socket.emit('reaction:add', { messageId, emoji })
  }
}, [messages, user.id, socket])
```

- [ ] **Step 3: Pass props to MessageBubble**

Update the MessageBubble rendering to pass the new props:

```tsx
<MessageBubble
  key={msg.id}
  message={msg}
  isOwn={senderId === user.id}
  currentUserId={user.id}
  onReaction={handleReaction}
/>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit` in `client/`
Expected: No errors

---

### Task 6: Verify end-to-end

- [ ] **Step 1: Start both server and client**

Run server: `npm run dev` in `server/`
Run client: `npm run dev` in `client/`

- [ ] **Step 2: Test reaction flow**

1. Open two browser windows logged in as different users
2. Send a message from user A
3. Hover over the message → quick-react bar should appear
4. Click an emoji → reaction pill should appear below the message for both users
5. Click the same emoji again → reaction should be removed
6. Different user reacts → pill updates for both users

- [ ] **Step 3: Run typechecks one final time**

Run: `npx tsc --noEmit` in both `server/` and `client/`
Expected: No errors in either
