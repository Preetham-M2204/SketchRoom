import { useCallback, useEffect, useState } from 'react'
import {
  addDecisionItem,
  getDecisionState,
  removeDecisionItem,
  updateDecisionPhase,
  voteDecisionItem,
} from '../api/rooms'
import useModeStore from '../stores/useModeStore'
import { toast } from '../components/ui/Toast'

const useDecision = (socket, roomId) => {
  const phase = useModeStore((state) => state.decision.phase)
  const items = useModeStore((state) => state.decision.items)
  const analysis = useModeStore((state) => state.decision.analysis)
  const setDecisionState = useModeStore((state) => state.setDecisionState)

  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)

  const syncDecisionState = useCallback(
    async ({ silent = false } = {}) => {
      if (!roomId) return null

      try {
        const state = await getDecisionState(roomId)
        setDecisionState(state)
        return state
      } catch (error) {
        if (!silent) {
          toast.error(error.message || 'Failed to load decision state')
        }
        return null
      }
    },
    [roomId, setDecisionState]
  )

  useEffect(() => {
    let cancelled = false

    const hydrate = async () => {
      setIsLoading(true)
      await syncDecisionState()
      if (!cancelled) {
        setIsLoading(false)
      }
    }

    hydrate()

    return () => {
      cancelled = true
    }
  }, [syncDecisionState])

  useEffect(() => {
    if (!socket || !roomId) return

    const refresh = () => {
      syncDecisionState({ silent: true })
    }

    socket.on('decision:set-phase', refresh)
    socket.on('decision:add-item', refresh)
    socket.on('decision:remove-item', refresh)
    socket.on('decision:vote', refresh)

    return () => {
      socket.off('decision:set-phase', refresh)
      socket.off('decision:add-item', refresh)
      socket.off('decision:remove-item', refresh)
      socket.off('decision:vote', refresh)
    }
  }, [socket, roomId, syncDecisionState])

  const addItem = async (payload) => {
    if (!roomId) return

    setIsMutating(true)
    try {
      const state = await addDecisionItem(roomId, payload)
      setDecisionState(state)

      const latestItem = state?.items?.[state.items.length - 1]
      if (socket && latestItem) {
        socket.emit('decision:add-item', {
          roomId,
          item: latestItem,
        })
      }

      return state
    } catch (error) {
      toast.error(error.message || 'Failed to add item')
      throw error
    } finally {
      setIsMutating(false)
    }
  }

  const removeItem = async (itemId) => {
    if (!roomId || !itemId) return

    setIsMutating(true)
    try {
      const state = await removeDecisionItem(roomId, itemId)
      setDecisionState(state)

      if (socket) {
        socket.emit('decision:remove-item', {
          roomId,
          itemId,
        })
      }

      return state
    } catch (error) {
      toast.error(error.message || 'Failed to remove item')
      throw error
    } finally {
      setIsMutating(false)
    }
  }

  const vote = async (itemId) => {
    if (!roomId || !itemId) return

    setIsMutating(true)
    try {
      const state = await voteDecisionItem(roomId, itemId)
      setDecisionState(state)

      if (socket) {
        socket.emit('decision:vote', {
          roomId,
          itemId,
        })
      }

      return state
    } catch (error) {
      toast.error(error.message || 'Failed to vote')
      throw error
    } finally {
      setIsMutating(false)
    }
  }

  const changePhase = async (newPhase) => {
    if (!roomId || !newPhase) return

    setIsMutating(true)
    try {
      const state = await updateDecisionPhase(roomId, newPhase)
      setDecisionState(state)

      if (socket) {
        socket.emit('decision:set-phase', {
          roomId,
          phase: newPhase,
        })
      }

      return state
    } catch (error) {
      toast.error(error.message || 'Failed to change phase')
      throw error
    } finally {
      setIsMutating(false)
    }
  }

  return {
    phase,
    items,
    analysis,
    isLoading,
    isMutating,
    addItem,
    removeItem,
    vote,
    changePhase,
    refreshState: syncDecisionState,
  }
}

export default useDecision
