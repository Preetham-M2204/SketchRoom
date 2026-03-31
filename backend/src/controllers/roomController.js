import Room from '../models/Room.js'
import RoomMembership from '../models/RoomMembership.js'
import Stroke from '../models/Stroke.js'
import User from '../models/User.js'
import { nanoid } from 'nanoid'
import {
  canAccessRoomWithMembership,
  getEffectiveRoomRole,
  hasRoomRole,
  isRoomOwner,
} from '../services/roomAccess.js'
import { serializeRoom } from '../services/serializers.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { generateInviteCode } from '../utils/inviteCode.js'
import { AppError } from '../utils/httpError.js'

const DECISION_DEFAULT_TYPE = 'idea'
const ROOM_PUBLIC_ID_LENGTH = 10
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

function normalizeRoomKey(roomKey = '') {
  return String(roomKey || '').trim()
}

function buildRoomJoinPreview(room) {
  return {
    publicId: room?.publicId || null,
    name: room?.name || 'SketchRoom',
    topic: room?.topic || '',
    mode: room?.mode || 'canvas',
    access: room?.access || 'private',
  }
}

function normalizeCanvasViewport(viewport = {}) {
  const x = Number.isFinite(viewport?.x) ? viewport.x : 0
  const y = Number.isFinite(viewport?.y) ? viewport.y : 0
  const rawZoom = Number.isFinite(viewport?.zoom) ? viewport.zoom : 1
  const zoom = Math.min(Math.max(rawZoom, 0.1), 8)

  return { x, y, zoom }
}

function serializeStrokeRecord(stroke) {
  return {
    id: stroke.strokeId,
    userId: stroke.userId,
    tool: stroke.tool || 'pen',
    points: stroke.points,
    color: stroke.color,
    width: stroke.width,
    timestamp: stroke.timestamp,
  }
}

function buildCanvasState(room, strokes = []) {
  const lastStroke = strokes.length > 0 ? strokes[strokes.length - 1] : null
  const lastStrokeTimestamp = lastStroke ? Number(lastStroke.timestamp) : null
  const lastUpdated =
    room.canvas?.lastEditedAt ||
    (lastStrokeTimestamp ? new Date(lastStrokeTimestamp) : room.updatedAt)

  return {
    roomId: String(room._id),
    boardTitle: room.canvas?.boardTitle || '',
    viewport: normalizeCanvasViewport(room.canvas?.viewport || {}),
    strokeCount: strokes.length,
    lastUpdated,
    lastEditedBy: room.canvas?.lastEditedBy || null,
    strokes: strokes.map(serializeStrokeRecord),
  }
}

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

function serializeDecisionState(room) {
  const items = (room?.decision?.items || []).map((item) => ({
    id: String(item.id),
    text: String(item.text || ''),
    type: normalizeDecisionType(item.type),
    votes: Array.isArray(item.votes) ? [...new Set(item.votes.map((value) => String(value)))] : [],
    createdBy: String(item.createdBy || ''),
  }))

  return {
    roomId: String(room._id),
    phase: room?.decision?.phase || 'brainstorm',
    items,
    analysis: room?.decision?.analysis || null,
    updatedAt: room.updatedAt,
  }
}

function serializeMeetingState(room) {
  const agenda = (room?.meeting?.agenda || []).map((item) => ({
    id: String(item.id),
    title: String(item.title || ''),
    duration: Number.isFinite(item.duration) ? item.duration : 0,
    completed: Boolean(item.completed),
  }))

  const rawIndex = Number.isFinite(room?.meeting?.currentAgendaIndex)
    ? room.meeting.currentAgendaIndex
    : 0
  const currentAgendaIndex =
    agenda.length > 0 ? Math.min(Math.max(rawIndex, 0), agenda.length - 1) : 0

  return {
    roomId: String(room._id),
    presenter: room?.meeting?.presenter ? String(room.meeting.presenter) : null,
    agenda,
    handQueue: Array.isArray(room?.meeting?.handQueue)
      ? [...new Set(room.meeting.handQueue.map((value) => String(value)))]
      : [],
    currentAgendaIndex,
    isViewportSynced: Boolean(room?.meeting?.isViewportSynced),
    viewport: normalizeCanvasViewport(room?.canvas?.viewport || {}),
    updatedAt: room.updatedAt,
  }
}

function buildGdSummaryText(room, speakers = [], scores = {}) {
  if (!speakers.length) {
    return 'GD round has no speakers yet. Start a round to generate a summary.'
  }

  const safeScores = scores && typeof scores === 'object' ? scores : {}

  const ranking = speakers.map((speaker) => {
    const scoreObj = safeScores[speaker.userId] || {}
    const values = Object.values(scoreObj).filter((value) => Number.isFinite(value))
    const average = values.length
      ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
      : null

    return {
      userId: String(speaker.userId),
      name: String(speaker.name || 'Speaker'),
      average,
    }
  })

  const topPerformer = [...ranking]
    .filter((entry) => entry.average !== null)
    .sort((a, b) => b.average - a.average)[0]

  return [
    `GD Summary${room?.name ? ` - ${room.name}` : ''}`,
    `Total speakers: ${speakers.length}`,
    ...ranking.map((entry, index) => {
      const avgLabel = entry.average === null ? 'n/a' : entry.average.toFixed(2)
      return `${index + 1}. ${entry.name} - avg score: ${avgLabel}`
    }),
    topPerformer
      ? `Top performer: ${topPerformer.name} (${topPerformer.average.toFixed(2)})`
      : 'Top performer: n/a',
    'Suggested next step: convert feedback into 2 concrete speaking improvements per participant.',
  ].join('\n')
}

function normalizeGdMicOverrideUserIds(values = []) {
  if (!Array.isArray(values)) return []

  const seen = new Set()
  const normalized = []

  for (const value of values) {
    const userId = String(value || '').trim()
    if (!userId || seen.has(userId)) continue
    seen.add(userId)
    normalized.push(userId)
  }

  return normalized
}

function serializeGdState(room, options = {}) {
  const { viewerRole = 'member' } = options
  const speakers = (room?.gd?.speakers || []).map((speaker) => ({
    userId: String(speaker.userId),
    name: String(speaker.name || 'Speaker'),
    timeRemaining: Number.isFinite(speaker.timeRemaining) ? speaker.timeRemaining : 120,
    hasSpoken: Boolean(speaker.hasSpoken),
  }))

  const rawIndex = Number.isFinite(room?.gd?.currentSpeakerIndex) ? room.gd.currentSpeakerIndex : 0
  const currentSpeakerIndex =
    speakers.length > 0 ? Math.min(Math.max(rawIndex, 0), speakers.length - 1) : 0
  const summary = viewerRole === 'owner' ? room?.gd?.summary || null : null
  const micOverrideUserIds = normalizeGdMicOverrideUserIds(room?.gd?.micOverrideUserIds || [])

  return {
    roomId: String(room._id),
    currentSpeakerIndex,
    speakers,
    scores: room?.gd?.scores && typeof room.gd.scores === 'object' ? room.gd.scores : {},
    micOverrideUserIds,
    isActive: Boolean(room?.gd?.isActive),
    summary,
    updatedAt: room.updatedAt,
  }
}

async function createUniqueInviteCode(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const inviteCode = generateInviteCode()
    const existing = await Room.exists({ inviteCode })
    if (!existing) return inviteCode
  }
  throw new AppError(500, 'Unable to generate room invite code')
}

async function createUniquePublicId(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const publicId = nanoid(ROOM_PUBLIC_ID_LENGTH)
    const existing = await Room.exists({ publicId })
    if (!existing) return publicId
  }
  throw new AppError(500, 'Unable to generate room public key')
}

async function ensureRoomPublicId(roomDoc) {
  if (!roomDoc || roomDoc.publicId) {
    return roomDoc?.publicId || null
  }

  const nextPublicId = await createUniquePublicId()

  await Room.updateOne(
    {
      _id: roomDoc._id,
      $or: [
        { publicId: { $exists: false } },
        { publicId: null },
        { publicId: '' },
      ],
    },
    {
      $set: {
        publicId: nextPublicId,
      },
    }
  )

  const refreshed = await Room.findById(roomDoc._id).select('publicId').lean()
  const resolvedPublicId = refreshed?.publicId || nextPublicId

  if (typeof roomDoc.set === 'function') {
    roomDoc.set('publicId', resolvedPublicId)
  } else {
    roomDoc.publicId = resolvedPublicId
  }

  return resolvedPublicId
}

async function loadRoomByKey(roomKey, options = {}) {
  const { withRelations = false } = options
  const normalizedRoomKey = normalizeRoomKey(roomKey)

  if (!normalizedRoomKey) return null

  const isObjectIdKey = /^[a-f\d]{24}$/i.test(normalizedRoomKey)
  const queryKeys = [
    { publicId: normalizedRoomKey },
    { inviteCode: normalizedRoomKey.toUpperCase() },
  ]

  if (isObjectIdKey) {
    queryKeys.push({ _id: normalizedRoomKey })
  }

  const query = { $or: queryKeys }

  let roomQuery = Room.findOne(query)
  if (withRelations) {
    roomQuery = roomQuery
      .populate('owner', 'name email')
      .populate('members', 'name email')
  }

  return roomQuery
}

async function loadRoomWithRelations(roomId) {
  return Room.findById(roomId)
    .populate('owner', 'name email')
    .populate('members', 'name email')
}

export const createRoom = asyncHandler(async (req, res) => {
  const { name, topic, mode, access, isPublic } = req.validatedBody
  const finalAccess = access || (isPublic ? 'public' : 'private')

  const room = await Room.create({
    name: name.trim(),
    topic: (topic || '').trim(),
    mode,
    access: finalAccess,
    inviteCode: await createUniqueInviteCode(),
    publicId: await createUniquePublicId(),
    owner: req.user.id,
    members: [req.user.id],
  })

  await RoomMembership.updateOne(
    { room: room._id, user: req.user.id },
    {
      $set: {
        role: 'owner',
        status: 'active',
        invitedBy: null,
      },
    },
    { upsert: true }
  )

  const hydratedRoom = await loadRoomWithRelations(room._id)

  return res.status(201).json({
    room: serializeRoom(hydratedRoom, null, {
      viewerUserId: req.user.id,
      viewerRole: 'owner',
    }),
  })
})

export const getRooms = asyncHandler(async (req, res) => {
  const membershipDocs = await RoomMembership.find({
    user: req.user.id,
    status: 'active',
  })
    .select('room role')
    .lean()

  const membershipRoomIds = membershipDocs.map((doc) => String(doc.room))
  const membershipRoleByRoomId = new Map(
    membershipDocs.map((doc) => [String(doc.room), doc.role || 'member'])
  )

  // One-time migration helper: if older rooms only have members[] data, mirror it into RoomMembership.
  const legacyMemberRooms = await Room.find({
    members: req.user.id,
    owner: { $ne: req.user.id },
  })
    .select('_id owner')
    .lean()

  const missingLegacyRooms = legacyMemberRooms.filter(
    (room) => !membershipRoomIds.includes(String(room._id))
  )

  if (missingLegacyRooms.length > 0) {
    await Promise.all(
      missingLegacyRooms.map((room) =>
        RoomMembership.updateOne(
          { room: room._id, user: req.user.id },
          {
            $set: {
              status: 'active',
              role: 'member',
              invitedBy: room.owner || null,
            },
          },
          { upsert: true }
        )
      )
    )

    membershipRoomIds.push(...missingLegacyRooms.map((room) => String(room._id)))
  }

  const rooms = await Room.find({
    $or: [
      { owner: req.user.id },
      { _id: { $in: membershipRoomIds } },
    ],
  })
    .sort({ updatedAt: -1 })
    .populate('owner', 'name email')
    .populate('members', 'name email')

  await Promise.all(rooms.map((room) => ensureRoomPublicId(room)))

  return res.json({
    rooms: rooms.map((room) => {
      const ownerId = String(room.owner?._id || room.owner || '')
      const roomId = String(room._id)
      const viewerRole =
        ownerId === String(req.user.id)
          ? 'owner'
          : membershipRoleByRoomId.get(roomId) || (room.access === 'public' ? 'viewer' : 'member')

      return serializeRoom(room, null, {
        viewerUserId: req.user.id,
        viewerRole,
      })
    }),
  })
})

export const getRoomById = asyncHandler(async (req, res) => {
  const room = await loadRoomWithRelations(req.params.roomId)

  if (!room) {
    throw new AppError(404, 'Room not found')
  }
  await ensureRoomPublicId(room)
  const allowed = await canAccessRoomWithMembership(room, req.user.id)
  if (!allowed) {
    throw new AppError(403, 'Access denied')
  }

  const roleContext = await getEffectiveRoomRole(req.params.roomId, req.user.id)
  const viewerRole = roleContext?.role || (room.access === 'public' ? 'viewer' : 'member')

  return res.json({
    room: serializeRoom(room, null, {
      viewerUserId: req.user.id,
      viewerRole,
    }),
  })
})

export const getRoomByKey = asyncHandler(async (req, res) => {
  const room = await loadRoomByKey(req.params.roomKey, { withRelations: true })

  if (!room) {
    throw new AppError(404, 'Room not found')
  }

  await ensureRoomPublicId(room)

  const allowed = await canAccessRoomWithMembership(room, req.user.id)
  if (!allowed) {
    const membership = await RoomMembership.findOne({
      room: room._id,
      user: req.user.id,
    })
      .select('status')
      .lean()

    if (membership?.status === 'pending') {
      throw new AppError(403, 'Join request is pending admin approval')
    }

    throw new AppError(403, 'Access denied. Request access from room admin')
  }

  const roleContext = await getEffectiveRoomRole(room._id, req.user.id)
  const viewerRole = roleContext?.role || (room.access === 'public' ? 'viewer' : 'member')

  return res.json({
    room: serializeRoom(room, null, {
      viewerUserId: req.user.id,
      viewerRole,
    }),
  })
})

export const deleteRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.roomId)

  if (!room) {
    throw new AppError(404, 'Room not found')
  }
  if (!isRoomOwner(room, req.user.id)) {
    throw new AppError(403, 'Only the owner can delete this room')
  }

  await Promise.all([
    Stroke.deleteMany({ room: room._id }),
    RoomMembership.deleteMany({ room: room._id }),
    room.deleteOne(),
  ])

  return res.json({ message: 'Room deleted' })
})

export const joinRoomByCode = asyncHandler(async (req, res) => {
  const inviteCode = String(req.params.inviteCode || '').toUpperCase()
  if (!inviteCode || inviteCode.length !== 6) {
    throw new AppError(400, 'Invalid invite code')
  }

  const room = await Room.findOne({ inviteCode })
    .populate('owner', 'name email')
    .populate('members', 'name email')
  if (!room) {
    throw new AppError(404, 'Room not found for this invite code')
  }

  await ensureRoomPublicId(room)

  if (String(room.owner?._id || room.owner) === String(req.user.id)) {
    return res.json({
      status: 'active',
      room: serializeRoom(room, null, {
        viewerUserId: req.user.id,
        viewerRole: 'owner',
      }),
    })
  }

  const existingMembership = await RoomMembership.findOne({
    room: room._id,
    user: req.user.id,
  })
    .select('status role')
    .lean()

  if (existingMembership?.status === 'banned') {
    throw new AppError(403, 'You are not allowed to join this room')
  }

  if (existingMembership?.status === 'active') {
    return res.json({
      status: 'active',
      room: serializeRoom(room, null, {
        viewerUserId: req.user.id,
        viewerRole: existingMembership?.role || 'member',
      }),
    })
  }

  if (existingMembership?.status === 'pending') {
    return res.json({
      status: 'pending',
      room: buildRoomJoinPreview(room),
      message: 'Join request is already pending admin approval',
    })
  }

  if (room.access === 'private') {
    await RoomMembership.updateOne(
      { room: room._id, user: req.user.id },
      {
        $set: {
          status: 'pending',
          role: existingMembership?.role || 'member',
        },
        $setOnInsert: {
          invitedBy: room.owner?._id || room.owner,
        },
      },
      { upsert: true }
    )

    return res.json({
      status: 'pending',
      room: buildRoomJoinPreview(room),
      message: 'Join request sent to room admins',
    })
  }

    const alreadyMember = room.members.some(
      (member) => String(member?._id || member) === String(req.user.id)
    )
  if (!alreadyMember) {
    room.members.push(req.user.id)
    await room.save()
  }

  await RoomMembership.updateOne(
    { room: room._id, user: req.user.id },
    {
      $set: {
        status: 'active',
        role: existingMembership?.role || 'member',
      },
      $setOnInsert: {
        invitedBy: room.owner?._id || room.owner,
      },
    },
    { upsert: true }
  )

  const hydratedRoom = await loadRoomWithRelations(room._id)
  await ensureRoomPublicId(hydratedRoom)

  return res.json({
    status: 'active',
    room: serializeRoom(hydratedRoom, null, {
      viewerUserId: req.user.id,
      viewerRole: existingMembership?.role || 'member',
    }),
  })
})

export const requestRoomAccessByKey = asyncHandler(async (req, res) => {
  const room = await loadRoomByKey(req.params.roomKey, { withRelations: true })

  if (!room) {
    throw new AppError(404, 'Room not found')
  }

  await ensureRoomPublicId(room)

  if (String(room.owner?._id || room.owner) === String(req.user.id)) {
    return res.json({
      status: 'active',
      room: serializeRoom(room, null, {
        viewerUserId: req.user.id,
        viewerRole: 'owner',
      }),
      message: 'Owner access granted',
    })
  }

  const existingMembership = await RoomMembership.findOne({
    room: room._id,
    user: req.user.id,
  })
    .select('status role')
    .lean()

  if (existingMembership?.status === 'banned') {
    throw new AppError(403, 'Your access to this room has been blocked')
  }

  if (existingMembership?.status === 'active') {
    return res.json({
      status: 'active',
      room: serializeRoom(room, null, {
        viewerUserId: req.user.id,
        viewerRole: existingMembership.role || 'member',
      }),
      message: 'Already a room member',
    })
  }

  if (existingMembership?.status === 'pending') {
    return res.json({
      status: 'pending',
      room: buildRoomJoinPreview(room),
      message: 'Join request already pending admin approval',
    })
  }

  if (room.access === 'public') {
    const alreadyMember = room.members.some(
      (member) => String(member?._id || member) === String(req.user.id)
    )
    if (!alreadyMember) {
      room.members.push(req.user.id)
      await room.save()
    }

    await RoomMembership.updateOne(
      { room: room._id, user: req.user.id },
      {
        $set: {
          status: 'active',
          role: existingMembership?.role || 'member',
        },
        $setOnInsert: {
          invitedBy: room.owner?._id || room.owner,
        },
      },
      { upsert: true }
    )

    const hydratedRoom = await loadRoomWithRelations(room._id)
    await ensureRoomPublicId(hydratedRoom)

    return res.json({
      status: 'active',
      room: serializeRoom(hydratedRoom, null, {
        viewerUserId: req.user.id,
        viewerRole: existingMembership?.role || 'member',
      }),
      message: 'Joined room successfully',
    })
  }

  await RoomMembership.updateOne(
    { room: room._id, user: req.user.id },
    {
      $set: {
        status: 'pending',
        role: existingMembership?.role || 'member',
      },
      $setOnInsert: {
        invitedBy: room.owner?._id || room.owner,
      },
    },
    { upsert: true }
  )

  return res.json({
    status: 'pending',
    room: buildRoomJoinPreview(room),
    message: 'Join request sent to room admins',
  })
})

export const getRoomAccessStatusByKey = asyncHandler(async (req, res) => {
  const room = await loadRoomByKey(req.params.roomKey, { withRelations: true })

  if (!room) {
    throw new AppError(404, 'Room not found')
  }

  await ensureRoomPublicId(room)

  if (String(room.owner?._id || room.owner) === String(req.user.id)) {
    return res.json({
      status: 'active',
      room: serializeRoom(room, null, {
        viewerUserId: req.user.id,
        viewerRole: 'owner',
      }),
    })
  }

  const membership = await RoomMembership.findOne({
    room: room._id,
    user: req.user.id,
  })
    .select('status role')
    .lean()

  if (membership?.status === 'active') {
    return res.json({
      status: 'active',
      room: serializeRoom(room, null, {
        viewerUserId: req.user.id,
        viewerRole: membership.role || 'member',
      }),
    })
  }

  if (membership?.status === 'pending') {
    return res.json({
      status: 'pending',
      room: buildRoomJoinPreview(room),
      message: 'Waiting for admin approval',
    })
  }

  if (membership?.status === 'banned' || membership?.status === 'removed') {
    return res.json({
      status: 'denied',
      room: buildRoomJoinPreview(room),
      message: 'Access request was declined by room admin',
    })
  }

  return res.json({
    status: 'not-requested',
    room: buildRoomJoinPreview(room),
  })
})

export const getRoomJoinRequests = asyncHandler(async (req, res) => {
  const { roomId } = req.params

  const roleCheck = await hasRoomRole(roomId, req.user.id, ['owner', 'moderator'])

  if (!roleCheck.room) {
    throw new AppError(404, 'Room not found')
  }

  if (roleCheck.reason === 'blocked') {
    throw new AppError(403, 'Access denied')
  }

  if (!roleCheck.allowed) {
    throw new AppError(403, 'Only room admins can view join requests')
  }

  const requests = await RoomMembership.find({
    room: roomId,
    status: 'pending',
  })
    .populate('user', 'name email')
    .sort({ createdAt: 1 })
    .lean()

  return res.json({
    requests: requests.map((request) => ({
      userId: String(request.user?._id || request.user || ''),
      name: request.user?.name || 'Member',
      email: request.user?.email || null,
      role: request.role || 'member',
      status: request.status,
      requestedAt: request.createdAt,
    })),
  })
})

export const approveRoomJoinRequest = asyncHandler(async (req, res) => {
  const { roomId, userId } = req.params

  const roleCheck = await hasRoomRole(roomId, req.user.id, ['owner', 'moderator'])

  if (!roleCheck.room) {
    throw new AppError(404, 'Room not found')
  }

  if (roleCheck.reason === 'blocked') {
    throw new AppError(403, 'Access denied')
  }

  if (!roleCheck.allowed) {
    throw new AppError(403, 'Only room admins can approve join requests')
  }

  const membership = await RoomMembership.findOne({ room: roomId, user: userId })
  if (!membership) {
    throw new AppError(404, 'Join request not found')
  }

  if (membership.status === 'banned') {
    throw new AppError(403, 'This user is banned from the room')
  }

  membership.status = 'active'
  if (!membership.role || membership.role === 'viewer') {
    membership.role = 'member'
  }
  await membership.save()

  await Room.updateOne({ _id: roomId }, { $addToSet: { members: userId } })

  const user = await User.findById(userId).select('_id name email').lean()

  return res.json({
    message: 'Join request approved',
    member: {
      userId: String(user?._id || userId),
      name: user?.name || 'Member',
      email: user?.email || null,
      role: membership.role,
      status: membership.status,
    },
  })
})

export const rejectRoomJoinRequest = asyncHandler(async (req, res) => {
  const { roomId, userId } = req.params

  const roleCheck = await hasRoomRole(roomId, req.user.id, ['owner', 'moderator'])

  if (!roleCheck.room) {
    throw new AppError(404, 'Room not found')
  }

  if (roleCheck.reason === 'blocked') {
    throw new AppError(403, 'Access denied')
  }

  if (!roleCheck.allowed) {
    throw new AppError(403, 'Only room admins can reject join requests')
  }

  const membership = await RoomMembership.findOne({ room: roomId, user: userId })
  if (!membership) {
    throw new AppError(404, 'Join request not found')
  }

  membership.status = 'removed'
  await membership.save()

  await Room.updateOne({ _id: roomId }, { $pull: { members: userId } })

  return res.json({
    message: 'Join request rejected',
    userId: String(userId),
  })
})

export const getRoomStrokes = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.roomId)
    .select('owner members access')
    .populate('owner', 'name email')
    .populate('members', 'name email')

  if (!room) {
    throw new AppError(404, 'Room not found')
  }
  const allowed = await canAccessRoomWithMembership(room, req.user.id)
  if (!allowed) {
    throw new AppError(403, 'Access denied')
  }

  const strokes = await Stroke.find({ room: room._id }).sort({ timestamp: 1 }).lean()

  return res.json({
    strokes: strokes.map(serializeStrokeRecord),
  })
})

export const getCanvasState = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.roomId).select(
    'owner members access mode canvas updatedAt'
  )

  if (!room) {
    throw new AppError(404, 'Room not found')
  }

  const allowed = await canAccessRoomWithMembership(room, req.user.id)
  if (!allowed) {
    throw new AppError(403, 'Access denied')
  }

  if (room.mode !== 'canvas') {
    throw new AppError(400, 'Canvas state is only available for canvas mode rooms')
  }

  const strokes = await Stroke.find({ room: room._id }).sort({ timestamp: 1 }).lean()

  return res.json({
    state: buildCanvasState(room, strokes),
  })
})

export const updateCanvasMeta = asyncHandler(async (req, res) => {
  const { roomId } = req.params
  const { boardTitle, viewport } = req.validatedBody

  const roleCheck = await hasRoomRole(roomId, req.user.id, ['owner', 'moderator'])

  if (!roleCheck.room) {
    throw new AppError(404, 'Room not found')
  }

  if (roleCheck.reason === 'blocked') {
    throw new AppError(403, 'Access denied')
  }

  if (!roleCheck.allowed) {
    throw new AppError(403, 'Only owner or moderator can update canvas metadata')
  }

  if (roleCheck.room.mode !== 'canvas') {
    throw new AppError(400, 'Canvas metadata is only available for canvas mode rooms')
  }

  const now = new Date()
  const canvasUpdates = {
    'canvas.lastEditedBy': req.user.id,
    'canvas.lastEditedAt': now,
  }

  if (boardTitle !== undefined) {
    canvasUpdates['canvas.boardTitle'] = boardTitle.trim()
  }

  if (viewport !== undefined) {
    canvasUpdates['canvas.viewport'] = normalizeCanvasViewport(viewport)
  }

  await Room.updateOne(
    { _id: roomId },
    {
      $set: canvasUpdates,
    }
  )

  const [room, strokeCount] = await Promise.all([
    Room.findById(roomId).select('_id canvas updatedAt').lean(),
    Stroke.countDocuments({ room: roomId }),
  ])

  return res.json({
    message: 'Canvas metadata updated',
    state: {
      roomId: String(roomId),
      boardTitle: room?.canvas?.boardTitle || '',
      viewport: normalizeCanvasViewport(room?.canvas?.viewport || {}),
      strokeCount,
      lastUpdated: room?.canvas?.lastEditedAt || now,
      lastEditedBy: room?.canvas?.lastEditedBy || req.user.id,
    },
  })
})

export const clearCanvasState = asyncHandler(async (req, res) => {
  const { roomId } = req.params

  const roleCheck = await hasRoomRole(roomId, req.user.id, ['owner'])

  if (!roleCheck.room) {
    throw new AppError(404, 'Room not found')
  }

  if (roleCheck.reason === 'blocked') {
    throw new AppError(403, 'Access denied')
  }

  if (!roleCheck.allowed) {
    throw new AppError(403, 'Only the owner can clear this canvas')
  }

  if (roleCheck.room.mode !== 'canvas') {
    throw new AppError(400, 'Canvas clear is only available for canvas mode rooms')
  }

  const now = new Date()

  await Promise.all([
    Stroke.deleteMany({ room: roomId }),
    Room.updateOne(
      { _id: roomId },
      {
        $set: {
          'canvas.lastEditedBy': req.user.id,
          'canvas.lastEditedAt': now,
        },
      }
    ),
  ])

  const room = await Room.findById(roomId).select('_id canvas updatedAt').lean()

  return res.json({
    message: 'Canvas cleared',
    state: {
      roomId: String(roomId),
      boardTitle: room?.canvas?.boardTitle || '',
      viewport: normalizeCanvasViewport(room?.canvas?.viewport || {}),
      strokeCount: 0,
      lastUpdated: room?.canvas?.lastEditedAt || now,
      lastEditedBy: room?.canvas?.lastEditedBy || req.user.id,
      strokes: [],
    },
  })
})

export const getDecisionState = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.roomId).select(
    'owner members access mode decision updatedAt name topic'
  )

  if (!room) {
    throw new AppError(404, 'Room not found')
  }

  const allowed = await canAccessRoomWithMembership(room, req.user.id)
  if (!allowed) {
    throw new AppError(403, 'Access denied')
  }

  if (room.mode !== 'decision') {
    throw new AppError(400, 'Decision state is only available for decision mode rooms')
  }

  return res.json({
    state: serializeDecisionState(room),
  })
})

export const updateDecisionPhase = asyncHandler(async (req, res) => {
  const { roomId } = req.params
  const { phase } = req.validatedBody

  const roleCheck = await hasRoomRole(roomId, req.user.id, ['owner', 'moderator'])

  if (!roleCheck.room) {
    throw new AppError(404, 'Room not found')
  }

  if (roleCheck.reason === 'blocked') {
    throw new AppError(403, 'Access denied')
  }

  if (!roleCheck.allowed) {
    throw new AppError(403, 'Only owner or moderator can change decision phase')
  }

  if (roleCheck.room.mode !== 'decision') {
    throw new AppError(400, 'Decision phase is only available for decision mode rooms')
  }

  const decisionUpdates = {
    'decision.phase': phase,
  }

  if (phase === 'analysis') {
    decisionUpdates['decision.analysis'] = buildDecisionAnalysisText(
      roleCheck.room,
      roleCheck.room?.decision?.items || []
    )
  }

  await Room.updateOne(
    { _id: roomId },
    {
      $set: decisionUpdates,
    }
  )

  const room = await Room.findById(roomId).select('decision updatedAt _id')

  return res.json({
    message: 'Decision phase updated',
    state: serializeDecisionState(room),
  })
})

export const addDecisionItem = asyncHandler(async (req, res) => {
  const { roomId } = req.params
  const { text, type } = req.validatedBody

  const room = await Room.findById(roomId).select('owner members access mode decision updatedAt')

  if (!room) {
    throw new AppError(404, 'Room not found')
  }

  const allowed = await canAccessRoomWithMembership(room, req.user.id)
  if (!allowed) {
    throw new AppError(403, 'Access denied')
  }

  if (room.mode !== 'decision') {
    throw new AppError(400, 'Decision items are only available for decision mode rooms')
  }

  const normalizedItem = {
    id: nanoid(10),
    text: String(text).trim(),
    type: normalizeDecisionType(type),
    votes: [],
    createdBy: req.user.id,
  }

  await Room.updateOne(
    { _id: roomId },
    {
      $push: { 'decision.items': normalizedItem },
      $set: { 'decision.analysis': null },
    }
  )

  const updatedRoom = await Room.findById(roomId).select('decision updatedAt _id')

  return res.status(201).json({
    message: 'Decision item added',
    item: normalizedItem,
    state: serializeDecisionState(updatedRoom),
  })
})

export const removeDecisionItem = asyncHandler(async (req, res) => {
  const { roomId, itemId } = req.params

  const room = await Room.findById(roomId).select('owner members access mode decision updatedAt')
  if (!room) {
    throw new AppError(404, 'Room not found')
  }

  const allowed = await canAccessRoomWithMembership(room, req.user.id)
  if (!allowed) {
    throw new AppError(403, 'Access denied')
  }

  if (room.mode !== 'decision') {
    throw new AppError(400, 'Decision items are only available for decision mode rooms')
  }

  const item = (room.decision?.items || []).find((entry) => String(entry.id) === String(itemId))
  if (!item) {
    throw new AppError(404, 'Decision item not found')
  }

  const roleCheck = await hasRoomRole(roomId, req.user.id, ['owner', 'moderator'])
  const canModerate = roleCheck.allowed && roleCheck.reason === 'ok'
  const isCreator = String(item.createdBy) === String(req.user.id)

  if (!canModerate && !isCreator) {
    throw new AppError(403, 'Only owner, moderator, or item creator can remove this item')
  }

  await Room.updateOne(
    { _id: roomId },
    {
      $pull: { 'decision.items': { id: String(itemId) } },
      $set: { 'decision.analysis': null },
    }
  )

  const updatedRoom = await Room.findById(roomId).select('decision updatedAt _id')

  return res.json({
    message: 'Decision item removed',
    state: serializeDecisionState(updatedRoom),
  })
})

export const voteDecisionItem = asyncHandler(async (req, res) => {
  const { roomId, itemId } = req.params
  const voterId = req.user.id

  const room = await Room.findById(roomId).select('owner members access mode decision updatedAt')
  if (!room) {
    throw new AppError(404, 'Room not found')
  }

  const allowed = await canAccessRoomWithMembership(room, req.user.id)
  if (!allowed) {
    throw new AppError(403, 'Access denied')
  }

  if (room.mode !== 'decision') {
    throw new AppError(400, 'Decision voting is only available for decision mode rooms')
  }

  const itemExists = (room.decision?.items || []).some((entry) => String(entry.id) === String(itemId))
  if (!itemExists) {
    throw new AppError(404, 'Decision item not found')
  }

  const updateResult = await Room.updateOne(
    {
      _id: roomId,
      'decision.items.id': String(itemId),
    },
    {
      $addToSet: { 'decision.items.$.votes': voterId },
    }
  )

  const updatedRoom = await Room.findById(roomId).select('decision updatedAt _id')
  const wasNewVote = updateResult.modifiedCount > 0

  return res.json({
    message: wasNewVote ? 'Vote recorded' : 'Vote already recorded',
    state: serializeDecisionState(updatedRoom),
  })
})

export const getMeetingState = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.roomId).select(
    'owner members access mode meeting canvas updatedAt'
  )

  if (!room) {
    throw new AppError(404, 'Room not found')
  }

  const allowed = await canAccessRoomWithMembership(room, req.user.id)
  if (!allowed) {
    throw new AppError(403, 'Access denied')
  }

  if (room.mode !== 'meeting') {
    throw new AppError(400, 'Meeting state is only available for meeting mode rooms')
  }

  return res.json({
    state: serializeMeetingState(room),
  })
})

export const updateMeetingPresenter = asyncHandler(async (req, res) => {
  const { roomId } = req.params
  const { presenterUserId } = req.validatedBody

  const roleCheck = await hasRoomRole(roomId, req.user.id, ['owner', 'moderator'])

  if (!roleCheck.room) {
    throw new AppError(404, 'Room not found')
  }

  if (roleCheck.reason === 'blocked') {
    throw new AppError(403, 'Access denied')
  }

  if (!roleCheck.allowed) {
    throw new AppError(403, 'Only owner or moderator can set presenter')
  }

  if (roleCheck.room.mode !== 'meeting') {
    throw new AppError(400, 'Meeting presenter is only available for meeting mode rooms')
  }

  const nextPresenter = String(presenterUserId || req.user.id).trim()

  await Room.updateOne(
    { _id: roomId },
    {
      $set: {
        'meeting.presenter': nextPresenter,
      },
    }
  )

  const updatedRoom = await Room.findById(roomId).select('meeting canvas updatedAt _id')

  return res.json({
    message: 'Meeting presenter updated',
    state: serializeMeetingState(updatedRoom),
  })
})

export const updateMeetingAgenda = asyncHandler(async (req, res) => {
  const { roomId } = req.params
  const { agenda } = req.validatedBody

  const roleCheck = await hasRoomRole(roomId, req.user.id, ['owner', 'moderator'])

  if (!roleCheck.room) {
    throw new AppError(404, 'Room not found')
  }

  if (roleCheck.reason === 'blocked') {
    throw new AppError(403, 'Access denied')
  }

  if (roleCheck.room.mode !== 'meeting') {
    throw new AppError(400, 'Meeting agenda is only available for meeting mode rooms')
  }

  const canModerate = roleCheck.allowed && roleCheck.reason === 'ok'
  const isPresenter = String(roleCheck.room?.meeting?.presenter || '') === String(req.user.id)

  if (!canModerate && !isPresenter) {
    throw new AppError(403, 'Only owner, moderator, or presenter can update agenda')
  }

  const normalizedAgenda = (agenda || [])
    .map((item) => ({
      id: String(item.id || nanoid(8)),
      title: String(item.title || '').trim(),
      duration: Math.max(0, Number.isFinite(item.duration) ? Math.round(item.duration) : 0),
      completed: Boolean(item.completed),
    }))
    .filter((item) => item.title.length > 0)

  const currentIndex = Number.isFinite(roleCheck.room?.meeting?.currentAgendaIndex)
    ? roleCheck.room.meeting.currentAgendaIndex
    : 0
  const nextIndex =
    normalizedAgenda.length > 0
      ? Math.min(Math.max(currentIndex, 0), normalizedAgenda.length - 1)
      : 0

  await Room.updateOne(
    { _id: roomId },
    {
      $set: {
        'meeting.agenda': normalizedAgenda,
        'meeting.currentAgendaIndex': nextIndex,
      },
    }
  )

  const updatedRoom = await Room.findById(roomId).select('meeting canvas updatedAt _id')

  return res.json({
    message: 'Meeting agenda updated',
    state: serializeMeetingState(updatedRoom),
  })
})

export const updateMeetingAgendaIndex = asyncHandler(async (req, res) => {
  const { roomId } = req.params
  const { index } = req.validatedBody

  const roleCheck = await hasRoomRole(roomId, req.user.id, ['owner', 'moderator'])

  if (!roleCheck.room) {
    throw new AppError(404, 'Room not found')
  }

  if (roleCheck.reason === 'blocked') {
    throw new AppError(403, 'Access denied')
  }

  if (roleCheck.room.mode !== 'meeting') {
    throw new AppError(400, 'Meeting agenda index is only available for meeting mode rooms')
  }

  const canModerate = roleCheck.allowed && roleCheck.reason === 'ok'
  const isPresenter = String(roleCheck.room?.meeting?.presenter || '') === String(req.user.id)

  if (!canModerate && !isPresenter) {
    throw new AppError(403, 'Only owner, moderator, or presenter can change agenda index')
  }

  const agendaLength = Array.isArray(roleCheck.room?.meeting?.agenda)
    ? roleCheck.room.meeting.agenda.length
    : 0

  const safeIndex =
    agendaLength > 0 ? Math.min(Math.max(Number(index), 0), agendaLength - 1) : 0

  await Room.updateOne(
    { _id: roomId },
    {
      $set: {
        'meeting.currentAgendaIndex': safeIndex,
      },
    }
  )

  const updatedRoom = await Room.findById(roomId).select('meeting canvas updatedAt _id')

  return res.json({
    message: 'Meeting agenda index updated',
    state: serializeMeetingState(updatedRoom),
  })
})

export const updateMeetingViewport = asyncHandler(async (req, res) => {
  const { roomId } = req.params
  const { viewport, isViewportSynced } = req.validatedBody

  const roleCheck = await hasRoomRole(roomId, req.user.id, ['owner', 'moderator'])

  if (!roleCheck.room) {
    throw new AppError(404, 'Room not found')
  }

  if (roleCheck.reason === 'blocked') {
    throw new AppError(403, 'Access denied')
  }

  if (roleCheck.room.mode !== 'meeting') {
    throw new AppError(400, 'Meeting viewport is only available for meeting mode rooms')
  }

  const canModerate = roleCheck.allowed && roleCheck.reason === 'ok'
  const isPresenter = String(roleCheck.room?.meeting?.presenter || '') === String(req.user.id)

  if (!canModerate && !isPresenter) {
    throw new AppError(403, 'Only owner, moderator, or presenter can sync viewport')
  }

  const updates = {}

  if (viewport !== undefined) {
    updates['canvas.viewport'] = normalizeCanvasViewport(viewport)
    updates['meeting.isViewportSynced'] =
      isViewportSynced !== undefined ? Boolean(isViewportSynced) : true
  }

  if (isViewportSynced !== undefined) {
    updates['meeting.isViewportSynced'] = Boolean(isViewportSynced)
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError(400, 'Provide viewport and/or isViewportSynced')
  }

  await Room.updateOne(
    { _id: roomId },
    {
      $set: updates,
    }
  )

  const updatedRoom = await Room.findById(roomId).select('meeting canvas updatedAt _id')

  return res.json({
    message: 'Meeting viewport updated',
    state: serializeMeetingState(updatedRoom),
  })
})

export const raiseMeetingHand = asyncHandler(async (req, res) => {
  const { roomId } = req.params

  const room = await Room.findById(roomId).select('owner members access mode meeting canvas updatedAt')
  if (!room) {
    throw new AppError(404, 'Room not found')
  }

  const allowed = await canAccessRoomWithMembership(room, req.user.id)
  if (!allowed) {
    throw new AppError(403, 'Access denied')
  }

  if (room.mode !== 'meeting') {
    throw new AppError(400, 'Meeting hand queue is only available for meeting mode rooms')
  }

  await Room.updateOne(
    { _id: roomId },
    {
      $addToSet: { 'meeting.handQueue': req.user.id },
    }
  )

  const updatedRoom = await Room.findById(roomId).select('meeting canvas updatedAt _id')

  return res.json({
    message: 'Hand raised',
    state: serializeMeetingState(updatedRoom),
  })
})

export const lowerMeetingHand = asyncHandler(async (req, res) => {
  const { roomId } = req.params

  const room = await Room.findById(roomId).select('owner members access mode meeting canvas updatedAt')
  if (!room) {
    throw new AppError(404, 'Room not found')
  }

  const allowed = await canAccessRoomWithMembership(room, req.user.id)
  if (!allowed) {
    throw new AppError(403, 'Access denied')
  }

  if (room.mode !== 'meeting') {
    throw new AppError(400, 'Meeting hand queue is only available for meeting mode rooms')
  }

  await Room.updateOne(
    { _id: roomId },
    {
      $pull: { 'meeting.handQueue': req.user.id },
    }
  )

  const updatedRoom = await Room.findById(roomId).select('meeting canvas updatedAt _id')

  return res.json({
    message: 'Hand lowered',
    state: serializeMeetingState(updatedRoom),
  })
})

export const getGdState = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.roomId).select('owner members access mode gd updatedAt name')

  if (!room) {
    throw new AppError(404, 'Room not found')
  }

  const allowed = await canAccessRoomWithMembership(room, req.user.id)
  if (!allowed) {
    throw new AppError(403, 'Access denied')
  }

  if (room.mode !== 'gd') {
    throw new AppError(400, 'GD state is only available for GD mode rooms')
  }

  const roleContext = await getEffectiveRoomRole(req.params.roomId, req.user.id)
  const viewerRole = roleContext?.role || (room.access === 'public' ? 'viewer' : 'member')

  return res.json({
    state: serializeGdState(room, { viewerRole }),
  })
})

export const startGdRound = asyncHandler(async (req, res) => {
  const { roomId } = req.params
  const { speakers } = req.validatedBody

  const roleCheck = await hasRoomRole(roomId, req.user.id, ['owner', 'moderator'])

  if (!roleCheck.room) {
    throw new AppError(404, 'Room not found')
  }

  if (roleCheck.reason === 'blocked') {
    throw new AppError(403, 'Access denied')
  }

  if (!roleCheck.allowed) {
    throw new AppError(403, 'Only owner or moderator can start GD round')
  }

  if (roleCheck.room.mode !== 'gd') {
    throw new AppError(400, 'GD round controls are only available for GD mode rooms')
  }

  const ownerId = String(roleCheck.room.owner || '')

  const normalizedSpeakers = (speakers || [])
    .map((speaker) => ({
      userId: String(speaker.userId || '').trim(),
      name: String(speaker.name || '').trim(),
      timeRemaining: Math.max(
        30,
        Number.isFinite(speaker.timeRemaining) ? Math.round(speaker.timeRemaining) : 120
      ),
      hasSpoken: Boolean(speaker.hasSpoken),
    }))
    .filter(
      (speaker) =>
        speaker.userId.length > 0 &&
        speaker.name.length > 0 &&
        String(speaker.userId) !== ownerId
    )

  const uniqueSpeakers = []
  const seen = new Set()
  for (const speaker of normalizedSpeakers) {
    if (seen.has(speaker.userId)) continue
    seen.add(speaker.userId)
    uniqueSpeakers.push(speaker)
  }

  if (uniqueSpeakers.length === 0) {
    throw new AppError(400, 'Add at least one participant other than host to start GD round')
  }

  await Room.updateOne(
    { _id: roomId },
    {
      $set: {
        'gd.speakers': uniqueSpeakers,
        'gd.currentSpeakerIndex': 0,
        'gd.isActive': true,
        'gd.scores': {},
        'gd.micOverrideUserIds': [],
        'gd.summary': null,
      },
    }
  )

  const updatedRoom = await Room.findById(roomId).select('gd updatedAt _id')

  return res.json({
    message: 'GD round started',
    state: serializeGdState(updatedRoom, { viewerRole: roleCheck.role || 'member' }),
  })
})

export const advanceGdSpeaker = asyncHandler(async (req, res) => {
  const { roomId } = req.params
  const { index } = req.validatedBody

  const roleCheck = await hasRoomRole(roomId, req.user.id, ['owner', 'moderator'])

  if (!roleCheck.room) {
    throw new AppError(404, 'Room not found')
  }

  if (roleCheck.reason === 'blocked') {
    throw new AppError(403, 'Access denied')
  }

  if (!roleCheck.allowed) {
    throw new AppError(403, 'Only owner or moderator can advance speaker')
  }

  if (roleCheck.room.mode !== 'gd') {
    throw new AppError(400, 'GD round controls are only available for GD mode rooms')
  }

  const speakerCount = Array.isArray(roleCheck.room?.gd?.speakers)
    ? roleCheck.room.gd.speakers.length
    : 0

  if (speakerCount === 0) {
    throw new AppError(400, 'Start GD round before advancing speaker')
  }

  const safeIndex = Math.min(Math.max(Number(index), 0), speakerCount - 1)

  await Room.updateOne(
    { _id: roomId },
    {
      $set: {
        'gd.currentSpeakerIndex': safeIndex,
        'gd.isActive': true,
        'gd.micOverrideUserIds': [],
      },
    }
  )

  const updatedRoom = await Room.findById(roomId).select('gd updatedAt _id')

  return res.json({
    message: 'GD speaker advanced',
    state: serializeGdState(updatedRoom, { viewerRole: roleCheck.role || 'member' }),
  })
})

export const setGdMicAccess = asyncHandler(async (req, res) => {
  const { roomId } = req.params
  const { userId, enabled } = req.validatedBody

  const roleCheck = await hasRoomRole(roomId, req.user.id, ['owner', 'moderator'])

  if (!roleCheck.room) {
    throw new AppError(404, 'Room not found')
  }

  if (roleCheck.reason === 'blocked') {
    throw new AppError(403, 'Access denied')
  }

  if (!roleCheck.allowed) {
    throw new AppError(403, 'Only owner or moderator can control GD mic access')
  }

  if (roleCheck.room.mode !== 'gd') {
    throw new AppError(400, 'GD mic access is only available for GD mode rooms')
  }

  const targetUserId = String(userId || '').trim()
  if (!targetUserId) {
    throw new AppError(400, 'Target user is required for mic access update')
  }

  const speakerExists = (roleCheck.room?.gd?.speakers || []).some(
    (speaker) => String(speaker.userId) === targetUserId
  )

  if (!speakerExists) {
    throw new AppError(404, 'Only active GD speakers can receive mic override access')
  }

  if (enabled) {
    await Room.updateOne(
      { _id: roomId },
      {
        $addToSet: {
          'gd.micOverrideUserIds': targetUserId,
        },
      }
    )
  } else {
    await Room.updateOne(
      { _id: roomId },
      {
        $pull: {
          'gd.micOverrideUserIds': targetUserId,
        },
      }
    )
  }

  const updatedRoom = await Room.findById(roomId).select('gd updatedAt _id')

  return res.json({
    message: enabled ? 'Mic access granted' : 'Mic access revoked',
    state: serializeGdState(updatedRoom, { viewerRole: roleCheck.role || 'member' }),
  })
})

export const submitGdSpeakerScore = asyncHandler(async (req, res) => {
  const { roomId, speakerUserId } = req.params
  const { scores } = req.validatedBody

  const roleCheck = await hasRoomRole(roomId, req.user.id, ['owner', 'moderator'])

  if (!roleCheck.room) {
    throw new AppError(404, 'Room not found')
  }

  if (roleCheck.reason === 'blocked') {
    throw new AppError(403, 'Access denied')
  }

  if (!roleCheck.allowed) {
    throw new AppError(403, 'Only owner or moderator can submit GD scores')
  }

  if (roleCheck.room.mode !== 'gd') {
    throw new AppError(400, 'GD scoring is only available for GD mode rooms')
  }

  const normalizedSpeakerUserId = String(speakerUserId || '').trim()
  const speakerExists = (roleCheck.room?.gd?.speakers || []).some(
    (speaker) => String(speaker.userId) === normalizedSpeakerUserId
  )

  if (!speakerExists) {
    throw new AppError(404, 'GD speaker not found')
  }

  const normalizedScores = Object.entries(scores || {}).reduce((accumulator, [key, value]) => {
    if (!Number.isFinite(value)) return accumulator
    accumulator[String(key)] = Math.min(Math.max(Number(value), 0), 10)
    return accumulator
  }, {})

  if (Object.keys(normalizedScores).length === 0) {
    throw new AppError(400, 'Provide at least one numeric score')
  }

  await Room.updateOne(
    { _id: roomId },
    {
      $set: {
        [`gd.scores.${normalizedSpeakerUserId}`]: normalizedScores,
      },
    }
  )

  const updatedRoom = await Room.findById(roomId).select('gd updatedAt _id')

  return res.json({
    message: 'GD score submitted',
    state: serializeGdState(updatedRoom, { viewerRole: roleCheck.role || 'member' }),
  })
})

export const endGdRound = asyncHandler(async (req, res) => {
  const { roomId } = req.params
  const { summary } = req.validatedBody

  const roleCheck = await hasRoomRole(roomId, req.user.id, ['owner', 'moderator'])

  if (!roleCheck.room) {
    throw new AppError(404, 'Room not found')
  }

  if (roleCheck.reason === 'blocked') {
    throw new AppError(403, 'Access denied')
  }

  if (!roleCheck.allowed) {
    throw new AppError(403, 'Only owner or moderator can end GD round')
  }

  if (roleCheck.room.mode !== 'gd') {
    throw new AppError(400, 'GD round controls are only available for GD mode rooms')
  }

  const providedSummary = String(summary || '').trim()
  const nextSummary =
    providedSummary ||
    buildGdSummaryText(
      roleCheck.room,
      roleCheck.room?.gd?.speakers || [],
      roleCheck.room?.gd?.scores || {}
    )

  await Room.updateOne(
    { _id: roomId },
    {
      $set: {
        'gd.isActive': false,
        'gd.micOverrideUserIds': [],
        'gd.summary': nextSummary,
      },
    }
  )

  const updatedRoom = await Room.findById(roomId).select('gd updatedAt _id')

  return res.json({
    message: 'GD round ended',
    state: serializeGdState(updatedRoom, { viewerRole: roleCheck.role || 'member' }),
  })
})

export const updateRoomMemberRole = asyncHandler(async (req, res) => {
  const { roomId, userId } = req.params
  const { role, status } = req.validatedBody

  const room = await Room.findById(roomId).select('owner members')
  if (!room) {
    throw new AppError(404, 'Room not found')
  }

  if (!isRoomOwner(room, req.user.id)) {
    throw new AppError(403, 'Only the owner can update member roles')
  }

  if (String(room.owner) === String(userId)) {
    throw new AppError(400, 'Owner role cannot be changed via this endpoint')
  }

  const user = await User.findById(userId).select('_id name email').lean()
  if (!user) {
    throw new AppError(404, 'Target user not found')
  }

  const nextStatus = status || 'active'

  await RoomMembership.updateOne(
    { room: roomId, user: userId },
    {
      $set: {
        role,
        status: nextStatus,
      },
      $setOnInsert: {
        invitedBy: req.user.id,
      },
    },
    { upsert: true }
  )

  if (nextStatus === 'active') {
    await Room.updateOne({ _id: roomId }, { $addToSet: { members: userId } })
  } else {
    await Room.updateOne({ _id: roomId }, { $pull: { members: userId } })
  }

  return res.json({
    message: 'Member role updated',
    member: {
      userId: String(user._id),
      name: user.name,
      email: user.email,
      role,
      status: nextStatus,
    },
  })
})
