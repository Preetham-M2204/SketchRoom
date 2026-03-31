import api from './axios'

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1'])

export const getShareBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_SHARE_BASE_URL?.trim()
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '')
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }

  return ''
}

export const isLocalShareOrigin = () => {
  if (typeof window === 'undefined') return false
  return LOCAL_HOSTNAMES.has(window.location.hostname)
}

export const buildRoomShareLink = (room) => {
  const roomKey = room?.publicId || room?.inviteCode || room?.id
  if (!roomKey) return null

  const baseUrl = getShareBaseUrl()
  if (!baseUrl) return `/r/${roomKey}`

  return `${baseUrl}/r/${roomKey}`
}

export const copyTextToClipboard = async (text) => {
  const normalizedText = typeof text === 'string' ? text : String(text || '')
  if (!normalizedText) return false

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(normalizedText)
      return true
    } catch {
      // Fall through to legacy copy for non-secure contexts (e.g. HTTP LAN).
    }
  }

  if (typeof document === 'undefined' || !document.body) return false

  const textarea = document.createElement('textarea')
  textarea.value = normalizedText
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '-9999px'
  textarea.style.left = '-9999px'
  textarea.style.opacity = '0'

  document.body.appendChild(textarea)

  const selection = document.getSelection()
  const previousRange =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

  textarea.focus()
  textarea.select()

  let copied = false
  try {
    copied = document.execCommand('copy')
  } catch {
    copied = false
  }

  document.body.removeChild(textarea)

  if (selection && previousRange) {
    selection.removeAllRanges()
    selection.addRange(previousRange)
  }

  return copied
}

/**
 * Get all rooms where user is owner or member
 * @returns {Promise<Array>} List of room objects
 */
export const getRooms = async () => {
  try {
    const response = await api.get('/rooms')
    return response.data.rooms
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch rooms')
  }
}

/**
 * Get single room by ID
 * @param {string} roomId
 * @returns {Promise<Object>} Room object with full details
 */
export const getRoom = async (roomId) => {
  try {
    const response = await api.get(`/rooms/${roomId}`)
    return response.data.room
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch room')
  }
}

/**
 * Get single room by short public key (preferred for URL-safe routing)
 * @param {string} roomKey
 * @returns {Promise<Object>} Room object
 */
export const getRoomByKey = async (roomKey) => {
  try {
    const response = await api.get(`/rooms/key/${roomKey}`)
    return response.data.room
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch room by key')
  }
}

/**
 * Create a new room
 * @param {Object} roomData - { name, mode, modeConfig, access: 'public' | 'private' }
 * @returns {Promise<Object>} Created room object
 */
export const createRoom = async (roomData) => {
  try {
    const response = await api.post('/rooms', roomData)
    return response.data.room
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to create room')
  }
}

/**
 * Delete a room (owner only)
 * @param {string} roomId
 * @returns {Promise<Object>} Success message
 */
export const deleteRoom = async (roomId) => {
  try {
    const response = await api.delete(`/rooms/${roomId}`)
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to delete room')
  }
}

/**
 * Request access to a room using short room key
 * @param {string} roomKey
 * @returns {Promise<Object>} { status, room, message }
 */
export const requestRoomAccessByKey = async (roomKey) => {
  try {
    const response = await api.post(`/rooms/key/${roomKey}/request-access`)
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to request room access')
  }
}

/**
 * Get current access status for room key
 * @param {string} roomKey
 * @returns {Promise<Object>} { status, room, message }
 */
export const getRoomAccessStatusByKey = async (roomKey) => {
  try {
    const response = await api.get(`/rooms/key/${roomKey}/access-status`)
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch room access status')
  }
}

/**
 * List pending join requests for a room (admin only)
 * @param {string} roomId
 * @returns {Promise<Array>} Join request list
 */
export const getRoomJoinRequests = async (roomId) => {
  try {
    const response = await api.get(`/rooms/${roomId}/requests`)
    return response.data.requests || []
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch join requests')
  }
}

/**
 * Approve pending join request (admin only)
 * @param {string} roomId
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export const approveRoomJoinRequest = async (roomId, userId) => {
  try {
    const response = await api.post(`/rooms/${roomId}/requests/${userId}/approve`)
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to approve join request')
  }
}

/**
 * Reject pending join request (admin only)
 * @param {string} roomId
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export const rejectRoomJoinRequest = async (roomId, userId) => {
  try {
    const response = await api.post(`/rooms/${roomId}/requests/${userId}/reject`)
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to reject join request')
  }
}

/**
 * Join a room by invite code
 * @param {string} inviteCode - 6-character room code
 * @returns {Promise<Object>} Room object
 */
export const joinRoomByCode = async (inviteCode) => {
  try {
    const response = await api.post(`/rooms/join/${inviteCode}`)
    return response.data.room
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to join room')
  }
}

/**
 * Get all strokes for a room (for late joiners)
 * @param {string} roomId
 * @returns {Promise<Array>} List of stroke objects
 */
export const getRoomStrokes = async (roomId) => {
  try {
    const response = await api.get(`/rooms/${roomId}/strokes`)
    return response.data.strokes
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch strokes')
  }
}

/**
 * Get canvas state for a room (strokes + metadata)
 * @param {string} roomId
 * @returns {Promise<Object>} Canvas state object
 */
export const getCanvasState = async (roomId) => {
  try {
    const response = await api.get(`/rooms/${roomId}/canvas/state`)
    return response.data.state
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch canvas state')
  }
}

/**
 * Update canvas metadata like title and viewport
 * @param {string} roomId
 * @param {Object} payload
 * @returns {Promise<Object>} Updated canvas state
 */
export const updateCanvasMeta = async (roomId, payload) => {
  try {
    const response = await api.patch(`/rooms/${roomId}/canvas/meta`, payload)
    return response.data.state
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update canvas metadata')
  }
}

/**
 * Clear all strokes in a room canvas
 * @param {string} roomId
 * @returns {Promise<Object>} Cleared canvas state
 */
export const clearCanvasState = async (roomId) => {
  try {
    const response = await api.post(`/rooms/${roomId}/canvas/clear`)
    return response.data.state
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to clear canvas')
  }
}

/**
 * Get decision state for a room
 * @param {string} roomId
 * @returns {Promise<Object>} Decision state
 */
export const getDecisionState = async (roomId) => {
  try {
    const response = await api.get(`/rooms/${roomId}/decision/state`)
    return response.data.state
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch decision state')
  }
}

/**
 * Update decision phase
 * @param {string} roomId
 * @param {'brainstorm'|'voting'|'analysis'} phase
 * @returns {Promise<Object>} Decision state
 */
export const updateDecisionPhase = async (roomId, phase) => {
  try {
    const response = await api.patch(`/rooms/${roomId}/decision/phase`, { phase })
    return response.data.state
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update decision phase')
  }
}

/**
 * Add a decision item
 * @param {string} roomId
 * @param {{text: string, type?: string}} payload
 * @returns {Promise<Object>} Decision state
 */
export const addDecisionItem = async (roomId, payload) => {
  try {
    const response = await api.post(`/rooms/${roomId}/decision/items`, payload)
    return response.data.state
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to add decision item')
  }
}

/**
 * Remove a decision item
 * @param {string} roomId
 * @param {string} itemId
 * @returns {Promise<Object>} Decision state
 */
export const removeDecisionItem = async (roomId, itemId) => {
  try {
    const response = await api.delete(`/rooms/${roomId}/decision/items/${itemId}`)
    return response.data.state
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to remove decision item')
  }
}

/**
 * Vote on a decision item (idempotent)
 * @param {string} roomId
 * @param {string} itemId
 * @returns {Promise<Object>} Decision state
 */
export const voteDecisionItem = async (roomId, itemId) => {
  try {
    const response = await api.post(`/rooms/${roomId}/decision/items/${itemId}/vote`)
    return response.data.state
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to vote on decision item')
  }
}

/**
 * Get meeting state for a room
 * @param {string} roomId
 * @returns {Promise<Object>} Meeting state
 */
export const getMeetingState = async (roomId) => {
  try {
    const response = await api.get(`/rooms/${roomId}/meeting/state`)
    return response.data.state
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch meeting state')
  }
}

/**
 * Update meeting presenter
 * @param {string} roomId
 * @param {string} presenterUserId
 * @returns {Promise<Object>} Meeting state
 */
export const updateMeetingPresenter = async (roomId, presenterUserId) => {
  try {
    const response = await api.patch(`/rooms/${roomId}/meeting/presenter`, { presenterUserId })
    return response.data.state
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update presenter')
  }
}

/**
 * Replace full meeting agenda
 * @param {string} roomId
 * @param {Array} agenda
 * @returns {Promise<Object>} Meeting state
 */
export const updateMeetingAgenda = async (roomId, agenda) => {
  try {
    const response = await api.put(`/rooms/${roomId}/meeting/agenda`, { agenda })
    return response.data.state
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update meeting agenda')
  }
}

/**
 * Update active meeting agenda index
 * @param {string} roomId
 * @param {number} index
 * @returns {Promise<Object>} Meeting state
 */
export const updateMeetingAgendaIndex = async (roomId, index) => {
  try {
    const response = await api.patch(`/rooms/${roomId}/meeting/agenda/index`, { index })
    return response.data.state
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update meeting agenda index')
  }
}

/**
 * Update meeting viewport sync state
 * @param {string} roomId
 * @param {{viewport?: Object, isViewportSynced?: boolean}} payload
 * @returns {Promise<Object>} Meeting state
 */
export const updateMeetingViewport = async (roomId, payload) => {
  try {
    const response = await api.patch(`/rooms/${roomId}/meeting/viewport`, payload)
    return response.data.state
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update meeting viewport')
  }
}

/**
 * Raise current user's hand in meeting queue
 * @param {string} roomId
 * @returns {Promise<Object>} Meeting state
 */
export const raiseMeetingHand = async (roomId) => {
  try {
    const response = await api.post(`/rooms/${roomId}/meeting/hand-queue/raise`)
    return response.data.state
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to raise hand')
  }
}

/**
 * Lower current user's hand in meeting queue
 * @param {string} roomId
 * @returns {Promise<Object>} Meeting state
 */
export const lowerMeetingHand = async (roomId) => {
  try {
    const response = await api.post(`/rooms/${roomId}/meeting/hand-queue/lower`)
    return response.data.state
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to lower hand')
  }
}

/**
 * Get GD state for a room
 * @param {string} roomId
 * @returns {Promise<Object>} GD state
 */
export const getGdState = async (roomId) => {
  try {
    const response = await api.get(`/rooms/${roomId}/gd/state`)
    return response.data.state
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch GD state')
  }
}

/**
 * Start GD round
 * @param {string} roomId
 * @param {Array} speakers
 * @returns {Promise<Object>} GD state
 */
export const startGdRound = async (roomId, speakers) => {
  try {
    const response = await api.post(`/rooms/${roomId}/gd/start`, { speakers })
    return response.data.state
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to start GD round')
  }
}

/**
 * Advance to a speaker index in GD round
 * @param {string} roomId
 * @param {number} index
 * @returns {Promise<Object>} GD state
 */
export const advanceGdSpeaker = async (roomId, index) => {
  try {
    const response = await api.patch(`/rooms/${roomId}/gd/next-speaker`, { index })
    return response.data.state
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to advance GD speaker')
  }
}

/**
 * Grant or revoke temporary out-of-turn mic access for a GD speaker
 * @param {string} roomId
 * @param {string} userId
 * @param {boolean} enabled
 * @returns {Promise<Object>} GD state
 */
export const setGdMicAccess = async (roomId, userId, enabled) => {
  try {
    const response = await api.patch(`/rooms/${roomId}/gd/mic-access`, { userId, enabled })
    return response.data.state
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update GD mic access')
  }
}

/**
 * Submit score for one GD speaker
 * @param {string} roomId
 * @param {string} speakerUserId
 * @param {Object} scores
 * @returns {Promise<Object>} GD state
 */
export const submitGdSpeakerScore = async (roomId, speakerUserId, scores) => {
  try {
    const response = await api.post(`/rooms/${roomId}/gd/scores/${speakerUserId}`, { scores })
    return response.data.state
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to submit GD score')
  }
}

/**
 * End GD round and optionally persist provided summary
 * @param {string} roomId
 * @param {string | undefined} summary
 * @returns {Promise<Object>} GD state
 */
export const endGdRound = async (roomId, summary) => {
  try {
    const response = await api.post(`/rooms/${roomId}/gd/end`, summary ? { summary } : {})
    return response.data.state
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to end GD round')
  }
}
