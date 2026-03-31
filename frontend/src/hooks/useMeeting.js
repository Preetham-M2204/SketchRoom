import { useCallback, useEffect, useState } from 'react'
import {
  getMeetingState,
  lowerMeetingHand,
  raiseMeetingHand,
  updateMeetingAgenda,
  updateMeetingAgendaIndex,
  updateMeetingPresenter,
  updateMeetingViewport,
} from '../api/rooms'
import useModeStore from '../stores/useModeStore'
import { toast } from '../components/ui/Toast'

const useMeeting = (socket, roomId, userId) => {
  const presenter = useModeStore((state) => state.meeting.presenter)
  const agenda = useModeStore((state) => state.meeting.agenda)
  const handQueue = useModeStore((state) => state.meeting.handQueue)
  const currentAgendaIndex = useModeStore((state) => state.meeting.currentAgendaIndex)
  const isViewportSynced = useModeStore((state) => state.meeting.isViewportSynced)
  const setMeetingState = useModeStore((state) => state.setMeetingState)

  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)

  const syncMeetingState = useCallback(
    async ({ silent = false } = {}) => {
      if (!roomId) return null

      try {
        const state = await getMeetingState(roomId)
        setMeetingState(state)
        return state
      } catch (error) {
        if (!silent) {
          toast.error(error.message || 'Failed to load meeting state')
        }
        return null
      }
    },
    [roomId, setMeetingState]
  )

  useEffect(() => {
    let cancelled = false

    const hydrate = async () => {
      setIsLoading(true)
      await syncMeetingState()
      if (!cancelled) {
        setIsLoading(false)
      }
    }

    hydrate()

    return () => {
      cancelled = true
    }
  }, [syncMeetingState])

  useEffect(() => {
    if (!socket || !roomId) return

    const refresh = () => {
      syncMeetingState({ silent: true })
    }

    socket.on('meeting:set-presenter', refresh)
    socket.on('meeting:raise-hand', refresh)
    socket.on('meeting:lower-hand', refresh)
    socket.on('meeting:set-agenda', refresh)
    socket.on('meeting:next-agenda', refresh)
    socket.on('meeting:sync-viewport', refresh)

    return () => {
      socket.off('meeting:set-presenter', refresh)
      socket.off('meeting:raise-hand', refresh)
      socket.off('meeting:lower-hand', refresh)
      socket.off('meeting:set-agenda', refresh)
      socket.off('meeting:next-agenda', refresh)
      socket.off('meeting:sync-viewport', refresh)
    }
  }, [socket, roomId, syncMeetingState])

  const requestPresenter = async (presenterUserId = userId) => {
    if (!roomId || !presenterUserId) return

    setIsMutating(true)
    try {
      const state = await updateMeetingPresenter(roomId, presenterUserId)
      setMeetingState(state)

      if (socket) {
        socket.emit('meeting:set-presenter', { roomId, userId: presenterUserId })
      }

      return state
    } catch (error) {
      toast.error(error.message || 'Failed to set presenter')
      throw error
    } finally {
      setIsMutating(false)
    }
  }

  const raiseHand = async () => {
    if (!roomId || !userId) return

    setIsMutating(true)
    try {
      const state = await raiseMeetingHand(roomId)
      setMeetingState(state)

      if (socket) {
        socket.emit('meeting:raise-hand', { roomId, userId })
      }

      return state
    } catch (error) {
      toast.error(error.message || 'Failed to raise hand')
      throw error
    } finally {
      setIsMutating(false)
    }
  }

  const lowerHand = async () => {
    if (!roomId || !userId) return

    setIsMutating(true)
    try {
      const state = await lowerMeetingHand(roomId)
      setMeetingState(state)

      if (socket) {
        socket.emit('meeting:lower-hand', { roomId, userId })
      }

      return state
    } catch (error) {
      toast.error(error.message || 'Failed to lower hand')
      throw error
    } finally {
      setIsMutating(false)
    }
  }

  const saveAgenda = async (nextAgenda) => {
    if (!roomId) return

    setIsMutating(true)
    try {
      const state = await updateMeetingAgenda(roomId, nextAgenda)
      setMeetingState(state)

      if (socket) {
        socket.emit('meeting:set-agenda', { roomId, agenda: state.agenda || [] })
      }

      return state
    } catch (error) {
      toast.error(error.message || 'Failed to update agenda')
      throw error
    } finally {
      setIsMutating(false)
    }
  }

  const setAgendaIndex = async (index) => {
    if (!roomId) return

    setIsMutating(true)
    try {
      const state = await updateMeetingAgendaIndex(roomId, index)
      setMeetingState(state)

      if (socket) {
        socket.emit('meeting:next-agenda', {
          roomId,
          index: state.currentAgendaIndex,
        })
      }

      return state
    } catch (error) {
      toast.error(error.message || 'Failed to change active agenda')
      throw error
    } finally {
      setIsMutating(false)
    }
  }

  const nextAgendaItem = async () => {
    const nextIndex = currentAgendaIndex + 1
    if (nextIndex >= agenda.length) return null
    return setAgendaIndex(nextIndex)
  }

  const syncViewport = async (viewport) => {
    if (!roomId) return

    setIsMutating(true)
    try {
      const state = await updateMeetingViewport(roomId, {
        viewport,
        isViewportSynced: true,
      })
      setMeetingState(state)

      if (socket) {
        socket.emit('meeting:sync-viewport', { roomId, viewport })
      }

      return state
    } catch (error) {
      toast.error(error.message || 'Failed to sync viewport')
      throw error
    } finally {
      setIsMutating(false)
    }
  }

  const setViewportSync = async (enabled) => {
    if (!roomId) return

    setIsMutating(true)
    try {
      const state = await updateMeetingViewport(roomId, {
        isViewportSynced: Boolean(enabled),
      })
      setMeetingState(state)

      if (socket) {
        socket.emit('meeting:sync-viewport', {
          roomId,
          viewport: state?.viewport || {},
        })
      }

      return state
    } catch (error) {
      toast.error(error.message || 'Failed to update sync mode')
      throw error
    } finally {
      setIsMutating(false)
    }
  }

  return {
    presenter,
    agenda,
    handQueue,
    currentAgendaIndex,
    isViewportSynced,
    isPresenter: presenter === userId,
    isLoading,
    isMutating,
    requestPresenter,
    raiseHand,
    lowerHand,
    updateAgenda: saveAgenda,
    setAgendaIndex,
    nextAgendaItem,
    syncViewport,
    setViewportSync,
    refreshState: syncMeetingState,
  }
}

export default useMeeting