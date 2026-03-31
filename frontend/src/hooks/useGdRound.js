import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  advanceGdSpeaker,
  endGdRound,
  getGdState,
  setGdMicAccess,
  startGdRound,
  submitGdSpeakerScore,
} from '../api/rooms'
import { getGdSummary } from '../api/ai'
import useModeStore from '../stores/useModeStore'
import { toast } from '../components/ui/Toast'

const useGdRound = (socket, roomId, userId, viewerRole = 'member') => {
  const speakers = useModeStore((state) => state.gd.speakers)
  const currentSpeakerIndex = useModeStore((state) => state.gd.currentSpeakerIndex)
  const scores = useModeStore((state) => state.gd.scores)
  const micOverrideUserIds = useModeStore((state) => state.gd.micOverrideUserIds)
  const isActive = useModeStore((state) => state.gd.isActive)
  const summary = useModeStore((state) => state.gd.summary)
  const setGdState = useModeStore((state) => state.setGdState)
  const updateSpeakerTime = useModeStore((state) => state.updateSpeakerTime)

  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const isModerator = viewerRole === 'owner' || viewerRole === 'moderator'

  const syncGdState = useCallback(
    async ({ silent = false } = {}) => {
      if (!roomId) return null

      try {
        const state = await getGdState(roomId)
        setGdState(state)
        return state
      } catch (error) {
        if (!silent) {
          toast.error(error.message || 'Failed to load GD state')
        }
        return null
      }
    },
    [roomId, setGdState]
  )

  useEffect(() => {
    let cancelled = false

    const hydrate = async () => {
      setIsLoading(true)
      await syncGdState()
      if (!cancelled) {
        setIsLoading(false)
      }
    }

    hydrate()

    return () => {
      cancelled = true
    }
  }, [syncGdState])

  useEffect(() => {
    if (!socket || !roomId) return

    const refresh = () => {
      syncGdState({ silent: true })
    }

    const handleTimerTick = ({ userId: speakerUserId, timeRemaining }) => {
      updateSpeakerTime(speakerUserId, timeRemaining)
    }

    socket.on('gd:start-round', refresh)
    socket.on('gd:next-speaker', refresh)
    socket.on('gd:submit-score', refresh)
    socket.on('gd:end-round', refresh)
    socket.on('gd:set-mic-access', refresh)
    socket.on('gd:timer-tick', handleTimerTick)

    return () => {
      socket.off('gd:start-round', refresh)
      socket.off('gd:next-speaker', refresh)
      socket.off('gd:submit-score', refresh)
      socket.off('gd:end-round', refresh)
      socket.off('gd:set-mic-access', refresh)
      socket.off('gd:timer-tick', handleTimerTick)
    }
  }, [socket, roomId, syncGdState, updateSpeakerTime])

  const currentSpeaker = useMemo(() => {
    return speakers[currentSpeakerIndex] || null
  }, [speakers, currentSpeakerIndex])

  const startRound = async (speakerList) => {
    if (!roomId) return

    setIsMutating(true)
    try {
      const state = await startGdRound(roomId, speakerList)
      setGdState(state)

      if (socket) {
        socket.emit('gd:start-round', {
          roomId,
          speakers: state.speakers || speakerList,
        })
      }

      return state
    } catch (error) {
      toast.error(error.message || 'Failed to start GD round')
      throw error
    } finally {
      setIsMutating(false)
    }
  }

  const nextSpeaker = async () => {
    if (!roomId || speakers.length === 0) return null

    const nextIndex = currentSpeakerIndex + 1
    if (nextIndex >= speakers.length) {
      return null
    }

    setIsMutating(true)
    try {
      const state = await advanceGdSpeaker(roomId, nextIndex)
      setGdState(state)

      if (socket) {
        socket.emit('gd:next-speaker', {
          roomId,
          index: state.currentSpeakerIndex,
        })
      }

      return state
    } catch (error) {
      toast.error(error.message || 'Failed to advance speaker')
      throw error
    } finally {
      setIsMutating(false)
    }
  }

  const submitScore = async (speakerUserId, scoreData) => {
    if (!roomId || !speakerUserId) return

    setIsMutating(true)
    try {
      const state = await submitGdSpeakerScore(roomId, speakerUserId, scoreData)
      setGdState(state)

      if (socket) {
        socket.emit('gd:submit-score', {
          roomId,
          userId: speakerUserId,
          scores: scoreData,
        })
      }

      return state
    } catch (error) {
      toast.error(error.message || 'Failed to submit score')
      throw error
    } finally {
      setIsMutating(false)
    }
  }

  const setSpeakerMicAccess = async (targetUserId, enabled) => {
    if (!roomId || !targetUserId) return

    setIsMutating(true)
    try {
      const state = await setGdMicAccess(roomId, targetUserId, enabled)
      setGdState(state)

      if (socket) {
        socket.emit('gd:set-mic-access', {
          roomId,
          userId: targetUserId,
          enabled: Boolean(enabled),
        })
      }

      return state
    } catch (error) {
      toast.error(error.message || 'Failed to update mic access')
      throw error
    } finally {
      setIsMutating(false)
    }
  }

  const endRound = async () => {
    if (!roomId) return

    setIsMutating(true)
    try {
      let summaryText = ''
      try {
        summaryText = await getGdSummary({
          speakers,
          scores,
        })
      } catch {
        // Fallback summary is generated by backend if AI call fails.
      }

      const state = await endGdRound(roomId, summaryText || undefined)
      setGdState(state)

      if (socket) {
        socket.emit('gd:end-round', {
          roomId,
          summary: state?.summary || summaryText || undefined,
        })
      }

      return state
    } catch (error) {
      toast.error(error.message || 'Failed to end GD round')
      throw error
    } finally {
      setIsMutating(false)
    }
  }

  return {
    speakers,
    currentSpeaker,
    currentSpeakerIndex,
    scores,
    micOverrideUserIds,
    isActive,
    summary,
    isLoading,
    isMutating,
    isModerator,
    startRound,
    nextSpeaker,
    submitScore,
    setSpeakerMicAccess,
    endRound,
    refreshState: syncGdState,
  }
}

export default useGdRound