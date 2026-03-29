import { useEffect, useRef } from 'react'

/**
 * usePresence Hook
 * Tracks user activity and broadcasts presence status
 *
 * What it does:
 * - Detects when user is active (mouse move, keypress)
 * - Detects when user is idle (no activity for 2 minutes)
 * - Emits presence updates to socket
 * - Sends cursor position updates (throttled)
 *
 * Presence states:
 * - active: User is moving mouse/typing
 * - idle: No activity for 2+ minutes
 *
 * Usage:
 * usePresence(socket, roomId)
 *
 * @param {Socket} socket - Socket.io instance
 * @param {string} roomId - Current room ID
 */

const usePresence = (socket, roomId) => {
  const idleTimerRef = useRef(null)
  const cursorThrottleRef = useRef(null)
  const isIdleRef = useRef(false)

  // Mark user as active
  const setActive = () => {
    if (isIdleRef.current) {
      isIdleRef.current = false
      if (socket) {
        socket.emit('presence:status', { roomId, status: 'active' })
      }
    }

    // Reset idle timer
    clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      isIdleRef.current = true
      if (socket) {
        socket.emit('presence:status', { roomId, status: 'idle' })
      }
    }, 2 * 60 * 1000) // 2 minutes
  }

  // Handle mouse movement (with throttle)
  const handleMouseMove = (e) => {
    setActive()

    // Throttle cursor position updates (max 30 times per second)
    if (cursorThrottleRef.current) return

    cursorThrottleRef.current = setTimeout(() => {
      cursorThrottleRef.current = null

      if (socket) {
        socket.emit('cursor:move', {
          roomId,
          x: e.clientX,
          y: e.clientY,
        })
      }
    }, 33) // ~30fps
  }

  // Handle keyboard activity
  const handleKeyPress = () => {
    setActive()
  }

  // Setup event listeners
  useEffect(() => {
    if (!socket || !roomId) return

    // Initial active status
    setActive()

    // Listen for activity
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('keydown', handleKeyPress)
    window.addEventListener('click', setActive)

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('keydown', handleKeyPress)
      window.removeEventListener('click', setActive)
      clearTimeout(idleTimerRef.current)
      clearTimeout(cursorThrottleRef.current)
    }
  }, [socket, roomId])
}

export default usePresence
