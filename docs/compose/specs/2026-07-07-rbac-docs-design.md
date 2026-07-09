# RBAC & Document Collaboration Design

> [!NOTE]
> This document may not reflect the current implementation.
> See the final report for up-to-date state.

## [S1] Problem

The project requirements specify two missing features:
1. **Role-Based Access Control (RBAC)** — Workspace Admin can manage team access and channels
2. **Document Collaboration** — Users can co-edit simple documents in real-time

## [S2] RBAC — Roles & Permissions

Three roles with hierarchical permissions:

| Action | Owner | Admin | Member |
|---|---|---|---|
| Delete workspace | Yes | No | No |
| Update workspace name | Yes | No | No |
| Invite members | Yes | Yes | No |
| Remove members | Yes | Yes | No |
| Create channels | Yes | Yes | No |
| Delete channels | Yes | Yes | No |
| Send messages | Yes | Yes | Yes |
| Create/edit documents | Yes | Yes | Yes |

### [S3] RBAC — Data Model Changes

**Workspace.members** changes from `[ObjectId]` to:
```ts
members: [{
  userId: ObjectId (ref: 'User'),
  role: 'owner' | 'admin' | 'member'
}]
```

Workspace creator automatically gets `role: 'owner'`.
New members joining via invite code get `role: 'member'`.

### [S4] RBAC — Backend Changes

- New middleware `requireRole(roles: string[])` — extracts userId, looks up role in workspace members, checks if role is in allowed list
- Update `requireWorkspaceMember` — use new `members` structure
- Update `workspaceController.ts`:
  - `createWorkspace` — store members as `[{ userId, role: 'owner' }]`
  - `joinByInvite` — add member with `role: 'member'`
  - New: `updateMemberRole` — owner/admin can change roles
  - New: `removeMember` — owner/admin can remove members
- Update `channelController.ts` — channel creation/deletion requires admin or owner role

### [S5] RBAC — Frontend Changes

- Sidebar shows role badge (Owner/Admin/Member) next to workspace name
- Invite modal (Admin/Owner only) with role selector
- Member list with role management (Owner/Admin only)
- Channel create/delete buttons only visible to authorized roles

## [S6] Document Collaboration — Overview

Each workspace has one shared document. All members can edit. Changes sync in real-time via Socket.IO.

### [S7] Document — Data Model

```ts
Document {
  workspaceId: ObjectId (unique, ref: 'Workspace')
  content: String (default: '')
  updatedAt: Date
}
```

One document per workspace, auto-created when workspace is created.

### [S8] Document — Backend Changes

- New model: `Document.ts`
- New routes: `GET /api/docs/:workspaceId`, `PUT /api/docs/:workspaceId`
- Socket events:
  - `doc:update` — client sends content, server broadcasts to workspace
  - `doc:content` — server sends full content to client
- Server debounces saves to MongoDB (every 2 seconds)
- All workspace members can read and edit

### [S9] Document — Frontend Changes

- New component: `DocumentEditor.tsx` — textarea with real-time sync
- New tab/panel in Dashboard: "Document" next to chat
- Socket connection per workspace for document events
- Save indicator: "Saving..." / "Saved"
- Load document on mount, listen for real-time updates
- Auto-save on typing with debounce

## [S10] Error Handling

- RBAC: 403 Forbidden for unauthorized actions with descriptive message
- Document: Socket reconnection handles dropped connections
- Document: Conflict resolution via last-write-wins (simple approach)

## [S11] Testing

- RBAC: Verify owner can delete workspace, member cannot
- RBAC: Verify admin can create channels, member cannot
- Document: Verify typing syncs to other users in real-time
- Document: Verify document persists after page refresh
