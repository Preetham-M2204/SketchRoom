import { useEffect, useState } from 'react'
import useModeStore from '../stores/useModeStore'
import { getGdSummary } from '../api/ai'
import { toast } from '../components/ui/Toast'

/**
 * useGdRound Hook
 * Manages GD Round mode logic
 *
 * What it does:
 * - Manages speaker queue and turn order
 * - Tracks timer for each speaker (2 minutes per person)
 * - Handles scoring (clarity, content, delivery)
 * - Fetches AI summary from Claude after round
 *
 * GD Round flow:
 * 1. Moderator starts round, sets speaker order
 * 2. Each speaker gets 2 minutes
 * 3. Timer auto-advances to next speaker
 * 4. Moderator scores each speaker after their turn
 * 5. AI generates summary at end
 *
 * Usage:
 * const { currentSpeaker, timeRemaining, scores } = useGdRound(socket, roomId, userId)
 *
 * @param {Socket} socket - Socket.io instance
 * @param {string} roomId - Current room ID
 * @param {string} userId - Current user ID
 */

const useGdRound = (socket, roomId, userId) => {
  const speakers = useModeStore((state) => state.gd.speakers)
  const currentSpeakerIndex = useModeStore((state) => state.gd.currentSpeakerIndex)
  const scores = useModeStore((state) => state.gd.scores)
  const isActive = useModeStore((state) => state.gd.isActive)
  const summary = useModeStore((state) => state.gd.summary)

  const setSpeakers = useModeStore((state) => state.setSpeakers)
  const setCurrentSpeakerIndex = useModeStore((state) => state.setCurrentSpeakerIndex)
  const updateSpeakerTime = useModeStore((state) => state.updateSpeakerTime)
  const setGdActive = useModeStore((state) => state.setGdActive)
  const updateScore = useModeStore((state) => state.updateScore)
  const setGdSummary = useModeStore((state) => state.setGdSummary)

  const [timerInterval, setTimerInterval] = useState(null)

  const currentSpeaker = speakers[currentSpeakerIndex] || null

  // Socket event listeners
  useEffect(() => {
    if (!socket || !roomId) return

    // Round started
    socket.on('gd:start-round', ({ speakers }) => {
      setSpeakers(speakers)
      setGdActive(true)
      setCurrentSpeakerIndex(0)
      toast.success('GD Round started')
    })

    // Next speaker
    socket.on('gd:next-speaker', ({ index }) => {
      setCurrentSpeakerIndex(index)
      if (speakers[index]) {
        toast.info(`${speakers[index].name}'s turn`)
      }
    })

    // Score submitted
    socket.on('gd:submit-score', ({ userId, scores }) => {
      updateScore(userId, scores)
    })

    // Timer tick
    socket.on('gd:timer-tick', ({ userId, timeRemaining }) => {
      updateSpeakerTime(userId, timeRemaining)
    })

    return () => {
      socket.off('gd:start-round')
      socket.off('gd:next-speaker')
      socket.off('gd:submit-score')
      socket.off('gd:timer-tick')
    }
  }, [socket, roomId, speakers])

  // Auto-advance to next speaker when time runs out
  useEffect(() => {
    if (!currentSpeaker || currentSpeaker.timeRemaining > 0) return

    // Time's up, move to next speaker
    const nextIndex = currentSpeakerIndex + 1

    if (nextIndex < speakers.length) {
      setCurrentSpeakerIndex(nextIndex)
      if (socket) {
        socket.emit('gd:next-speaker', { roomId, index: nextIndex })
      }
    } else {
      // All speakers done, fetch summary
      endRound()
    }
  }, [currentSpeaker?.timeRemaining])

  // Fetch AI summary at end of round
  const endRound = async () => {
    setGdActive(false)
    toast.info('Fetching GD summary...')

    try {
      const summaryText = await getGdSummary({ speakers, scores })
      setGdSummary(summaryText)
      toast.success('Summary generated')
    } catch (error) {
      toast.error('Failed to generate summary')
      console.error(error)
    }
  }

  // Helper functions
  const startRound = (speakerList) => {
    setSpeakers(speakerList)
    setGdActive(true)
    setCurrentSpeakerIndex(0)

    if (socket) {
      socket.emit('gd:start-round', { roomId, speakers: speakerList })
    }
  }

  const nextSpeaker = () => {
    const nextIndex = currentSpeakerIndex + 1
    if (nextIndex < speakers.length) {
      setCurrentSpeakerIndex(nextIndex)
      if (socket) {
        socket.emit('gd:next-speaker', { roomId, index: nextIndex })
      }
    }
  }

  const submitScore = (speakerUserId, scoreData) => {
    updateScore(speakerUserId, scoreData)
    if (socket) {
      socket.emit('gd:submit-score', { roomId, userId: speakerUserId, scores: scoreData })
    }
  }

  return {
    speakers,
    currentSpeaker,
    currentSpeakerIndex,
    scores,
    isActive,
    summary,
    isModerator: true, // TODO: Check if user is room owner
    startRound,
    nextSpeaker,
    submitScore,
    endRound,
  }
}

export default useGdRound
