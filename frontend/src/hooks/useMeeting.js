import { useEffect } from 'react'
import useModeStore from '../stores/useModeStore'
import { toast } from '../components/ui/Toast'

/**
 * useMeeting Hook
 * Manages Meeting Room mode logic
 *
 * What it does:
 * - Tracks current presenter
 * - Manages agenda items and timer
 * - Handles raised hands queue
 * - Syncs viewport (followers see presenter's view)
 *
 * Meeting Room features:
 * - Presenter role: One person controls what others see
 * - Agenda: Timed sections (Intro 5min, Demo 10min, etc.)
 * - Hand queue: Members raise hands to speak
 * - Viewport sync: Followers' canvas matches presenter's pan/zoom
 *
 * Usage:
 * const { presenter, agenda, handQueue } = useMeeting(socket, roomId, userId)
 *
 * @param {Socket} socket - Socket.io instance
 * @param {string} roomId - Current room ID
 * @param {string} userId - Current user ID
 */

const useMeeting = (socket, roomId, userId) => {
  const presenter = useModeStore((state) => state.meeting.presenter)
  const agenda = useModeStore((state) => state.meeting.agenda)
  const handQueue = useModeStore((state) => state.meeting.handQueue)
  const currentAgendaIndex = useModeStore((state) => state.meeting.currentAgendaIndex)
  const isViewportSynced = useModeStore((state) => state.meeting.isViewportSynced)

  const setPresenter = useModeStore((state) => state.setPresenter)
  const setAgenda = useModeStore((state) => state.setAgenda)
  const addToHandQueue = useModeStore((state) => state.addToHandQueue)
  const removeFromHandQueue = useModeStore((state) => state.removeFromHandQueue)
  const setCurrentAgendaIndex = useModeStore((state) => state.setCurrentAgendaIndex)
  const toggleViewportSync = useModeStore((state) => state.toggleViewportSync)

  // Socket event listeners
  useEffect(() => {
    if (!socket || !roomId) return

    // Presenter changed
    socket.on('meeting:set-presenter', ({ userId, userName }) => {
      setPresenter(userId)
      toast.info(`${userName} is now presenting`)
    })

    // Hand raised
    socket.on('meeting:raise-hand', ({ userId }) => {
      addToHandQueue(userId)
    })

    // Hand lowered
    socket.on('meeting:lower-hand', ({ userId }) => {
      removeFromHandQueue(userId)
    })

    // Agenda updated
    socket.on('meeting:set-agenda', ({ agenda }) => {
      setAgenda(agenda)
    })

    // Move to next agenda item
    socket.on('meeting:next-agenda', ({ index }) => {
      setCurrentAgendaIndex(index)
    })

    // Viewport sync toggled
    socket.on('meeting:sync-viewport', ({ viewport }) => {
      // Update canvas pan/zoom to match presenter
      // This would be handled by canvas component
      console.log('Sync viewport:', viewport)
    })

    return () => {
      socket.off('meeting:set-presenter')
      socket.off('meeting:raise-hand')
      socket.off('meeting:lower-hand')
      socket.off('meeting:set-agenda')
      socket.off('meeting:next-agenda')
      socket.off('meeting:sync-viewport')
    }
  }, [socket, roomId])

  // Helper functions
  const requestPresenter = () => {
    if (socket) {
      socket.emit('meeting:set-presenter', { roomId, userId })
    }
  }

  const raiseHand = () => {
    addToHandQueue(userId)
    if (socket) {
      socket.emit('meeting:raise-hand', { roomId, userId })
    }
  }

  const lowerHand = () => {
    removeFromHandQueue(userId)
    if (socket) {
      socket.emit('meeting:lower-hand', { roomId, userId })
    }
  }

  const updateAgenda = (newAgenda) => {
    setAgenda(newAgenda)
    if (socket) {
      socket.emit('meeting:set-agenda', { roomId, agenda: newAgenda })
    }
  }

  const nextAgendaItem = () => {
    const nextIndex = currentAgendaIndex + 1
    if (nextIndex < agenda.length) {
      setCurrentAgendaIndex(nextIndex)
      if (socket) {
        socket.emit('meeting:next-agenda', { roomId, index: nextIndex })
      }
    }
  }

  const syncViewport = (viewport) => {
    if (socket && presenter === userId) {
      socket.emit('meeting:sync-viewport', { roomId, viewport })
    }
  }

  return {
    presenter,
    agenda,
    handQueue,
    currentAgendaIndex,
    isViewportSynced,
    isPresenter: presenter === userId,
    requestPresenter,
    raiseHand,
    lowerHand,
    updateAgenda,
    nextAgendaItem,
    syncViewport,
  }
}

export default useMeeting
