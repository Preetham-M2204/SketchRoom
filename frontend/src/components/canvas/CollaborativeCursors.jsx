import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const CURSOR_COLORS = [
  '#D4420A',
  '#1E5F74',
  '#2A7A4B',
  '#7B4EA6',
  '#C4871A',
  '#C0392B',
  '#2980B9',
  '#16A085',
]

function getCursorColor(userId = 'local-cursor') {
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

const RemoteCursor = ({ user, isSelf = false, variant = 'figma' }) => {
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
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [user.x, user.y])

  const color = getCursorColor(user.userId)
  const label = isSelf ? 'You' : user.name

  if (variant === 'minimal') {
    return (
      <div
        ref={elmRef}
        className="fixed top-0 left-0 pointer-events-none z-[650]"
        style={{ willChange: 'transform' }}
      >
        <div className="relative">
          <span
            className="block w-3 h-3 rounded-full border-2 border-white shadow"
            style={{ backgroundColor: color }}
          />
          <span
            className="absolute left-4 -top-1 px-2 py-0.5 rounded-md text-white text-[10px] font-semibold whitespace-nowrap shadow-sm"
            style={{ backgroundColor: color }}
          >
            {label}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={elmRef}
      className="fixed top-0 left-0 pointer-events-none z-[650]"
      style={{ willChange: 'transform' }}
    >
      <CursorArrow color={color} />
      <div
        className="absolute left-4 top-4 px-2 py-0.5 rounded-md text-white text-[11px] font-semibold whitespace-nowrap shadow-sm"
        style={{ backgroundColor: color }}
      >
        {label}
        {user.tool ? (
          <span className="ml-1.5 opacity-75 text-[9px] uppercase">
            / {user.tool}
          </span>
        ) : null}
      </div>
    </div>
  )
}

const CollaborativeCursors = ({
  socket,
  roomId,
  userId,
  userName,
  activeTool,
  showLocalCursor = true,
  variant = 'figma',
}) => {
  const [remoteCursors, setRemoteCursors] = useState({})
  const [localCursor, setLocalCursor] = useState(null)
  const throttleRef = useRef(null)
  const lastClientRef = useRef({ x: 0, y: 0 })

  const updateCursor = useCallback(
    ({ x, y, emitSocket = true }) => {
      lastClientRef.current = { x, y }

      const payload = {
        roomId,
        userId,
        name: userName || 'Anonymous',
        x,
        y,
        tool: activeTool || 'select',
      }

      if (showLocalCursor && userId) {
        setLocalCursor({
          ...payload,
          lastSeen: Date.now(),
        })
      }

      if (!socket || !roomId || !userId) return
      if (!emitSocket) return

      if (throttleRef.current) return
      throttleRef.current = setTimeout(() => {
        throttleRef.current = null
      }, 33)

      socket.emit('cursor:move', payload)
    },
    [socket, roomId, userId, userName, activeTool, showLocalCursor]
  )

  const handlePointerMove = useCallback(
    (event) => {
      updateCursor({
        x: event.clientX,
        y: event.clientY,
      })
    },
    [updateCursor]
  )

  useEffect(() => {
    if (!socket) return

    const handleCursorUpdate = (data) => {
      if (!data?.userId || data.userId === userId) return

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
        const next = { ...prev }
        delete next[leftUserId]
        return next
      })
    }

    socket.on('cursor:update', handleCursorUpdate)
    socket.on('cursor:leave', handleCursorLeave)

    return () => {
      socket.off('cursor:update', handleCursorUpdate)
      socket.off('cursor:leave', handleCursorLeave)
    }
  }, [socket, userId])

  useEffect(() => {
    document.addEventListener('pointermove', handlePointerMove)

    const handleViewportInteraction = () => {
      const { x, y } = lastClientRef.current
      if (x || y) {
        updateCursor({ x, y, emitSocket: false })
      }
    }

    document.addEventListener('wheel', handleViewportInteraction, { passive: true })

    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('wheel', handleViewportInteraction)
      if (throttleRef.current) {
        clearTimeout(throttleRef.current)
        throttleRef.current = null
      }
    }
  }, [handlePointerMove, updateCursor])

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

  const hasFinePointer =
    typeof window === 'undefined' ? true : window.matchMedia('(pointer:fine)').matches

  if (!hasFinePointer) {
    return null
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-[640]" aria-hidden="true">
      <AnimatePresence>
        {showLocalCursor && localCursor ? (
          <motion.div
            key="local-cursor"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.12 }}
          >
            <RemoteCursor user={localCursor} isSelf variant={variant} />
          </motion.div>
        ) : null}

        {Object.values(remoteCursors).map((cursor) => (
          <motion.div
            key={cursor.userId}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.15 }}
          >
            <RemoteCursor user={cursor} variant={variant} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default CollaborativeCursors
