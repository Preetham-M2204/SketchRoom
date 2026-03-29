import api from './axios'

const mockRoomsById = {
  1: {
    id: '1',
    name: 'Q4 Strategy Roadmap',
    topic: 'Product direction and prioritization',
    mode: 'decision',
    owner: { id: 'demo-user', name: 'Demo User' },
    members: [],
    updatedAt: new Date().toISOString(),
  },
  2: {
    id: '2',
    name: 'Design Sync: Project Aurora',
    topic: 'Weekly meeting canvas',
    mode: 'meeting',
    owner: { id: 'demo-user', name: 'Demo User' },
    members: [],
    updatedAt: new Date().toISOString(),
  },
  3: {
    id: '3',
    name: 'Frontend Architect Interview',
    topic: 'GD round practice room',
    mode: 'gd',
    owner: { id: 'demo-user', name: 'Demo User' },
    members: [],
    updatedAt: new Date().toISOString(),
  },
  4: {
    id: '4',
    name: 'Moodboard: Spring 2025',
    topic: 'Open exploration board',
    mode: 'canvas',
    owner: { id: 'demo-user', name: 'Demo User' },
    members: [],
    updatedAt: new Date().toISOString(),
  },
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
    if (mockRoomsById[roomId]) {
      return mockRoomsById[roomId]
    }
    throw new Error(error.response?.data?.message || 'Failed to fetch room')
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
