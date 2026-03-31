# Canvas Backend Plan

## Goal
Build backend support in a learning-first order so each room mode works well for one user first, then expand to multi-user collaboration.

Priority now:
1. Canvas single-user reliability
2. Decision room single-user flow
3. Meeting room single-user flow
4. GD room single-user flow
5. After all above are stable, move to multi-user hardening and UI admin controls

## Current Baseline (Already Available)
- Auth APIs (signup/login)
- Room create/list/get/delete and join by invite
- RoomMembership model with role and status
- Socket server and room events for all 4 modes
- Stroke persistence for canvas events

## Roadmap From Here

### Phase 1: Stabilize single-user Canvas (first target)
Status:
- Completed on 2026-03-30 (REST endpoints + socket guardrails + smoke test)

Objective:
- A user should always see their own drawing state after reload, reconnect, or re-entering room.

Backend tasks:
1. Add REST-friendly canvas state fetch endpoint contract (if needed beyond current strokes endpoint):
   - GET /api/rooms/:roomId/canvas/state
   - Return ordered strokes plus simple metadata (strokeCount, lastUpdated)
2. Add canvas save checkpoints (optional learning step):
   - PATCH /api/rooms/:roomId/canvas/meta
   - Save board title, viewport defaults, lastEditedBy
3. Enforce stroke size/data guardrails:
   - max points per stroke
   - max payload size per draw event
4. Add cleanup utility endpoint for owner:
   - POST /api/rooms/:roomId/canvas/clear
5. Add simple canvas smoke tests:
   - draw stroke, reload, fetch state, undo, clear

Done criteria:
- Single user can draw, refresh, and still get full board history every time.

### Phase 2: Decision room single-user completion
Objective:
- One user can run the full decision workflow end-to-end without real-time peers.

Backend tasks:
1. Add decision REST state endpoint:
   - GET /api/rooms/:roomId/decision/state
2. Add decision REST mutations (parallel to socket events):
   - PATCH /api/rooms/:roomId/decision/phase
   - POST /api/rooms/:roomId/decision/items
   - DELETE /api/rooms/:roomId/decision/items/:itemId
   - POST /api/rooms/:roomId/decision/items/:itemId/vote
3. Add idempotency for vote-by-user to prevent duplicate voting.
4. Store and return decision analysis text in room state.

Done criteria:
- Brainstorm -> voting -> analysis works for one user entirely via backend state.

### Phase 3: Meeting room single-user completion
Objective:
- One user can use agenda and presenter controls and see state restored on refresh.

Backend tasks:
1. Add meeting REST state endpoint:
   - GET /api/rooms/:roomId/meeting/state
2. Add meeting REST mutations:
   - PATCH /api/rooms/:roomId/meeting/presenter
   - PUT /api/rooms/:roomId/meeting/agenda
   - PATCH /api/rooms/:roomId/meeting/agenda/index
   - PATCH /api/rooms/:roomId/meeting/viewport
3. Persist handQueue and presenter reliably.
4. Add permission checks for owner/moderator/presenter actions.

Done criteria:
- User can manage agenda and presenter settings, refresh, and continue without data loss.

### Phase 4: GD room single-user completion
Objective:
- One user can run a full GD cycle with speakers, scores, and final summary.

Backend tasks:
1. Add GD REST state endpoint:
   - GET /api/rooms/:roomId/gd/state
2. Add GD REST mutations:
   - POST /api/rooms/:roomId/gd/start
   - PATCH /api/rooms/:roomId/gd/next-speaker
   - POST /api/rooms/:roomId/gd/scores/:speakerUserId
   - POST /api/rooms/:roomId/gd/end
3. Persist timer-relevant state for safe resume.
4. Save final summary and score map in room.gd.

Done criteria:
- Full start -> score -> summary flow works for one user and survives reload.

### Phase 5: API consistency and validation pass
Objective:
- Keep mode APIs predictable and easy to learn.

Backend tasks:
1. Standardize response shape for all mode endpoints:
   - { message?, state?, room? }
2. Add consistent error envelope:
   - { message, code?, details? }
3. Add Zod request validation for all new mode endpoints.
4. Add role/status checks using RoomMembership.

Done criteria:
- Every endpoint follows a consistent request/response contract.

### Phase 6: Prepare for multi-user after single-user success
Objective:
- Move from stable single-user to stable shared collaboration.

Backend tasks:
1. Keep socket events as sync layer, REST as source of truth fallback.
2. Add event ack patterns for critical actions.
3. Add limited rate controls for high-frequency events.
4. Add room member admin endpoints:
   - list members
   - change role
   - remove/ban/unban

Done criteria:
- Multi-user rollout starts on top of reliable single-user mode state.

## Suggested Execution Order (strict)
1. Canvas phase
2. Decision phase
3. Meeting phase
4. GD phase
5. Consistency pass
6. Multi-user hardening

## What We Start Next (Immediate)
Step 2 implementation target:
- Decision REST state endpoint and core single-user decision mutations

## Learning Notes
- Keep REST endpoints for deterministic single-user state testing.
- Use sockets mainly for live collaboration layer.
- This order reduces debugging complexity and gives visible progress after each phase.
