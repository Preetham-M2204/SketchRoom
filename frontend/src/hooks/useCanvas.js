import { useEffect, useRef, useState } from 'react'
import useCanvasStore from '../stores/useCanvasStore'
import useRoomStore from '../stores/useRoomStore'
import { drawStroke } from '../utils/drawStroke'
import { replayCanvas } from '../utils/replayCanvas'
import { nanoid } from 'nanoid'

/**
 * useCanvas Hook
 * Handles canvas drawing logic, mouse events, and stroke creation
 *
 * What it does:
 * - Sets up canvas element and 2D context
 * - Tracks mouse position and drawing state
 * - Collects points while drawing
 * - Emits complete strokes to socket
 * - Replays all strokes when they change
 *
 * Usage:
 * const { canvasRef, isDrawing } = useCanvas(socket, userId)
 *
 * @param {Socket} socket - Socket.io instance
 * @param {string} userId - Current user's ID
 * @returns {Object} { canvasRef, isDrawing }
 */

const useCanvas = (socket, userId) => {
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const currentStrokeRef = useRef([]) // Points being drawn right now

  const activeTool = useCanvasStore((state) => state.activeTool)
  const color = useCanvasStore((state) => state.color)
  const strokeWidth = useCanvasStore((state) => state.strokeWidth)
  const strokes = useRoomStore((state) => state.strokes)
  const addStroke = useRoomStore((state) => state.addStroke)

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctxRef.current = ctx

    // Set canvas size to container size
    const resizeCanvas = () => {
      const container = canvas.parentElement
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight

      // Replay all strokes after resize
      replayCanvas(ctx, strokes, canvas.width, canvas.height)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => window.removeEventListener('resize', resizeCanvas)
  }, [])

  // Replay strokes whenever they change
  useEffect(() => {
    if (!ctxRef.current || !canvasRef.current) return

    const ctx = ctxRef.current
    const canvas = canvasRef.current

    replayCanvas(ctx, strokes, canvas.width, canvas.height)
  }, [strokes])

  // Get mouse position relative to canvas
  const getMousePos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  // Mouse down - start drawing
  const handleMouseDown = (e) => {
    if (activeTool !== 'pen') return

    setIsDrawing(true)
    const pos = getMousePos(e)
    currentStrokeRef.current = [pos]

    // Draw starting point
    const ctx = ctxRef.current
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, strokeWidth / 2, 0, Math.PI * 2)
    ctx.fill()
  }

  // Mouse move - collect points
  const handleMouseMove = (e) => {
    if (!isDrawing || activeTool !== 'pen') return

    const pos = getMousePos(e)
    currentStrokeRef.current.push(pos)

    // Draw line to new point
    const ctx = ctxRef.current
    const points = currentStrokeRef.current
    const prevPoint = points[points.length - 2]

    ctx.strokeStyle = color
    ctx.lineWidth = strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(prevPoint.x, prevPoint.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  // Mouse up - finish stroke
  const handleMouseUp = () => {
    if (!isDrawing) return

    setIsDrawing(false)

    // Create stroke object
    const stroke = {
      id: nanoid(),
      userId,
      points: currentStrokeRef.current,
      color,
      width: strokeWidth,
      timestamp: Date.now(),
    }

    // Add to store
    addStroke(stroke)

    // Emit to socket
    if (socket) {
      socket.emit('draw:stroke', stroke)
    }

    // Reset current stroke
    currentStrokeRef.current = []
  }

  // Attach event listeners
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mouseleave', handleMouseUp)

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('mouseleave', handleMouseUp)
    }
  }, [activeTool, color, strokeWidth, isDrawing])

  return {
    canvasRef,
    isDrawing,
  }
}

export default useCanvas
