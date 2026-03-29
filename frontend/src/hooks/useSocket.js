import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import useAuthStore from '../stores/useAuthStore'
import useRoomStore from '../stores/useRoomStore'
import useModeStore from '../stores/useModeStore'
import { toast } from '../components/ui/Toast'

/**
 * useSocket Hook
 * Manages Socket.io connection and real-time event handlers
 *
 * What it does:
 * - Connects to backend Socket.io server
 * - Sends JWT token for authentication
 * - Listens to real-time events (draw, chat, presence, etc.)
 * - Auto-reconnects on disconnect
 * - Cleans up connection on unmount
 *
 * Usage:
 * const socket = useSocket(roomId)
 *
 * @param {string} roomId - Room ID to join
 * @returns {Socket} Socket.io instance
 */

const useSocket = (roomId) => {
  const socketRef = useRef(null)
  const token = useAuthStore((state) => state.token)
  const addStroke = useRoomStore((state) => state.addStroke)
  const removeStroke = useRoomStore((state) => state.removeStroke)
  const clearStrokes = useRoomStore((state) => state.clearStrokes)
  const addMessage = useRoomStore((state) => state.addMessage)
  const setMembers = useRoomStore((state) => state.setMembers)
  const addMember = useRoomStore((state) => state.addMember)
  const removeMember = useRoomStore((state) => state.removeMember)

  useEffect(() => {
    if (!roomId || !token) return

    // Create socket connection
    const socket = io('/', {
      auth: { token },
      transports: ['websocket'],
    })

    socketRef.current = socket

    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id)
      socket.emit('join-room', roomId)
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      toast.error('Connection failed. Retrying...')
    })

    // Room events
    socket.on('room:joined', ({ room, members }) => {
      useRoomStore.setState({ room })
      setMembers(members)
      toast.success('Joined room')
    })

    socket.on('room:member-joined', ({ member }) => {
      addMember(member)
      toast.info(`${member.name} joined`)
    })

    socket.on('room:member-left', ({ userId, userName }) => {
      removeMember(userId)
      toast.info(`${userName} left`)
    })

    // Drawing events
    socket.on('draw:stroke', (stroke) => {
      addStroke(stroke)
    })

    socket.on('draw:undo-stroke', ({ strokeId }) => {
      removeStroke(strokeId)
    })

    socket.on('draw:clear-canvas', () => {
      clearStrokes()
    })

    // Chat events
    socket.on('chat:message', (message) => {
      addMessage(message)
    })

    // Cleanup on unmount
    return () => {
      socket.emit('leave-room', roomId)
      socket.disconnect()
    }
  }, [roomId, token])

  return socketRef.current
}

export default useSocket
