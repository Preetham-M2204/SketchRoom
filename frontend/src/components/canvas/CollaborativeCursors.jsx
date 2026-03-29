import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * CollaborativeCursors Component
 * Figma-style collaborative cursor overlay showing other users' cursors
 * in real-time with their name labels, unique colors, and tool indicators.
 *
 * Each cursor is an SVG arrow pointer with a colored label showing the user's name.
 * The cursors move smoothly with lerp-based animation.
 */

const CURSOR_COLORS = [
  '#D4420A', // Vermillion
  '#1E5F74', // Teal
  '#2A7A4B', // Green
  '#7B4EA6', // Purple
  '#C4871A', // Amber
  '#C0392B', // Red
  '#2980B9', // Blue
  '#16A085', // Emerald
]

function getCursorColor(userId) {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    hash |= 0
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length]
}

const CursorArrow = ({ color }) => (
  <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M0.928711 0.857422L14.9287 8.85742L8.42871 10.3574L4.92871 18.8574L0.928711 0.857422Z"
      fill={color}
      stroke="white"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  </svg>
)

/* A single remote cursor with smooth lerp movement */
const RemoteCursor = ({ user }) => {
  const posRef = useRef({ x: user.x, y: user.y })
  const elmRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const animate = () => {
      posRef.current.x += (user.x - posRef.current.x) * 0.2
      posRef.current.y += (user.y - posRef.current.y) * 0.2
      if (elmRef.current) {
        elmRef.current.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [user.x, user.y])

  const color = getCursorColor(user.userId)

  return (
    <div
      ref={elmRef}
      className="fixed top-0 left-0 pointer-events-none z-[500]"
      style={{ willChange: 'transform' }}
    >
      {/* SVG cursor arrow */}
      <CursorArrow color={color} />

      {/* Name label */}
      <div
        className="absolute left-4 top-4 px-2 py-0.5 rounded-md text-white text-[11px] font-semibold whitespace-nowrap shadow-sm"
        style={{ backgroundColor: color }}
      >
        {user.name}
        {user.tool && (
          <span className="ml-1.5 opacity-70 text-[9px] uppercase">
            {user.tool === 'pen' ? '/ Drawing' : user.tool === 'select' ? '' : `/ ${user.tool}`}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * CollaborativeCursors
 *
 * Props:
 * - socket: Socket.io instance for broadcasting cursor positions
 * - roomId: current room ID
 * - userId: current user's ID
 * - userName: current user's display name
 * - activeTool: the current tool the user has selected (optional)
 *
 * Socket events:
 * - Emits 'cursor:move' with { x, y, userId, name, tool }
 * - Listens to 'cursor:update' from other users
 */
const CollaborativeCursors = ({ socket, roomId, userId, userName, activeTool }) => {
  const [remoteCursors, setRemoteCursors] = useState({})
  const throttleRef = useRef(null)

  // Emit local cursor position
  const handleMouseMove = useCallback(
    (e) => {
      if (!socket || !roomId) return

      // Throttle to ~30fps
      if (throttleRef.current) return
      throttleRef.current = setTimeout(() => {
        throttleRef.current = null
      }, 33)

      socket.emit('cursor:move', {
        roomId,
        userId,
        name: userName || 'Anonymous',
        x: e.clientX,
        y: e.clientY,
        tool: activeTool || 'select',
      })
    },
    [socket, roomId, userId, userName, activeTool]
  )

  // Listen for remote cursors
  useEffect(() => {
    if (!socket) return

    const handleCursorUpdate = (data) => {
      if (data.userId === userId) return
      setRemoteCursors((prev) => ({
        ...prev,
        [data.userId]: {
          ...data,
          lastSeen: Date.now(),
        },
      }))
    }

    const handleCursorLeave = ({ userId: leftUserId }) => {
      setRemoteCursors((prev) => {
        const copy = { ...prev }
        delete copy[leftUserId]
        return copy
      })
    }

    socket.on('cursor:update', handleCursorUpdate)
    socket.on('cursor:leave', handleCursorLeave)

    return () => {
      socket.off('cursor:update', handleCursorUpdate)
      socket.off('cursor:leave', handleCursorLeave)
    }
  }, [socket, userId])

  // Attach mouse move listener
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [handleMouseMove])

  // Clean up stale cursors (>5s without update)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setRemoteCursors((prev) => {
        const cleaned = {}
        for (const key in prev) {
          if (now - prev[key].lastSeen < 5000) {
            cleaned[key] = prev[key]
          }
        }
        return cleaned
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // For demo: show mock collaborative cursors when no socket
  const [demoMode] = useState(!socket)
  const [demoCursors, setDemoCursors] = useState({})

  useEffect(() => {
    if (!demoMode) return

    // Simulate two other users with animated cursor positions
    let frame = 0
    const loop = () => {
      frame++
      const t = frame / 60

      setDemoCursors({
        'demo-sarah': {
          userId: 'demo-sarah',
          name: 'Sarah L.',
          x: 300 + Math.sin(t * 0.7) * 150,
          y: 250 + Math.cos(t * 0.5) * 100,
          tool: 'pen',
          lastSeen: Date.now(),
        },
        'demo-marcus': {
          userId: 'demo-marcus',
          name: 'Marcus T.',
          x: 600 + Math.cos(t * 0.4) * 120,
          y: 400 + Math.sin(t * 0.6) * 80,
          tool: 'select',
          lastSeen: Date.now(),
        },
      })

      return requestAnimationFrame(loop)
    }
    const id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [demoMode])

  const cursorsToRender = demoMode ? demoCursors : remoteCursors

  return (
    <div className="fixed inset-0 pointer-events-none z-[500]" aria-hidden="true">
      <AnimatePresence>
        {Object.values(cursorsToRender).map((cursor) => (
          <motion.div
            key={cursor.userId}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            <RemoteCursor user={cursor} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default CollaborativeCursors
