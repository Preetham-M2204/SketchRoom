import { Server } from 'socket.io'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import Room from '../models/Room.js'
import Stroke from '../models/Stroke.js'
import { corsOriginHandler } from '../config/cors.js'
import { env } from '../config/env.js'
import { verifyAuthToken } from '../services/jwt.js'
import { canAccessRoomWithMembership, hasRoomRole } from '../services/roomAccess.js'
import { serializeRoom } from '../services/serializers.js'

const activeRoomMembers = new Map()
const gdTimers = new Map()
const gdRuntime = new Map()

const MAX_STROKE_POINTS = 2000
const MAX_DRAW_PAYLOAD_BYTES = 180 * 1024
const MAX_SCREEN_SHARE_FRAME_BYTES = 400 * 1024
const DECISION_DEFAULT_TYPE = 'idea'
const DECISION_ALLOWED_TYPES = new Set([
  'strength',
  'weakness',
  'opportunity',
  'threat',
  'pro',
  'con',
  'idea',
  'question',
])

function normalizeDecisionType(rawType = DECISION_DEFAULT_TYPE) {
  const normalized = String(rawType || DECISION_DEFAULT_TYPE).trim().toLowerCase()
  if (DECISION_ALLOWED_TYPES.has(normalized)) {
    return normalized
  }
  return DECISION_DEFAULT_TYPE
}

function buildDecisionAnalysisText(room, items = []) {
  if (!items.length) {
    return 'No inputs yet. Add ideas in brainstorm phase to generate analysis.'
  }

  const countsByType = items.reduce((accumulator, item) => {
    const type = normalizeDecisionType(item.type)
    accumulator[type] = (accumulator[type] || 0) + 1
    return accumulator
  }, {})

  const mostVoted = [...items].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0))[0]
  const typeDistribution = Object.entries(countsByType)
    .map(([type, count]) => `${type}: ${count}`)
    .join(', ')

  return [
    `Decision Summary${room?.name ? ` - ${room.name}` : ''}`,
    `Total items: ${items.length}`,
    `Type distribution: ${typeDistribution || 'n/a'}`,
    mostVoted
      ? `Top voted: "${mostVoted.text}" (${mostVoted.votes?.length || 0} votes)`
      : 'Top voted: none',
    'Suggested next step: convert the top 2 items into concrete action points with owners.',
  ].join('\n')
}

function ensureRoomMap(roomId) {
  if (!activeRoomMembers.has(roomId)) {
    activeRoomMembers.set(roomId, new Map())
  }
  return activeRoomMembers.get(roomId)
}

function upsertPresence(roomId, socketId, member) {
  const roomMap = ensureRoomMap(roomId)
  roomMap.set(socketId, member)
}

function getRoomPresence(roomId) {
  const roomMap = activeRoomMembers.get(roomId)
  if (!roomMap) return []

  const deduped = new Map()
  for (const member of roomMap.values()) {
    deduped.set(member.userId, member)
  }

  return Array.from(deduped.values())
}

function removePresence(roomId, socketId) {
  const roomMap = activeRoomMembers.get(roomId)
  if (!roomMap) return null

  const member = roomMap.get(socketId)
  roomMap.delete(socketId)

  if (roomMap.size === 0) {
    activeRoomMembers.delete(roomId)
  }

  if (!member) return null

  const stillPresent = Array.from(roomMap.values()).some(
    (activeMember) => activeMember.userId === member.userId
  )

  return {
    userId: member.userId,
    userName: member.name,
    shouldBroadcast: !stillPresent,
  }
}

function updatePresenceStatus(roomId, socketId, status) {
  const roomMap = activeRoomMembers.get(roomId)
  if (!roomMap || !roomMap.has(socketId)) return null

  const member = roomMap.get(socketId)
  const updated = { ...member, status }
  roomMap.set(socketId, updated)
  return updated
}

function clearGdTimer(roomId) {
  const timer = gdTimers.get(roomId)
  if (timer) {
    clearInterval(timer)
    gdTimers.delete(roomId)
  }
  gdRuntime.delete(roomId)
}

function startGdTimer(io, roomId) {
  clearGdTimer(roomId)

  const timer = setInterval(async () => {
    const runtime = gdRuntime.get(roomId)
    if (!runtime || !runtime.isActive) {
      clearGdTimer(roomId)
      return
    }

    const speaker = runtime.speakers[runtime.currentSpeakerIndex]
    if (!speaker) {
      clearGdTimer(roomId)
      return
    }

    speaker.timeRemaining = Math.max((speaker.timeRemaining || 0) - 1, 0)
    io.to(roomId).emit('gd:timer-tick', {
      userId: speaker.userId,
      timeRemaining: speaker.timeRemaining,
    })

    if (speaker.timeRemaining > 0) return

    const nextIndex = runtime.currentSpeakerIndex + 1
    if (nextIndex < runtime.speakers.length) {
      runtime.currentSpeakerIndex = nextIndex
      io.to(roomId).emit('gd:next-speaker', { index: nextIndex })
      await Room.updateOne(
        { _id: roomId },
        {
          $set: {
            'gd.currentSpeakerIndex': nextIndex,
            'gd.speakers': runtime.speakers,
            'gd.micOverrideUserIds': [],
            'gd.isActive': true,
          },
        }
      )
      return
    }

    runtime.isActive = false
    await Room.updateOne(
      { _id: roomId },
      {
        $set: {
          'gd.speakers': runtime.speakers,
          'gd.micOverrideUserIds': [],
          'gd.isActive': false,
        },
      }
    )
    clearGdTimer(roomId)
  }, 1000)

  gdTimers.set(roomId, timer)
}

function createSocketMember(socket) {
  return {
    userId: socket.data.user.id,
    name: socket.data.user.name,
    email: socket.data.user.email,
    status: 'active',
  }
}

function normalizeStroke(socket, stroke) {
  return {
    id: String(stroke.id),
    userId: String(stroke.userId || socket.data.user.id),
    tool: String(stroke.tool || 'pen'),
    points: stroke.points || [],
    color: stroke.color || '#18170F',
    width: Number(stroke.width || 2),
    timestamp: Number(stroke.timestamp || Date.now()),
  }
}

const pointPayloadSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
})

const roomIdSchema = z.string().trim().min(1)
const optionalRoomIdSchema = z.string().trim().min(1).optional()

const drawStrokeSchema = z.object({
  id: z.string().trim().min(1),
  userId: z.string().trim().min(1).optional(),
  tool: z.enum(['pen', 'eraser', 'line', 'rectangle', 'circle']).optional(),
  points: z.array(pointPayloadSchema).min(1).max(MAX_STROKE_POINTS),
  color: z.string().trim().min(1).max(32).optional(),
  width: z.number().positive().max(64).optional(),
  timestamp: z.number().int().positive().optional(),
})

const undoStrokeSchema = z.object({
  strokeId: z.string().trim().min(1),
  roomId: optionalRoomIdSchema,
})

const chatMessageSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  timestamp: z.number().int().positive().optional(),
  roomId: optionalRoomIdSchema,
})

const cursorMoveSchema = z.object({
  roomId: optionalRoomIdSchema,
  userId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(80).optional(),
  x: z.number().finite(),
  y: z.number().finite(),
  tool: z.string().trim().min(1).max(50).optional(),
})

const presenceSchema = z.object({
  roomId: optionalRoomIdSchema,
  status: z.enum(['active', 'idle']),
})

const decisionSetPhaseSchema = z.object({
  roomId: optionalRoomIdSchema,
  phase: z.enum(['brainstorm', 'voting', 'analysis']),
})

const decisionAddItemSchema = z.object({
  roomId: optionalRoomIdSchema,
  item: z.object({
    id: z.string().trim().min(1),
    text: z.string().trim().min(1).max(800),
    type: z.string().trim().min(1).max(40),
    votes: z.array(z.string().trim().min(1)).optional(),
    createdBy: z.string().trim().min(1).optional(),
  }),
})

const decisionRemoveItemSchema = z.object({
  roomId: optionalRoomIdSchema,
  itemId: z.string().trim().min(1),
})

const decisionVoteSchema = z.object({
  roomId: optionalRoomIdSchema,
  itemId: z.string().trim().min(1),
  userId: z.string().trim().min(1).optional(),
})

const meetingSetPresenterSchema = z.object({
  roomId: optionalRoomIdSchema,
  userId: z.string().trim().min(1).optional(),
})

const meetingHandSchema = z.object({
  roomId: optionalRoomIdSchema,
  userId: z.string().trim().min(1).optional(),
})

const meetingAgendaItemSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1).max(240),
  duration: z.number().nonnegative(),
  completed: z.boolean().optional(),
})

const meetingSetAgendaSchema = z.object({
  roomId: optionalRoomIdSchema,
  agenda: z.array(meetingAgendaItemSchema),
})

const meetingNextAgendaSchema = z.object({
  roomId: optionalRoomIdSchema,
  index: z.number().int().nonnegative(),
})

const meetingSyncViewportSchema = z.object({
  roomId: optionalRoomIdSchema,
  viewport: z.record(z.any()),
})

const meetingScreenShareStateSchema = z.object({
  roomId: optionalRoomIdSchema,
  active: z.boolean(),
  userId: z.string().trim().min(1).optional(),
  userName: z.string().trim().min(1).max(120).optional(),
})

const meetingScreenShareFrameSchema = z.object({
  roomId: optionalRoomIdSchema,
  frame: z.string().trim().min(1),
  width: z.number().int().positive().max(1920).optional(),
  height: z.number().int().positive().max(1080).optional(),
  timestamp: z.number().int().positive().optional(),
})

const gdSpeakerSchema = z.object({
  userId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  timeRemaining: z.number().int().positive().optional(),
  hasSpoken: z.boolean().optional(),
})

const gdStartRoundSchema = z.object({
  roomId: optionalRoomIdSchema,
  speakers: z.array(gdSpeakerSchema).min(1),
})

const gdNextSpeakerSchema = z.object({
  roomId: optionalRoomIdSchema,
  index: z.number().int().nonnegative(),
})

const gdSetMicAccessSchema = z.object({
  roomId: optionalRoomIdSchema,
  userId: z.string().trim().min(1),
  enabled: z.boolean(),
})

const gdSubmitScoreSchema = z.object({
  roomId: optionalRoomIdSchema,
  userId: z.string().trim().min(1),
  scores: z.record(z.any()),
})

const gdEndRoundSchema = z.object({
  roomId: optionalRoomIdSchema,
  summary: z.string().trim().max(4000).optional(),
})

const leaveRoomPayloadSchema = z
  .union([
    z.string().trim().min(1),
    z.object({ roomId: optionalRoomIdSchema }),
  ])
  .optional()

function getAck(rawArgs) {
  const maybeAck = rawArgs[rawArgs.length - 1]
  if (typeof maybeAck === 'function') {
    return rawArgs.pop()
  }
  return null
}

function ackOk(ack, data = null) {
  if (!ack) return
  ack({ ok: true, data })
}

function socketErrorPayload(code, message, details = null) {
  return {
    ok: false,
    code,
    message,
    details,
  }
}

function emitSocketError(socket, ack, code, message, details = null) {
  const payload = socketErrorPayload(code, message, details)
  if (ack) {
    ack(payload)
  }

  socket.emit('socket:error', {
    code,
    message,
    details,
  })
}

function parsePayload(schema, payload, socket, ack, eventName) {
  const parsed = schema.safeParse(payload)
  if (parsed.success) {
    return parsed.data
  }

  emitSocketError(
    socket,
    ack,
    'INVALID_PAYLOAD',
    `Invalid payload for ${eventName}`,
    parsed.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }))
  )
  return null
}

function isSocketInActiveRoom(socket, roomId) {
  const roomMap = activeRoomMembers.get(roomId)
  if (!roomMap) return false
  return roomMap.has(socket.id)
}

function getPayloadBytes(payload) {
  try {
    return Buffer.byteLength(JSON.stringify(payload ?? {}), 'utf8')
  } catch {
    return Number.MAX_SAFE_INTEGER
  }
}

async function resolveGuardedRoomId(socket, requestedRoomId, ack, options = {}) {
  const { verifyDbAccess = false } = options
  const activeRoomId = socket.data.activeRoomId

  if (!activeRoomId) {
    emitSocketError(socket, ack, 'ROOM_REQUIRED', 'Join a room before sending this event')
    return null
  }

  if (requestedRoomId && String(requestedRoomId) !== String(activeRoomId)) {
    emitSocketError(socket, ack, 'ROOM_MISMATCH', 'Event roomId does not match active room')
    return null
  }

  if (!isSocketInActiveRoom(socket, activeRoomId)) {
    emitSocketError(socket, ack, 'ROOM_SESSION_INVALID', 'Socket is not active in the requested room')
    return null
  }

  if (verifyDbAccess) {
    const room = await Room.findById(activeRoomId).select('owner access').lean()
    const allowed = room ? await canAccessRoomWithMembership(room, socket.data.user.id) : false
    if (!room || !allowed) {
      emitSocketError(socket, ack, 'ROOM_ACCESS_DENIED', 'You no longer have access to this room')
      return null
    }
  }

  return String(activeRoomId)
}

async function requireRoomRoles(socket, roomId, ack, eventName, allowedRoles) {
  const roleCheck = await hasRoomRole(roomId, socket.data.user.id, allowedRoles)

  if (!roleCheck.room) {
    emitSocketError(socket, ack, 'ROOM_NOT_FOUND', `Room not found for ${eventName}`)
    return false
  }

  if (roleCheck.reason === 'blocked') {
    emitSocketError(socket, ack, 'FORBIDDEN', `Access blocked for ${eventName}`)
    return false
  }

  if (!roleCheck.allowed) {
    emitSocketError(
      socket,
      ack,
      'FORBIDDEN',
      `${eventName} requires one of roles: ${allowedRoles.join(', ')}`
    )
    return false
  }

  return true
}

async function requirePresenterOrRoles(socket, roomId, ack, eventName, allowedRoles) {
  const roleCheck = await hasRoomRole(roomId, socket.data.user.id, allowedRoles)

  if (!roleCheck.room) {
    emitSocketError(socket, ack, 'ROOM_NOT_FOUND', `Room not found for ${eventName}`)
    return false
  }

  if (roleCheck.reason === 'blocked') {
    emitSocketError(socket, ack, 'FORBIDDEN', `Access blocked for ${eventName}`)
    return false
  }

  if (roleCheck.allowed) {
    return true
  }

  const isPresenter =
    roleCheck.room.meeting?.presenter &&
    String(roleCheck.room.meeting.presenter) === String(socket.data.user.id)

  if (isPresenter) {
    return true
  }

  emitSocketError(
    socket,
    ack,
    'FORBIDDEN',
    `${eventName} requires presenter or one of roles: ${allowedRoles.join(', ')}`
  )
  return false
}

export function setupSocketServer(httpServer) {
  const io = new Server(httpServer, {
    path: '/socket.io',
    maxHttpBufferSize: env.NODE_ENV === 'production' ? 1_000_000 : 2_000_000,
    cors: {
      origin: corsOriginHandler,
      credentials: true,
    },
  })

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) {
        return next(new Error('Unauthorized'))
      }

      const payload = verifyAuthToken(token)
      socket.data.user = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
      }
      socket.data.activeRoomId = null
      return next()
    } catch {
      return next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`)

    const bindEvent = (eventName, handler) => {
      socket.on(eventName, async (...rawArgs) => {
        const ack = getAck(rawArgs)
        const payload = rawArgs[0]

        try {
          await handler(payload, ack)
        } catch (error) {
          console.error(`Socket handler failed for ${eventName}:`, error)
          emitSocketError(socket, ack, 'SERVER_ERROR', `Failed to process ${eventName}`)
        }
      })
    }

    const leaveRoom = (roomIdParam) => {
      const roomId = roomIdParam || socket.data.activeRoomId
      if (!roomId) return

      socket.leave(roomId)
      const result = removePresence(roomId, socket.id)
      socket.data.activeRoomId = socket.data.activeRoomId === roomId ? null : socket.data.activeRoomId

      socket.to(roomId).emit('cursor:leave', { userId: socket.data.user.id })

      if (result?.shouldBroadcast) {
        socket.to(roomId).emit('room:member-left', {
          userId: result.userId,
          userName: result.userName,
        })
      }

      if (getRoomPresence(roomId).length === 0) {
        clearGdTimer(roomId)
      }

      return true
    }

    bindEvent('join-room', async (payload, ack) => {
      const roomId = parsePayload(roomIdSchema, payload, socket, ack, 'join-room')
      if (!roomId) return

      const room = await Room.findById(roomId)
        .populate('owner', 'name email')
        .populate('members', 'name email')

      const allowed = room ? await canAccessRoomWithMembership(room, socket.data.user.id) : false
      if (!room || !allowed) {
        emitSocketError(socket, ack, 'ROOM_ACCESS_DENIED', 'Room not found or access denied')
        return
      }

      if (socket.data.activeRoomId && socket.data.activeRoomId !== roomId) {
        leaveRoom(socket.data.activeRoomId)
      }

      socket.join(roomId)
      socket.data.activeRoomId = roomId

      const member = createSocketMember(socket)
      upsertPresence(roomId, socket.id, member)

      socket.emit('room:joined', {
        room: serializeRoom(room, null, { viewerUserId: socket.data.user.id }),
        members: getRoomPresence(roomId),
      })

      socket.to(roomId).emit('room:member-joined', { member })
      ackOk(ack, { roomId })
    })

    bindEvent('leave-room', async (payload, ack) => {
      const parsed = parsePayload(leaveRoomPayloadSchema, payload, socket, ack, 'leave-room')
      if (payload !== undefined && !parsed) return

      const roomId =
        typeof parsed === 'string'
          ? parsed
          : parsed?.roomId || socket.data.activeRoomId

      leaveRoom(roomId)
      ackOk(ack, { roomId })
    })

    bindEvent('draw:stroke', async (payload, ack) => {
      const drawPayloadSize = getPayloadBytes(payload)
      if (drawPayloadSize > MAX_DRAW_PAYLOAD_BYTES) {
        emitSocketError(
          socket,
          ack,
          'PAYLOAD_TOO_LARGE',
          `draw:stroke payload exceeded ${MAX_DRAW_PAYLOAD_BYTES} bytes`
        )
        return
      }

      const stroke = parsePayload(drawStrokeSchema, payload, socket, ack, 'draw:stroke')
      if (!stroke) return

      const roomId = await resolveGuardedRoomId(socket, null, ack)
      if (!roomId) return

      const normalizedStroke = normalizeStroke(socket, stroke)

      socket.to(roomId).emit('draw:stroke', normalizedStroke)

      await Promise.all([
        Stroke.updateOne(
          { room: roomId, strokeId: normalizedStroke.id },
          {
            $set: {
              userId: normalizedStroke.userId,
              tool: normalizedStroke.tool,
              points: normalizedStroke.points,
              color: normalizedStroke.color,
              width: normalizedStroke.width,
              timestamp: normalizedStroke.timestamp,
            },
          },
          { upsert: true }
        ),
        Room.updateOne(
          { _id: roomId },
          {
            $set: {
              'canvas.lastEditedBy': socket.data.user.id,
              'canvas.lastEditedAt': new Date(),
            },
          }
        ),
      ])

      ackOk(ack, { strokeId: normalizedStroke.id })
    })

    bindEvent('draw:undo-stroke', async (payload, ack) => {
      const parsed = parsePayload(undoStrokeSchema, payload || {}, socket, ack, 'draw:undo-stroke')
      if (!parsed) return

      const roomId = await resolveGuardedRoomId(socket, parsed.roomId, ack)
      if (!roomId) return

      socket.to(roomId).emit('draw:undo-stroke', { strokeId: parsed.strokeId })
      await Promise.all([
        Stroke.deleteOne({ room: roomId, strokeId: parsed.strokeId }),
        Room.updateOne(
          { _id: roomId },
          {
            $set: {
              'canvas.lastEditedBy': socket.data.user.id,
              'canvas.lastEditedAt': new Date(),
            },
          }
        ),
      ])
      ackOk(ack, { strokeId: parsed.strokeId })
    })

    bindEvent('draw:clear-canvas', async (payload, ack) => {
      const parsed = parsePayload(
        z.object({ roomId: optionalRoomIdSchema }).optional(),
        payload,
        socket,
        ack,
        'draw:clear-canvas'
      )
      if (payload !== undefined && !parsed) return

      const roomId = await resolveGuardedRoomId(socket, parsed?.roomId, ack)
      if (!roomId) return

      const canClear = await requireRoomRoles(
        socket,
        roomId,
        ack,
        'draw:clear-canvas',
        ['owner', 'moderator']
      )
      if (!canClear) return

      socket.to(roomId).emit('draw:clear-canvas')
      await Promise.all([
        Stroke.deleteMany({ room: roomId }),
        Room.updateOne(
          { _id: roomId },
          {
            $set: {
              'canvas.lastEditedBy': socket.data.user.id,
              'canvas.lastEditedAt': new Date(),
            },
          }
        ),
      ])
      ackOk(ack, { roomId })
    })

    bindEvent('chat:message', async (payload, ack) => {
      const message = parsePayload(chatMessageSchema, payload || {}, socket, ack, 'chat:message')
      if (!message) return

      const roomId = await resolveGuardedRoomId(socket, message.roomId, ack)
      if (!roomId) return

      io.to(roomId).emit('chat:message', {
        id: nanoid(),
        userId: socket.data.user.id,
        userName: socket.data.user.name,
        text: message.text,
        timestamp: Number(message.timestamp || Date.now()),
      })

      ackOk(ack)
    })

    bindEvent('cursor:move', async (payload, ack) => {
      const parsed = parsePayload(cursorMoveSchema, payload || {}, socket, ack, 'cursor:move')
      if (!parsed) return

      const roomId = await resolveGuardedRoomId(socket, parsed.roomId, ack)
      if (!roomId) return

      socket.to(roomId).emit('cursor:update', {
        userId: parsed.userId || socket.data.user.id,
        name: parsed.name || socket.data.user.name,
        x: parsed.x,
        y: parsed.y,
        tool: parsed.tool,
      })

      ackOk(ack)
    })

    bindEvent('presence:status', async (payload, ack) => {
      const parsed = parsePayload(presenceSchema, payload || {}, socket, ack, 'presence:status')
      if (!parsed) return

      const targetRoomId = await resolveGuardedRoomId(socket, parsed.roomId, ack)
      if (!targetRoomId) return

      const updatedMember = updatePresenceStatus(targetRoomId, socket.id, parsed.status)
      if (updatedMember) {
        socket.to(targetRoomId).emit('room:member-status', {
          userId: updatedMember.userId,
          status: updatedMember.status,
        })
      }

      ackOk(ack)
    })

    bindEvent('decision:set-phase', async (payload, ack) => {
      const parsed = parsePayload(
        decisionSetPhaseSchema,
        payload || {},
        socket,
        ack,
        'decision:set-phase'
      )
      if (!parsed) return

      const targetRoomId = await resolveGuardedRoomId(socket, parsed.roomId, ack)
      if (!targetRoomId) return

      const canModerate = await requireRoomRoles(
        socket,
        targetRoomId,
        ack,
        'decision:set-phase',
        ['owner', 'moderator']
      )
      if (!canModerate) return

      const decisionRoom = await Room.findById(targetRoomId).select('name decision').lean()
      if (!decisionRoom) {
        emitSocketError(socket, ack, 'ROOM_NOT_FOUND', 'Room not found for decision:set-phase')
        return
      }

      const updates = {
        'decision.phase': parsed.phase,
      }
      let analysis = decisionRoom?.decision?.analysis || null

      if (parsed.phase === 'analysis') {
        analysis = buildDecisionAnalysisText(decisionRoom, decisionRoom?.decision?.items || [])
        updates['decision.analysis'] = analysis
      }

      await Room.updateOne(
        { _id: targetRoomId },
        {
          $set: updates,
        }
      )

      socket.to(targetRoomId).emit('decision:set-phase', {
        phase: parsed.phase,
        analysis,
      })
      ackOk(ack, { phase: parsed.phase, analysis })
    })

    bindEvent('decision:add-item', async (payload, ack) => {
      const parsed = parsePayload(
        decisionAddItemSchema,
        payload || {},
        socket,
        ack,
        'decision:add-item'
      )
      if (!parsed) return

      const targetRoomId = await resolveGuardedRoomId(socket, parsed.roomId, ack)
      if (!targetRoomId) return

      const normalizedItem = {
        id: String(parsed.item.id),
        text: String(parsed.item.text),
        type: normalizeDecisionType(parsed.item.type),
        votes: Array.isArray(parsed.item.votes) ? parsed.item.votes : [],
        createdBy: String(parsed.item.createdBy || socket.data.user.id),
      }

      await Room.updateOne(
        {
          _id: targetRoomId,
          'decision.items.id': { $ne: normalizedItem.id },
        },
        {
          $push: { 'decision.items': normalizedItem },
          $set: { 'decision.analysis': null },
        }
      )

      socket.to(targetRoomId).emit('decision:add-item', { item: normalizedItem })
      ackOk(ack, { itemId: normalizedItem.id })
    })

    bindEvent('decision:remove-item', async (payload, ack) => {
      const parsed = parsePayload(
        decisionRemoveItemSchema,
        payload || {},
        socket,
        ack,
        'decision:remove-item'
      )
      if (!parsed) return

      const targetRoomId = await resolveGuardedRoomId(socket, parsed.roomId, ack)
      if (!targetRoomId) return

      await Room.updateOne(
        { _id: targetRoomId },
        {
          $pull: { 'decision.items': { id: String(parsed.itemId) } },
          $set: { 'decision.analysis': null },
        }
      )

      socket.to(targetRoomId).emit('decision:remove-item', { itemId: parsed.itemId })
      ackOk(ack, { itemId: parsed.itemId })
    })

    bindEvent('decision:vote', async (payload, ack) => {
      const parsed = parsePayload(decisionVoteSchema, payload || {}, socket, ack, 'decision:vote')
      if (!parsed) return

      const targetRoomId = await resolveGuardedRoomId(socket, parsed.roomId, ack)
      if (!targetRoomId) return

      const voterId = String(parsed.userId || socket.data.user.id)
      await Room.updateOne(
        {
          _id: targetRoomId,
          'decision.items.id': String(parsed.itemId),
        },
        {
          $addToSet: { 'decision.items.$.votes': voterId },
        }
      )

      socket.to(targetRoomId).emit('decision:vote', { itemId: parsed.itemId, userId: voterId })
      ackOk(ack, { itemId: parsed.itemId, userId: voterId })
    })

    bindEvent('meeting:set-presenter', async (payload, ack) => {
      const parsed = parsePayload(
        meetingSetPresenterSchema,
        payload || {},
        socket,
        ack,
        'meeting:set-presenter'
      )
      if (!parsed) return

      const targetRoomId = await resolveGuardedRoomId(socket, parsed.roomId, ack)
      if (!targetRoomId) return

      const canModerate = await requireRoomRoles(
        socket,
        targetRoomId,
        ack,
        'meeting:set-presenter',
        ['owner', 'moderator']
      )
      if (!canModerate) return

      const presenterUserId = parsed.userId || socket.data.user.id

      await Room.updateOne(
        { _id: targetRoomId },
        {
          $set: { 'meeting.presenter': String(presenterUserId) },
        }
      )

      socket.to(targetRoomId).emit('meeting:set-presenter', {
        userId: String(presenterUserId),
        userName: socket.data.user.name,
      })
      ackOk(ack, { userId: String(presenterUserId) })
    })

    bindEvent('meeting:raise-hand', async (payload, ack) => {
      const parsed = parsePayload(meetingHandSchema, payload || {}, socket, ack, 'meeting:raise-hand')
      if (!parsed) return

      const targetRoomId = await resolveGuardedRoomId(socket, parsed.roomId, ack)
      if (!targetRoomId) return
      const handUserId = parsed.userId || socket.data.user.id

      await Room.updateOne(
        { _id: targetRoomId },
        {
          $addToSet: { 'meeting.handQueue': String(handUserId) },
        }
      )

      socket.to(targetRoomId).emit('meeting:raise-hand', { userId: String(handUserId) })
      ackOk(ack, { userId: String(handUserId) })
    })

    bindEvent('meeting:lower-hand', async (payload, ack) => {
      const parsed = parsePayload(meetingHandSchema, payload || {}, socket, ack, 'meeting:lower-hand')
      if (!parsed) return

      const targetRoomId = await resolveGuardedRoomId(socket, parsed.roomId, ack)
      if (!targetRoomId) return
      const handUserId = parsed.userId || socket.data.user.id

      await Room.updateOne(
        { _id: targetRoomId },
        {
          $pull: { 'meeting.handQueue': String(handUserId) },
        }
      )

      socket.to(targetRoomId).emit('meeting:lower-hand', { userId: String(handUserId) })
      ackOk(ack, { userId: String(handUserId) })
    })

    bindEvent('meeting:set-agenda', async (payload, ack) => {
      const parsed = parsePayload(
        meetingSetAgendaSchema,
        payload || {},
        socket,
        ack,
        'meeting:set-agenda'
      )
      if (!parsed) return

      const targetRoomId = await resolveGuardedRoomId(socket, parsed.roomId, ack)
      if (!targetRoomId) return

      const canModerate = await requirePresenterOrRoles(
        socket,
        targetRoomId,
        ack,
        'meeting:set-agenda',
        ['owner', 'moderator']
      )
      if (!canModerate) return

      await Room.updateOne(
        { _id: targetRoomId },
        {
          $set: { 'meeting.agenda': parsed.agenda },
        }
      )

      socket.to(targetRoomId).emit('meeting:set-agenda', { agenda: parsed.agenda })
      ackOk(ack)
    })

    bindEvent('meeting:next-agenda', async (payload, ack) => {
      const parsed = parsePayload(
        meetingNextAgendaSchema,
        payload || {},
        socket,
        ack,
        'meeting:next-agenda'
      )
      if (!parsed) return

      const targetRoomId = await resolveGuardedRoomId(socket, parsed.roomId, ack)
      if (!targetRoomId) return

      const canModerate = await requirePresenterOrRoles(
        socket,
        targetRoomId,
        ack,
        'meeting:next-agenda',
        ['owner', 'moderator']
      )
      if (!canModerate) return

      await Room.updateOne(
        { _id: targetRoomId },
        {
          $set: { 'meeting.currentAgendaIndex': parsed.index },
        }
      )

      socket.to(targetRoomId).emit('meeting:next-agenda', { index: parsed.index })
      ackOk(ack, { index: parsed.index })
    })

    bindEvent('meeting:sync-viewport', async (payload, ack) => {
      const parsed = parsePayload(
        meetingSyncViewportSchema,
        payload || {},
        socket,
        ack,
        'meeting:sync-viewport'
      )
      if (!parsed) return

      const targetRoomId = await resolveGuardedRoomId(socket, parsed.roomId, ack)
      if (!targetRoomId) return

      const canModerate = await requirePresenterOrRoles(
        socket,
        targetRoomId,
        ack,
        'meeting:sync-viewport',
        ['owner', 'moderator']
      )
      if (!canModerate) return

      socket.to(targetRoomId).emit('meeting:sync-viewport', { viewport: parsed.viewport })
      ackOk(ack)
    })

    bindEvent('meeting:screen-share-state', async (payload, ack) => {
      const parsed = parsePayload(
        meetingScreenShareStateSchema,
        payload || {},
        socket,
        ack,
        'meeting:screen-share-state'
      )
      if (!parsed) return

      const targetRoomId = await resolveGuardedRoomId(socket, parsed.roomId, ack)
      if (!targetRoomId) return

      const canShareScreen = await requirePresenterOrRoles(
        socket,
        targetRoomId,
        ack,
        'meeting:screen-share-state',
        ['owner', 'moderator']
      )
      if (!canShareScreen) return

      socket.to(targetRoomId).emit('meeting:screen-share-state', {
        active: Boolean(parsed.active),
        userId: parsed.userId || socket.data.user.id,
        userName: parsed.userName || socket.data.user.name,
        timestamp: Date.now(),
      })

      ackOk(ack)
    })

    bindEvent('meeting:screen-share-frame', async (payload, ack) => {
      const framePayloadBytes = getPayloadBytes(payload)
      if (framePayloadBytes > MAX_SCREEN_SHARE_FRAME_BYTES) {
        emitSocketError(
          socket,
          ack,
          'PAYLOAD_TOO_LARGE',
          `meeting:screen-share-frame payload exceeded ${MAX_SCREEN_SHARE_FRAME_BYTES} bytes`
        )
        return
      }

      const parsed = parsePayload(
        meetingScreenShareFrameSchema,
        payload || {},
        socket,
        ack,
        'meeting:screen-share-frame'
      )
      if (!parsed) return

      const targetRoomId = await resolveGuardedRoomId(socket, parsed.roomId, ack)
      if (!targetRoomId) return

      const canShareScreen = await requirePresenterOrRoles(
        socket,
        targetRoomId,
        ack,
        'meeting:screen-share-frame',
        ['owner', 'moderator']
      )
      if (!canShareScreen) return

      socket.to(targetRoomId).emit('meeting:screen-share-frame', {
        userId: socket.data.user.id,
        userName: socket.data.user.name,
        frame: parsed.frame,
        width: parsed.width,
        height: parsed.height,
        timestamp: parsed.timestamp || Date.now(),
      })

      ackOk(ack)
    })

    bindEvent('gd:start-round', async (payload, ack) => {
      const parsed = parsePayload(gdStartRoundSchema, payload || {}, socket, ack, 'gd:start-round')
      if (!parsed) return

      const targetRoomId = await resolveGuardedRoomId(socket, parsed.roomId, ack, {
        verifyDbAccess: true,
      })
      if (!targetRoomId) return

      const canModerate = await requireRoomRoles(
        socket,
        targetRoomId,
        ack,
        'gd:start-round',
        ['owner', 'moderator']
      )
      if (!canModerate) return

      const gdRoom = await Room.findById(targetRoomId).select('owner').lean()
      if (!gdRoom) {
        emitSocketError(socket, ack, 'ROOM_NOT_FOUND', 'Room not found for gd:start-round')
        return
      }

      const ownerId = String(gdRoom.owner || '')

      const normalizedSpeakers = parsed.speakers.map((speaker) => ({
        userId: String(speaker.userId),
        name: String(speaker.name),
        timeRemaining: Number(speaker.timeRemaining || 120),
        hasSpoken: Boolean(speaker.hasSpoken),
      }))
      .filter((speaker) => speaker.userId !== ownerId)

      if (normalizedSpeakers.length === 0) {
        emitSocketError(
          socket,
          ack,
          'INVALID_PAYLOAD',
          'Add at least one participant other than host to start GD round'
        )
        return
      }

      gdRuntime.set(targetRoomId, {
        speakers: normalizedSpeakers,
        currentSpeakerIndex: 0,
        isActive: true,
      })
      startGdTimer(io, targetRoomId)

      await Room.updateOne(
        { _id: targetRoomId },
        {
          $set: {
            'gd.speakers': normalizedSpeakers,
            'gd.currentSpeakerIndex': 0,
            'gd.isActive': true,
            'gd.micOverrideUserIds': [],
            'gd.summary': null,
          },
        }
      )

      socket.to(targetRoomId).emit('gd:start-round', { speakers: normalizedSpeakers })
      ackOk(ack, { speakers: normalizedSpeakers.length })
    })

    bindEvent('gd:next-speaker', async (payload, ack) => {
      const parsed = parsePayload(gdNextSpeakerSchema, payload || {}, socket, ack, 'gd:next-speaker')
      if (!parsed) return

      const targetRoomId = await resolveGuardedRoomId(socket, parsed.roomId, ack)
      if (!targetRoomId) return

      const canModerate = await requireRoomRoles(
        socket,
        targetRoomId,
        ack,
        'gd:next-speaker',
        ['owner', 'moderator']
      )
      if (!canModerate) return

      const runtime = gdRuntime.get(targetRoomId)
      if (runtime) {
        runtime.currentSpeakerIndex = parsed.index
      }

      await Room.updateOne(
        { _id: targetRoomId },
        {
          $set: {
            'gd.currentSpeakerIndex': parsed.index,
            'gd.micOverrideUserIds': [],
          },
        }
      )

      socket.to(targetRoomId).emit('gd:next-speaker', { index: parsed.index })
      ackOk(ack, { index: parsed.index })
    })

    bindEvent('gd:set-mic-access', async (payload, ack) => {
      const parsed = parsePayload(
        gdSetMicAccessSchema,
        payload || {},
        socket,
        ack,
        'gd:set-mic-access'
      )
      if (!parsed) return

      const targetRoomId = await resolveGuardedRoomId(socket, parsed.roomId, ack)
      if (!targetRoomId) return

      const canModerate = await requireRoomRoles(
        socket,
        targetRoomId,
        ack,
        'gd:set-mic-access',
        ['owner', 'moderator']
      )
      if (!canModerate) return

      const room = await Room.findById(targetRoomId).select('gd.speakers').lean()
      const speakerExists = (room?.gd?.speakers || []).some(
        (speaker) => String(speaker.userId) === String(parsed.userId)
      )

      if (!speakerExists) {
        emitSocketError(
          socket,
          ack,
          'FORBIDDEN',
          'Only active GD speakers can receive mic override access'
        )
        return
      }

      if (parsed.enabled) {
        await Room.updateOne(
          { _id: targetRoomId },
          {
            $addToSet: {
              'gd.micOverrideUserIds': String(parsed.userId),
            },
          }
        )
      } else {
        await Room.updateOne(
          { _id: targetRoomId },
          {
            $pull: {
              'gd.micOverrideUserIds': String(parsed.userId),
            },
          }
        )
      }

      socket.to(targetRoomId).emit('gd:set-mic-access', {
        userId: String(parsed.userId),
        enabled: Boolean(parsed.enabled),
      })
      ackOk(ack, { userId: String(parsed.userId), enabled: Boolean(parsed.enabled) })
    })

    bindEvent('gd:submit-score', async (payload, ack) => {
      const parsed = parsePayload(gdSubmitScoreSchema, payload || {}, socket, ack, 'gd:submit-score')
      if (!parsed) return

      const targetRoomId = await resolveGuardedRoomId(socket, parsed.roomId, ack)
      if (!targetRoomId) return

      const canModerate = await requireRoomRoles(
        socket,
        targetRoomId,
        ack,
        'gd:submit-score',
        ['owner', 'moderator']
      )
      if (!canModerate) return

      const speakerUserId = parsed.userId

      await Room.updateOne(
        { _id: targetRoomId },
        {
          $set: {
            [`gd.scores.${speakerUserId}`]: parsed.scores,
          },
        }
      )

      socket.to(targetRoomId).emit('gd:submit-score', {
        userId: speakerUserId,
        scores: parsed.scores,
      })
      ackOk(ack, { userId: speakerUserId })
    })

    bindEvent('gd:end-round', async (payload, ack) => {
      const parsed = parsePayload(gdEndRoundSchema, payload || {}, socket, ack, 'gd:end-round')
      if (!parsed) return

      const targetRoomId = await resolveGuardedRoomId(socket, parsed.roomId, ack)
      if (!targetRoomId) return

      const canModerate = await requireRoomRoles(
        socket,
        targetRoomId,
        ack,
        'gd:end-round',
        ['owner', 'moderator']
      )
      if (!canModerate) return

      const runtime = gdRuntime.get(targetRoomId)
      if (runtime) {
        runtime.isActive = false
      }
      clearGdTimer(targetRoomId)

      const updatePayload = {
        'gd.isActive': false,
        'gd.micOverrideUserIds': [],
      }

      if (parsed.summary) {
        updatePayload['gd.summary'] = parsed.summary
      }

      await Room.updateOne(
        { _id: targetRoomId },
        {
          $set: updatePayload,
        }
      )

      socket.to(targetRoomId).emit('gd:end-round')
      ackOk(ack)
    })

    socket.on('disconnect', () => {
      leaveRoom(socket.data.activeRoomId)
      console.log(`Socket disconnected: ${socket.id}`)
    })
  })

  return io
}
