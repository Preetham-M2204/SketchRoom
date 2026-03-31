# SketchRoom Learning Schema

For a full function-by-function and file-by-file backend study guide, see:

- BACKEND_LEARNING_GUIDE.md

This file is a learning-first reference for your current backend design.
It is intentionally practical and not production-perfect yet.

## 1. Current Data Schema (Implemented)

### 1.1 User
Collection: users

Fields:
- _id: ObjectId
- name: String (1 to 80 chars)
- email: String (unique, lowercase, indexed)
- passwordHash: String
- createdAt: Date
- updatedAt: Date

Notes:
- Passwords are never stored directly.
- comparePassword(password) checks bcrypt hash.

### 1.2 Room
Collection: rooms

Core fields:
- _id: ObjectId
- name: String (1 to 120 chars)
- topic: String (0 to 300 chars)
- mode: String enum [decision, meeting, gd, canvas]
- access: String enum [public, private]
- inviteCode: String (6 chars, unique, indexed)
- owner: ObjectId ref User (indexed)
- members: ObjectId[] ref User
- createdAt: Date
- updatedAt: Date

Embedded mode state:
- canvas:
  - boardTitle: string
  - viewport: { x: number, y: number, zoom: number }
  - lastEditedBy: string | null
  - lastEditedAt: Date | null
- decision:
  - phase: brainstorm | voting | analysis
  - items: [{ id, text, type, votes: string[], createdBy }]
  - analysis: string | null
- meeting:
  - presenter: string | null
  - agenda: [{ id, title, duration, completed }]
  - handQueue: string[]
  - currentAgendaIndex: number
  - isViewportSynced: boolean
- gd:
  - currentSpeakerIndex: number
  - speakers: [{ userId, name, timeRemaining, hasSpoken }]
  - scores: object
  - isActive: boolean
  - summary: string | null

### 1.3 Stroke
Collection: strokes

Fields:
- _id: ObjectId
- room: ObjectId ref Room (indexed)
- strokeId: String
- userId: String
- tool: pen | eraser | line | rectangle | circle
- points: [{ x: number, y: number }]
- color: String
- width: Number
- timestamp: Number (indexed)
- createdAt: Date
- updatedAt: Date

Indexes:
- unique: (room, strokeId)
- query index: (room, timestamp)

Purpose:
- Supports canvas replay when late users join.

### 1.4 RoomMembership (Hybrid ACL Layer)
Collection: roommemberships

Fields:
- _id: ObjectId
- room: ObjectId ref Room (indexed)
- user: ObjectId ref User (indexed)
- role: owner | moderator | member | viewer
- status: active | removed | banned
- invitedBy: ObjectId ref User | null
- createdAt: Date
- updatedAt: Date

Indexes:
- unique: (room, user)
- query index: (user, status)

How it is currently used:
- create room: owner membership is upserted
- join by invite code: member membership is upserted/activated
- get rooms: includes active memberships
- delete room: memberships for that room are deleted

## 2. Current Access Schema (Implemented)

Room access model:
- public room: any authenticated user can access
- private room: only owner or active RoomMembership can access

Role model currently in behavior:
- Owner (room.owner)
- Member (inside room.members)
- Membership roles (roommemberships.role): owner | moderator | member | viewer

Hybrid note:
- rooms.members is still maintained for backward compatibility.
- Access checks now use RoomMembership-first policy in room APIs and socket room-join guards.
- Legacy members[] data is auto-mirrored into RoomMembership during room listing.

Realtime authorization currently enforced:
- Owner-or-moderator:
  - draw:clear-canvas
  - decision:set-phase
  - meeting:set-presenter
  - gd:start-round
  - gd:next-speaker
  - gd:submit-score
- Presenter-or-privileged:
  - meeting:set-agenda
  - meeting:next-agenda
  - meeting:sync-viewport
- General members:
  - draw/chat/cursor/presence and most collaborative actions

Role assignment API:
- PATCH /api/rooms/:roomId/members/:userId/role
- Owner can set:
  - role: moderator | member | viewer
  - status: active | removed | banned

Invite visibility rule (host-only invite control):
- inviteCode is only included in room payloads for the room owner.
- non-owners receive room data without inviteCode so only host can invite guests from app UI.

## 3. Recommended Next Learning Schema (Partially Implemented)

If later you need stronger ACL and cleaner audits, add separate collections:

### 3.1 RoomMembership
Fields:
- _id: ObjectId
- roomId: ObjectId
- userId: ObjectId
- role: owner | moderator | member | viewer
- status: active | removed | banned
- invitedBy: ObjectId | null
- createdAt: Date
- updatedAt: Date

Benefits:
- Better per-user room permissions.
- Easier revoke/ban and audit trails.

Current status:
- Basic model and create/join/list/delete integration done.
- Core room access and key realtime moderation actions now use RoomMembership role/status.

### 3.2 RoomInvite
Fields:
- _id: ObjectId
- roomId: ObjectId
- inviteCodeHash: String
- createdBy: ObjectId
- expiresAt: Date | null
- maxUses: Number
- usedCount: Number
- revokedAt: Date | null
- createdAt: Date

Benefits:
- Invite lifecycle and revocation.
- Usage limits and expiry.

## 4. LAN Multi-User Learning Checklist (Current Priority)

For same Wi-Fi testing:
1. Start backend on host 0.0.0.0 and port 5000.
2. Start frontend Vite with host enabled.
3. Open app from another device using your PC LAN IP, for example:
   - http://192.168.x.x:5173
4. Ensure firewall allows Node on private network.
5. Keep one backend dev process only to avoid port conflicts.

Hotspot note:
- Yes, users on your personal hotspot can join if they can reach your host IP and firewall allows it.

## 5. Security Learning Checklist (Simple Version)

Use this as your minimum standard while learning:
1. Validate all REST and socket payloads.
2. Authenticate once and authorize per room action.
3. Never trust roomId from client without membership check.
4. Keep JWT secret out of source code.
5. Rate-limit auth and join endpoints.
6. Log important access-denied events.
7. Remove wildcard CORS in production.

## 6. Example Rule: "Person A only in Room B"

Current simple approach:
1. Create room B as private.
2. Keep Person A in room.members for room B.
3. Do not add Person A in other private room members arrays.
4. Backend access checks will deny private rooms where membership is missing.

Current robust approach (in progress):
- Keep room.members in sync for compatibility.
- Access checks are now migrated to RoomMembership for core room API + socket entry points.
- Remaining evolution: extend membership-role checks deeper into all realtime actions.

## 7. Canvas Phase 1 Contracts (Implemented)

Goal achieved in this phase:
- Single user canvas state survives refresh/reconnect/re-entry through REST state fetch + persisted strokes.

REST endpoints added:
1. GET /api/rooms/:roomId/canvas/state
   - Access: any allowed room user
   - Returns:
     - state.roomId
     - state.boardTitle
     - state.viewport
     - state.strokeCount
     - state.lastUpdated
     - state.lastEditedBy
     - state.strokes[]
2. PATCH /api/rooms/:roomId/canvas/meta
   - Access: owner or moderator
   - Body: { boardTitle?, viewport? }
   - Updates: board title/viewport + lastEditedBy/lastEditedAt
3. POST /api/rooms/:roomId/canvas/clear
   - Access: owner only
   - Clears all strokes and updates lastEditedBy/lastEditedAt

Socket hardening added:
- draw:stroke
  - max points per stroke: 2000
  - max payload size: 180KB
  - supports tool-aware strokes: pen, eraser, line, rectangle, circle
  - updates room.canvas.lastEditedBy and room.canvas.lastEditedAt
- draw:undo-stroke
  - updates room.canvas.lastEditedBy and room.canvas.lastEditedAt
- draw:clear-canvas
  - restricted to owner or moderator in realtime
  - updates room.canvas.lastEditedBy and room.canvas.lastEditedAt

Smoke test script added:
- npm run smoke:canvas-phase1
- Script flow:
  1. signup
  2. create canvas room
  3. join room via socket
  4. draw 2 strokes
  5. verify state endpoint
  6. undo 1 stroke
  7. verify state endpoint
  8. clear canvas
  9. verify state endpoint

---
Use this file as your quick backend map while you build features phase by phase.
