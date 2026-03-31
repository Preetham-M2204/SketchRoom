import { create } from 'zustand'

const useModeStore = create((set) => ({
  // Decision Board Mode State
  decision: {
    phase: 'brainstorm', // 'brainstorm' | 'voting' | 'analysis'
    items: [], // { id, text, type: 'pro' | 'con' | 'strength' | 'weakness', votes: [], createdBy }
    analysis: null, // AI-generated analysis from Claude
  },

  // Meeting Room Mode State
  meeting: {
    presenter: null, // userId of current presenter
    agenda: [], // { id, title, duration, completed }
    handQueue: [], // [userId1, userId2, ...]
    currentAgendaIndex: 0,
    isViewportSynced: false,
  },

  // GD Round Mode State
  gd: {
    currentSpeakerIndex: 0,
    speakers: [], // [{ userId, name, timeRemaining, hasSpoken }]
    scores: {}, // { userId: { clarity: 5, content: 4, ... } }
    micOverrideUserIds: [],
    isActive: false,
    summary: null, // AI-generated summary from Claude
  },

  // Decision Board Actions
  setDecisionState: (decisionState) => set((state) => ({
    decision: {
      ...state.decision,
      phase: decisionState?.phase || 'brainstorm',
      items: Array.isArray(decisionState?.items) ? decisionState.items : [],
      analysis: decisionState?.analysis || null,
    },
  })),

  setDecisionPhase: (phase) => set((state) => ({
    decision: { ...state.decision, phase },
  })),

  addDecisionItem: (item) => set((state) => ({
    decision: {
      ...state.decision,
      items: state.decision.items.some((entry) => entry.id === item.id)
        ? state.decision.items
        : [...state.decision.items, item],
    },
  })),

  removeDecisionItem: (itemId) => set((state) => ({
    decision: {
      ...state.decision,
      items: state.decision.items.filter(item => item.id !== itemId),
    },
  })),

  voteOnItem: (itemId, userId) => set((state) => ({
    decision: {
      ...state.decision,
      items: state.decision.items.map(item =>
        item.id === itemId
          ? {
              ...item,
              votes: item.votes.includes(userId) ? item.votes : [...item.votes, userId],
            }
          : item
      ),
    },
  })),

  setDecisionAnalysis: (analysis) => set((state) => ({
    decision: { ...state.decision, analysis },
  })),

  clearDecision: () => set({
    decision: {
      phase: 'brainstorm',
      items: [],
      analysis: null,
    },
  }),

  // Meeting Room Actions
  setMeetingState: (meetingState) => set((state) => ({
    meeting: {
      ...state.meeting,
      presenter: meetingState?.presenter || null,
      agenda: Array.isArray(meetingState?.agenda) ? meetingState.agenda : [],
      handQueue: Array.isArray(meetingState?.handQueue)
        ? [...new Set(meetingState.handQueue)]
        : [],
      currentAgendaIndex: Number.isFinite(meetingState?.currentAgendaIndex)
        ? meetingState.currentAgendaIndex
        : 0,
      isViewportSynced: Boolean(meetingState?.isViewportSynced),
    },
  })),

  setPresenter: (userId) => set((state) => ({
    meeting: { ...state.meeting, presenter: userId },
  })),

  setAgenda: (agenda) => set((state) => ({
    meeting: { ...state.meeting, agenda },
  })),

  addToHandQueue: (userId) => set((state) => ({
    meeting: {
      ...state.meeting,
      handQueue: state.meeting.handQueue.includes(userId)
        ? state.meeting.handQueue
        : [...state.meeting.handQueue, userId],
    },
  })),

  removeFromHandQueue: (userId) => set((state) => ({
    meeting: {
      ...state.meeting,
      handQueue: state.meeting.handQueue.filter(id => id !== userId),
    },
  })),

  setCurrentAgendaIndex: (index) => set((state) => ({
    meeting: { ...state.meeting, currentAgendaIndex: index },
  })),

  toggleViewportSync: () => set((state) => ({
    meeting: {
      ...state.meeting,
      isViewportSynced: !state.meeting.isViewportSynced,
    },
  })),

  clearMeeting: () => set({
    meeting: {
      presenter: null,
      agenda: [],
      handQueue: [],
      currentAgendaIndex: 0,
      isViewportSynced: false,
    },
  }),

  // GD Round Actions
  setGdState: (gdState) => set((state) => ({
    gd: {
      ...state.gd,
      currentSpeakerIndex: Number.isFinite(gdState?.currentSpeakerIndex)
        ? gdState.currentSpeakerIndex
        : 0,
      speakers: Array.isArray(gdState?.speakers) ? gdState.speakers : [],
      scores:
        gdState?.scores && typeof gdState.scores === 'object'
          ? gdState.scores
          : {},
      micOverrideUserIds: Array.isArray(gdState?.micOverrideUserIds)
        ? [...new Set(gdState.micOverrideUserIds.map((value) => String(value)))]
        : [],
      isActive: Boolean(gdState?.isActive),
      summary: gdState?.summary || null,
    },
  })),

  setSpeakers: (speakers) => set((state) => ({
    gd: { ...state.gd, speakers },
  })),

  setCurrentSpeakerIndex: (index) => set((state) => ({
    gd: { ...state.gd, currentSpeakerIndex: index },
  })),

  updateSpeakerTime: (userId, timeRemaining) => set((state) => ({
    gd: {
      ...state.gd,
      speakers: state.gd.speakers.map(speaker =>
        speaker.userId === userId
          ? { ...speaker, timeRemaining }
          : speaker
      ),
    },
  })),

  setGdActive: (isActive) => set((state) => ({
    gd: { ...state.gd, isActive },
  })),

  updateScore: (userId, scores) => set((state) => ({
    gd: {
      ...state.gd,
      scores: { ...state.gd.scores, [userId]: scores },
    },
  })),

  setGdSummary: (summary) => set((state) => ({
    gd: { ...state.gd, summary },
  })),

  clearGd: () => set({
    gd: {
      currentSpeakerIndex: 0,
      speakers: [],
      scores: {},
      micOverrideUserIds: [],
      isActive: false,
      summary: null,
    },
  }),

  // Reset all mode state
  resetAllModes: () => set({
    decision: {
      phase: 'brainstorm',
      items: [],
      analysis: null,
    },
    meeting: {
      presenter: null,
      agenda: [],
      handQueue: [],
      currentAgendaIndex: 0,
      isViewportSynced: false,
    },
    gd: {
      currentSpeakerIndex: 0,
      speakers: [],
      scores: {},
      micOverrideUserIds: [],
      isActive: false,
      summary: null,
    },
  }),
}))

export default useModeStore
