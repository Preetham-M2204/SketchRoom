function toId(value) {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    if (value._id) return String(value._id)
    if (value.id) return String(value.id)
  }
  return String(value)
}

export function serializeAuthUser(user) {
  return {
    id: toId(user),
    name: user.name,
    email: user.email,
  }
}

export function serializeMember(member, status = 'active') {
  return {
    userId: toId(member),
    name: member.name || 'Unknown User',
    email: member.email,
    status,
  }
}

export function serializeRoom(room, membersOverride = null, options = {}) {
  const { viewerUserId = null, viewerRole = null } = options
  const members = membersOverride
    ? membersOverride
    : (room.members || []).map((member) => serializeMember(member))

  const ownerId = room.owner ? toId(room.owner) : null
  const inferredViewerRole =
    viewerRole ||
    (viewerUserId && ownerId === toId(viewerUserId)
      ? 'owner'
      : room.access === 'public'
        ? 'viewer'
        : 'member')
  const canViewInviteCode = inferredViewerRole === 'owner'

  return {
    id: String(room._id),
    publicId: room.publicId || room.inviteCode || String(room._id),
    name: room.name,
    topic: room.topic || '',
    mode: room.mode,
    access: room.access,
    isPublic: room.access === 'public',
    inviteCode: canViewInviteCode ? room.inviteCode : null,
    owner: room.owner
      ? {
          id: ownerId,
          name: room.owner.name || 'Unknown Owner',
        }
      : null,
    permissions: {
      viewerRole: inferredViewerRole,
      canModerate: inferredViewerRole === 'owner' || inferredViewerRole === 'moderator',
    },
    members,
    updatedAt: room.updatedAt,
    createdAt: room.createdAt,
  }
}
