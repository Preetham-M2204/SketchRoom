import RoomMembership from '../models/RoomMembership.js'
import Room from '../models/Room.js'

function normalizeId(value) {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    if (value._id) return String(value._id)
    if (value.id) return String(value.id)
  }
  return String(value)
}

export function canAccessRoom(room, userId) {
  if (!room) return false
  if (room.access === 'public') return true

  const normalizedUserId = normalizeId(userId)
  const ownerId = normalizeId(room.owner)
  if (ownerId === normalizedUserId) return true

  return (room.members || []).some((member) => normalizeId(member) === normalizedUserId)
}

export async function getRoomMembership(roomId, userId) {
  if (!roomId || !userId) return null

  return RoomMembership.findOne({
    room: roomId,
    user: userId,
  })
    .select('role status invitedBy')
    .lean()
}

export async function canAccessRoomWithMembership(room, userId) {
  if (!room) return false

  const normalizedUserId = normalizeId(userId)
  const ownerId = normalizeId(room.owner)
  if (ownerId === normalizedUserId) return true

  const membership = await getRoomMembership(room._id, normalizedUserId)
  if (membership?.status === 'banned' || membership?.status === 'removed') return false
  if (membership?.status === 'pending') return false
  if (membership?.status === 'active') return true

  // Compatibility bridge for older data that only used room.members.
  const isLegacyMember = (room.members || []).some(
    (member) => normalizeId(member) === normalizedUserId
  )

  if (isLegacyMember) {
    await RoomMembership.updateOne(
      { room: room._id, user: normalizedUserId },
      {
        $set: {
          role: 'member',
          status: 'active',
          invitedBy: room.owner || null,
        },
      },
      { upsert: true }
    )
    return true
  }

  if (room.access === 'public') return true
  return false
}

export async function getEffectiveRoomRole(roomId, userId) {
  if (!roomId || !userId) {
    return {
      room: null,
      role: null,
      status: 'missing',
    }
  }

  const room = await Room.findById(roomId)
    .select('owner members access mode meeting gd')
    .lean()
  if (!room) {
    return {
      room: null,
      role: null,
      status: 'missing',
    }
  }

  const normalizedUserId = normalizeId(userId)
  const ownerId = normalizeId(room.owner)
  if (ownerId === normalizedUserId) {
    return {
      room,
      role: 'owner',
      status: 'active',
    }
  }

  const membership = await getRoomMembership(roomId, normalizedUserId)
  if (membership?.status === 'active') {
    return {
      room,
      role: membership.role || 'member',
      status: 'active',
    }
  }

  if (membership?.status) {
    return {
      room,
      role: membership.role || 'member',
      status: membership.status,
    }
  }

  // Compatibility bridge for older rooms where membership exists only in room.members.
  const isLegacyMember = (room.members || []).some(
    (member) => normalizeId(member) === normalizedUserId
  )

  if (isLegacyMember) {
    await RoomMembership.updateOne(
      { room: room._id, user: normalizedUserId },
      {
        $set: {
          role: 'member',
          status: 'active',
          invitedBy: room.owner || null,
        },
      },
      { upsert: true }
    )

    return {
      room,
      role: 'member',
      status: 'active',
    }
  }

  if (room.access === 'public') {
    return {
      room,
      role: 'viewer',
      status: 'active',
    }
  }

  return {
    room,
    role: null,
    status: 'missing',
  }
}

export async function hasRoomRole(roomId, userId, allowedRoles = []) {
  const context = await getEffectiveRoomRole(roomId, userId)

  if (!context.room) {
    return { ...context, allowed: false, reason: 'not-found' }
  }

  if (context.status === 'banned' || context.status === 'removed' || context.status === 'pending') {
    return { ...context, allowed: false, reason: 'blocked' }
  }

  if (allowedRoles.includes(context.role)) {
    return { ...context, allowed: true, reason: 'ok' }
  }

  return { ...context, allowed: false, reason: 'insufficient-role' }
}

export async function hasActiveRoomMembership(roomId, userId) {
  if (!roomId || !userId) return false

  const membership = await RoomMembership.findOne({
    room: roomId,
    user: userId,
    status: 'active',
  })
    .select('_id')
    .lean()

  return Boolean(membership)
}

export function isRoomOwner(room, userId) {
  if (!room) return false
  return normalizeId(room.owner) === normalizeId(userId)
}
