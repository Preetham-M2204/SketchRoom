# SketchRoom Backend Learning Guide

This is a full study guide for the backend implementation currently in this repo.
It is organized to help you learn:

1. What each backend file does
2. Which libraries are used and where
3. Every named function and exported handler
4. API routes and socket events
5. A practical way to study and verify everything

---

## 1. What Is In This Backend

Backend style:

- Node.js + Express REST API
- Socket.IO realtime layer
- MongoDB with Mongoose models
- JWT auth
- Zod request/payload validation

Main entry:

- `src/server.js` boots DB + HTTP server + Socket server
- `src/app.js` configures Express middleware and routes

---

## 2. Libraries Used (With Where + Why)

### Core dependencies

1. `express`
- Why: REST server and routing
- Where: `src/app.js`, all route files in `src/routes/*`

2. `socket.io`
- Why: realtime collaboration events
- Where: `src/sockets/index.js`

3. `mongoose`
- Why: MongoDB connection + schema models
- Where: `src/config/db.js`, `src/models/*`

4. `jsonwebtoken`
- Why: sign/verify JWT access tokens
- Where: `src/services/jwt.js`

5. `bcryptjs`
- Why: password hashing and comparison
- Where: `src/controllers/authController.js`, `src/models/User.js`

6. `zod`
- Why: payload validation for REST and sockets
- Where: `src/routes/authRoutes.js`, `src/routes/roomRoutes.js`, `src/routes/aiRoutes.js`, `src/middleware/errorHandler.js`, `src/sockets/index.js`

7. `cors`
- Why: cross-origin request policy
- Where: `src/app.js`

8. `helmet`
- Why: security headers
- Where: `src/app.js`

9. `morgan`
- Why: request logging
- Where: `src/app.js`

10. `dotenv`
- Why: env var loading
- Where: `src/config/env.js`

11. `nanoid`
- Why: lightweight unique IDs
- Where: `src/controllers/roomController.js`, `src/sockets/index.js`

### Dev dependencies

1. `nodemon`
- Why: restart backend automatically in dev
- Where used via script: `npm run dev`

2. `socket.io-client`
- Why: smoke test script simulates realtime client
- Where: `scripts/canvasPhase1Smoke.mjs`

### Node built-in modules

1. `http`
- Why: create HTTP server to attach Socket.IO
- Where: `src/server.js`

2. Global `fetch` (Node runtime)
- Why: REST calls in smoke script
- Where: `scripts/canvasPhase1Smoke.mjs`

---

## 3. Scripts You Can Run

From `package.json`:

1. `npm run dev`
- Runs backend with nodemon

2. `npm start`
- Runs backend once with node

3. `npm run smoke:canvas-phase1`
- Runs end-to-end canvas smoke flow

---

## 4. Full File-by-File Study Map (Functions Included)

## `src/server.js`

Purpose:

- Backend bootstrap and graceful shutdown lifecycle.

Named functions:

1. `bootstrap()`
- Connects DB
- Creates HTTP server
- Attaches socket server
- Installs signal/error handlers
- Starts listening

2. `shutdown({ signal, exitCode, restart })` (inner)
- Graceful stop logic

3. `finish()` (inner)
- Disconnect DB, then exit or restart

Other important behavior:

- Handles `EADDRINUSE`
- Handles `SIGINT`, `SIGTERM`, `SIGUSR2`

## `src/app.js`

Purpose:

- Express app setup and middleware chain.

Key setup:

- CORS via `corsOriginHandler`
- Helmet security headers
- JSON body parser
- Morgan logging
- Route mounts:
  - `/api/health`
  - `/api/auth`
  - `/api/rooms`
  - `/api/ai`
- 404 + global error handler

Export:

1. `default app`

## `src/config/env.js`

Purpose:

- Centralized environment config.

Exports:

1. `env` (constant object)
2. `isProduction` (constant boolean)

## `src/config/cors.js`

Purpose:

- CORS origin allow-list logic.

Named functions:

1. `isOriginAllowed(origin)`
2. `corsOriginHandler(origin, callback)`

## `src/config/db.js`

Purpose:

- Mongo connection lifecycle.

Named functions:

1. `connectDB()`
2. `disconnectDB()`

## `src/middleware/auth.js`

Purpose:

- JWT auth guard for REST routes.

Named functions:

1. `extractBearerToken(headerValue)`
2. `requireAuth(req, res, next)`

## `src/middleware/validate.js`

Purpose:

- Generic Zod request-body validation middleware.

Named functions:

1. `validateBody(schema)`

## `src/middleware/errorHandler.js`

Purpose:

- 404 handling and global error response formatting.

Named functions:

1. `notFoundHandler(req, res, next)`
2. `errorHandler(err, req, res, next)`

## `src/utils/httpError.js`

Purpose:

- Custom app error type.

Class:

1. `AppError`
- Constructor: `(statusCode, message, details = null)`

## `src/utils/asyncHandler.js`

Purpose:

- Wrap async route handlers and forward errors.

Named function value:

1. `asyncHandler(handler)`

## `src/utils/inviteCode.js`

Purpose:

- Invite code generation.

Named function:

1. `generateInviteCode(length = 6)`

## `src/services/jwt.js`

Purpose:

- JWT sign + verify helpers.

Named functions:

1. `generateAuthToken(user)`
2. `verifyAuthToken(token)`

## `src/services/serializers.js`

Purpose:

- API response normalization.

Named functions:

1. `toId(value)`
2. `serializeAuthUser(user)`
3. `serializeMember(member, status = 'active')`
4. `serializeRoom(room, membersOverride = null, options = {})`

## `src/services/roomAccess.js`

Purpose:

- Role + membership authorization logic.

Named functions:

1. `normalizeId(value)`
2. `canAccessRoom(room, userId)`
3. `getRoomMembership(roomId, userId)`
4. `canAccessRoomWithMembership(room, userId)`
5. `getEffectiveRoomRole(roomId, userId)`
6. `hasRoomRole(roomId, userId, allowedRoles = [])`
7. `hasActiveRoomMembership(roomId, userId)`
8. `isRoomOwner(room, userId)`

## `src/models/User.js`

Purpose:

- User schema/model.

Important method:

1. `comparePassword(password)` as `userSchema.methods.comparePassword`

Export:

1. `default User`

## `src/models/Room.js`

Purpose:

- Main room schema with embedded mode state.

Embedded structures:

- Decision items
- Meeting agenda
- GD speakers
- Canvas viewport/state

Export:

1. `default Room`

## `src/models/RoomMembership.js`

Purpose:

- Role/status access table per room-user pair.

Export:

1. `default RoomMembership`

## `src/models/Stroke.js`

Purpose:

- Canvas stroke persistence model.

Export:

1. `default Stroke`

## `src/controllers/authController.js`

Purpose:

- Signup/login REST handlers.

Exported handlers:

1. `signup`
- checks duplicate email
- hashes password
- creates user
- signs token

2. `login`
- verifies user + password
- signs token

## `src/controllers/roomController.js`

Purpose:

- Main room, mode, and membership business logic for REST APIs.

### Internal helper functions

1. `normalizeCanvasViewport(viewport = {})`
2. `serializeStrokeRecord(stroke)`
3. `buildCanvasState(room, strokes = [])`
4. `normalizeDecisionType(rawType = DECISION_DEFAULT_TYPE)`
5. `buildDecisionAnalysisText(room, items = [])`
6. `serializeDecisionState(room)`
7. `serializeMeetingState(room)`
8. `buildGdSummaryText(room, speakers = [], scores = {})`
9. `serializeGdState(room)`
10. `createUniqueInviteCode(maxAttempts = 10)`
11. `loadRoomWithRelations(roomId)`

### Exported controller handlers

1. `createRoom`
2. `getRooms`
3. `getRoomById`
4. `deleteRoom`
5. `joinRoomByCode`
6. `getRoomStrokes`
7. `getCanvasState`
8. `updateCanvasMeta`
9. `clearCanvasState`
10. `getDecisionState`
11. `updateDecisionPhase`
12. `addDecisionItem`
13. `removeDecisionItem`
14. `voteDecisionItem`
15. `getMeetingState`
16. `updateMeetingPresenter`
17. `updateMeetingAgenda`
18. `updateMeetingAgendaIndex`
19. `updateMeetingViewport`
20. `raiseMeetingHand`
21. `lowerMeetingHand`
22. `getGdState`
23. `startGdRound`
24. `advanceGdSpeaker`
25. `submitGdSpeakerScore`
26. `endGdRound`
27. `updateRoomMemberRole`

## `src/routes/authRoutes.js`

Purpose:

- Auth route declarations + Zod schemas.

Schemas/constants:

1. `signupSchema`
2. `loginSchema`

Endpoints:

1. `POST /signup` -> `signup`
2. `POST /login` -> `login`

## `src/routes/healthRoutes.js`

Purpose:

- Health check endpoint.

Endpoint:

1. `GET /` -> inline handler returns status/timestamp

## `src/routes/aiRoutes.js`

Purpose:

- Local AI-helper endpoints for decision and GD summaries.

Schemas/constants:

1. `decisionAnalysisSchema`
2. `gdSummarySchema`

Endpoints:

1. `POST /decision-analysis` -> inline handler builds summary text
2. `POST /gd-summary` -> inline handler builds summary text

## `src/routes/roomRoutes.js`

Purpose:

- Full room and mode API route wiring.

Schemas/constants:

1. `createRoomSchema`
2. `updateRoomMemberRoleSchema`
3. `canvasViewportSchema`
4. `updateCanvasMetaSchema`
5. `updateDecisionPhaseSchema`
6. `createDecisionItemSchema`
7. `meetingAgendaItemSchema`
8. `updateMeetingPresenterSchema`
9. `updateMeetingAgendaSchema`
10. `updateMeetingAgendaIndexSchema`
11. `updateMeetingViewportSchema`
12. `gdSpeakerSchema`
13. `startGdRoundSchema`
14. `advanceGdSpeakerSchema`
15. `submitGdSpeakerScoreSchema`
16. `endGdRoundSchema`

Key endpoints:

- Room core:
  - `GET /`
  - `POST /`
  - `POST /join/:inviteCode`
  - `PATCH /:roomId/members/:userId/role`
  - `GET /:roomId`
  - `DELETE /:roomId`

- Canvas mode:
  - `GET /:roomId/canvas/state`
  - `PATCH /:roomId/canvas/meta`
  - `POST /:roomId/canvas/clear`
  - `GET /:roomId/strokes`

- Decision mode:
  - `GET /:roomId/decision/state`
  - `PATCH /:roomId/decision/phase`
  - `POST /:roomId/decision/items`
  - `DELETE /:roomId/decision/items/:itemId`
  - `POST /:roomId/decision/items/:itemId/vote`

- Meeting mode:
  - `GET /:roomId/meeting/state`
  - `PATCH /:roomId/meeting/presenter`
  - `PUT /:roomId/meeting/agenda`
  - `PATCH /:roomId/meeting/agenda/index`
  - `PATCH /:roomId/meeting/viewport`
  - `POST /:roomId/meeting/hand-queue/raise`
  - `POST /:roomId/meeting/hand-queue/lower`

- GD mode:
  - `GET /:roomId/gd/state`
  - `POST /:roomId/gd/start`
  - `PATCH /:roomId/gd/next-speaker`
  - `POST /:roomId/gd/scores/:speakerUserId`
  - `POST /:roomId/gd/end`

## `src/sockets/index.js`

Purpose:

- Full realtime collaboration server.

### Core helper functions

1. `normalizeDecisionType(rawType = DECISION_DEFAULT_TYPE)`
2. `buildDecisionAnalysisText(room, items = [])`
3. `ensureRoomMap(roomId)`
4. `upsertPresence(roomId, socketId, member)`
5. `getRoomPresence(roomId)`
6. `removePresence(roomId, socketId)`
7. `updatePresenceStatus(roomId, socketId, status)`
8. `clearGdTimer(roomId)`
9. `startGdTimer(io, roomId)`
10. `createSocketMember(socket)`
11. `normalizeStroke(socket, stroke)`
12. `getAck(rawArgs)`
13. `ackOk(ack, data = null)`
14. `socketErrorPayload(code, message, details = null)`
15. `emitSocketError(socket, ack, code, message, details = null)`
16. `parsePayload(schema, payload, socket, ack, eventName)`
17. `isSocketInActiveRoom(socket, roomId)`
18. `getPayloadBytes(payload)`
19. `resolveGuardedRoomId(socket, requestedRoomId, ack, options = {})`
20. `requireRoomRoles(socket, roomId, ack, eventName, allowedRoles)`
21. `requirePresenterOrRoles(socket, roomId, ack, eventName, allowedRoles)`
22. `setupSocketServer(httpServer)`

### Inner function values in connection scope

1. `bindEvent(eventName, handler)`
2. `leaveRoom(roomIdParam)`

### Socket events handled

1. `join-room`
2. `leave-room`
3. `draw:stroke`
4. `draw:undo-stroke`
5. `draw:clear-canvas`
6. `chat:message`
7. `cursor:move`
8. `presence:status`
9. `decision:set-phase`
10. `decision:add-item`
11. `decision:remove-item`
12. `decision:vote`
13. `meeting:set-presenter`
14. `meeting:raise-hand`
15. `meeting:lower-hand`
16. `meeting:set-agenda`
17. `meeting:next-agenda`
18. `meeting:sync-viewport`
19. `meeting:screen-share-state`
20. `meeting:screen-share-frame`
21. `gd:start-round`
22. `gd:next-speaker`
23. `gd:submit-score`
24. `gd:end-round`
25. `disconnect`

## `scripts/canvasPhase1Smoke.mjs`

Purpose:

- Runs a practical end-to-end smoke script against a live backend.

Named functions:

1. `fail(message)`
2. `requestJson(path, options = {})`
3. `emitWithAck(socket, eventName, payload)`
4. `waitForSocketConnection(socket)`
5. `createStroke(strokeId, userId, base)`
6. `main()`

Flow tested:

1. signup
2. create room
3. update canvas metadata
4. socket join room
5. send 2 draw strokes
6. verify state endpoint
7. undo stroke
8. verify state endpoint
9. clear canvas
10. verify state endpoint

---

## 5. How REST Flow Works (High Level)

Typical request path:

1. Route receives request in `src/routes/*`
2. Optional Zod schema check via `validateBody`
3. Auth check via `requireAuth` (for protected routes)
4. Controller handler in `src/controllers/*`
5. Controller calls models/services/helpers
6. Response serialized (often via `serializeRoom` etc)
7. Errors route through `errorHandler`

---

## 6. How Socket Flow Works (High Level)

Typical event path:

1. Socket auth middleware validates token
2. Event comes in via `bindEvent`
3. Payload validated with Zod
4. Room and role guard checks run
5. Event applied to DB and/or in-memory runtime state
6. Event broadcast to room peers
7. Ack returned to sender when relevant

---

## 7. What A Live Smoke Test Means (Project Context)

In this project, a live smoke test means:

- Run a small set of critical user flows against a running backend instance
- Do not deeply test every edge case yet
- Quickly verify system is alive and main workflows still work after changes

For this backend, the canvas smoke script is exactly that:

- it confirms auth works
- room creation works
- socket join works
- drawing persistence works
- undo/clear flows work

---

## 8. Suggested Learning Order

1. `src/config/env.js`, `src/config/db.js`, `src/server.js`, `src/app.js`
2. `src/models/*` to understand data shapes
3. `src/services/jwt.js`, `src/middleware/auth.js`, `src/services/roomAccess.js`
4. `src/routes/authRoutes.js` + `src/controllers/authController.js`
5. `src/routes/roomRoutes.js` + `src/controllers/roomController.js`
6. `src/sockets/index.js` (most advanced part)
7. `scripts/canvasPhase1Smoke.mjs` for end-to-end understanding

---

## 9. Quick Revision Checklist

If you can explain these from memory, your backend understanding is strong:

1. How JWT is generated and verified
2. How role checks differ for owner/moderator/member/viewer
3. How canvas state is fetched and persisted
4. How decision/meeting/gd modes are stored in Room document
5. Why socket payloads are validated with Zod
6. How socket events sync DB + peers
7. How the smoke test proves the critical path is healthy
