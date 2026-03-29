import { useEffect } from 'react'
import useModeStore from '../stores/useModeStore'
import { getDecisionAnalysis } from '../api/ai'
import { toast } from '../components/ui/Toast'

/**
 * useDecision Hook
 * Manages Decision Board mode logic
 *
 * What it does:
 * - Listens to decision-specific socket events
 * - Handles phase transitions (brainstorm → voting → analysis)
 * - Fetches AI analysis from Claude
 * - Syncs decision items and votes across all users
 *
 * Decision Board phases:
 * 1. Brainstorm: Add pros/cons/strengths/weaknesses
 * 2. Voting: Members upvote items
 * 3. Analysis: Claude generates strategic summary
 *
 * Usage:
 * useDecision(socket, roomId)
 *
 * @param {Socket} socket - Socket.io instance
 * @param {string} roomId - Current room ID
 */

const useDecision = (socket, roomId) => {
  const phase = useModeStore((state) => state.decision.phase)
  const items = useModeStore((state) => state.decision.items)
  const setDecisionPhase = useModeStore((state) => state.setDecisionPhase)
  const addDecisionItem = useModeStore((state) => state.addDecisionItem)
  const removeDecisionItem = useModeStore((state) => state.removeDecisionItem)
  const voteOnItem = useModeStore((state) => state.voteOnItem)
  const setDecisionAnalysis = useModeStore((state) => state.setDecisionAnalysis)

  // Socket event listeners
  useEffect(() => {
    if (!socket || !roomId) return

    // Phase change
    socket.on('decision:set-phase', ({ phase }) => {
      setDecisionPhase(phase)
      toast.info(`Phase: ${phase}`)
    })

    // New item added
    socket.on('decision:add-item', ({ item }) => {
      addDecisionItem(item)
    })

    // Item removed
    socket.on('decision:remove-item', ({ itemId }) => {
      removeDecisionItem(itemId)
    })

    // Vote added
    socket.on('decision:vote', ({ itemId, userId }) => {
      voteOnItem(itemId, userId)
    })

    return () => {
      socket.off('decision:set-phase')
      socket.off('decision:add-item')
      socket.off('decision:remove-item')
      socket.off('decision:vote')
    }
  }, [socket, roomId])

  // Fetch AI analysis when entering analysis phase
  useEffect(() => {
    if (phase !== 'analysis' || items.length === 0) return

    const fetchAnalysis = async () => {
      try {
        toast.info('Requesting AI analysis...')
        const analysis = await getDecisionAnalysis({ items })
        setDecisionAnalysis(analysis)
        toast.success('Analysis complete')
      } catch (error) {
        toast.error('Failed to get AI analysis')
        console.error(error)
      }
    }

    fetchAnalysis()
  }, [phase, items])

  // Helper functions to emit events
  const addItem = (item) => {
    addDecisionItem(item)
    if (socket) {
      socket.emit('decision:add-item', { roomId, item })
    }
  }

  const removeItem = (itemId) => {
    removeDecisionItem(itemId)
    if (socket) {
      socket.emit('decision:remove-item', { roomId, itemId })
    }
  }

  const vote = (itemId, userId) => {
    voteOnItem(itemId, userId)
    if (socket) {
      socket.emit('decision:vote', { roomId, itemId, userId })
    }
  }

  const changePhase = (newPhase) => {
    setDecisionPhase(newPhase)
    if (socket) {
      socket.emit('decision:set-phase', { roomId, phase: newPhase })
    }
  }

  return {
    phase,
    items,
    addItem,
    removeItem,
    vote,
    changePhase,
  }
}

export default useDecision
