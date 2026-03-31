import { create } from 'zustand'

function dedupeMembers(membersList = []) {
  const byUserId = new Map()
  membersList.forEach((member) => {
    const userId = String(member?.userId || '')
    if (!userId) return
    byUserId.set(userId, {
      ...byUserId.get(userId),
      ...member,
      userId,
    })
  })
  return Array.from(byUserId.values())
}

const useRoomStore = create((set) => ({
  // State
  room: null,
  members: [],
  messages: [],
  strokes: [],

  // Room actions
  setRoom: (roomData) => set({ room: roomData }),

  clearRoom: () => set({
    room: null,
    members: [],
    messages: [],
    strokes: [],
  }),

  updateRoomData: (updates) => set((state) => ({
    room: { ...state.room, ...updates },
  })),

  // Member actions
  setMembers: (membersList) => set({ members: dedupeMembers(membersList) }),

  addMember: (member) => set((state) => ({
    members: dedupeMembers([...state.members, member]),
  })),

  removeMember: (userId) => set((state) => ({
    members: state.members.filter(m => m.userId !== userId),
  })),

  updateMemberStatus: (userId, status) => set((state) => ({
    members: state.members.map(m =>
      m.userId === userId ? { ...m, status } : m
    ),
  })),

  // Stroke actions
  addStroke: (stroke) => set((state) => ({
    strokes: [...state.strokes, stroke],
  })),

  removeStroke: (strokeId) => set((state) => ({
    strokes: state.strokes.filter(s => s.id !== strokeId),
  })),

  clearStrokes: () => set({ strokes: [] }),

  setStrokes: (strokesList) => set({ strokes: strokesList }),

  // Message actions
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),

  clearMessages: () => set({ messages: [] }),
}))

export default useRoomStore
