import { useEffect, useRef, useState } from 'react'
import { nanoid } from 'nanoid'
import useCanvasStore from '../stores/useCanvasStore'
import useRoomStore from '../stores/useRoomStore'
import { drawStroke } from '../utils/drawStroke'
import { replayCanvas } from '../utils/replayCanvas'

const DRAW_TOOLS = new Set(['pen', 'eraser', 'line', 'rectangle', 'circle'])
const SHAPE_TOOLS = new Set(['line', 'rectangle', 'circle'])
const MAX_STROKE_POINTS = 2000

function normalizeViewport(viewport = {}) {
  const zoom = Number.isFinite(viewport?.zoom) ? viewport.zoom : 1
  return {
    x: Number.isFinite(viewport?.x) ? viewport.x : 0,
    y: Number.isFinite(viewport?.y) ? viewport.y : 0,
    zoom: Math.min(Math.max(zoom, 0.1), 8),
  }
}

const useCanvas = (socket, userId, viewport = { x: 0, y: 0, zoom: 1 }) => {
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const isDrawingRef = useRef(false)
  const currentStrokeRef = useRef([])
  const startPointRef = useRef(null)
  const strokesRef = useRef([])
  const viewportRef = useRef(normalizeViewport(viewport))
  const activeTouchPointersRef = useRef(new Set())

  const activeTool = useCanvasStore((state) => state.activeTool)
  const color = useCanvasStore((state) => state.color)
  const strokeWidth = useCanvasStore((state) => state.strokeWidth)

  const strokes = useRoomStore((state) => state.strokes)
  const addStroke = useRoomStore((state) => state.addStroke)

  useEffect(() => {
    strokesRef.current = strokes
  }, [strokes])

  useEffect(() => {
    viewportRef.current = normalizeViewport(viewport)
  }, [viewport])

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctxRef.current = ctx
    canvas.style.touchAction = 'none'

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (!container) return

      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      replayCanvas(ctx, strokesRef.current, canvas.width, canvas.height, viewportRef.current)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  useEffect(() => {
    if (!ctxRef.current || !canvasRef.current) return

    replayCanvas(
      ctxRef.current,
      strokes,
      canvasRef.current.width,
      canvasRef.current.height,
      viewportRef.current
    )
  }, [strokes])

  useEffect(() => {
    if (!ctxRef.current || !canvasRef.current) return

    replayCanvas(
      ctxRef.current,
      strokesRef.current,
      canvasRef.current.width,
      canvasRef.current.height,
      viewportRef.current
    )
  }, [viewport])

  const getPointerPos = (event) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const activeViewport = viewportRef.current
    const screenX = event.clientX - rect.left
    const screenY = event.clientY - rect.top

    return {
      x: (screenX - activeViewport.x) / activeViewport.zoom,
      y: (screenY - activeViewport.y) / activeViewport.zoom,
    }
  }

  const drawWithViewport = (stroke) => {
    const ctx = ctxRef.current
    if (!ctx) return

    const activeViewport = viewportRef.current

    ctx.save()
    ctx.setTransform(
      activeViewport.zoom,
      0,
      0,
      activeViewport.zoom,
      activeViewport.x,
      activeViewport.y
    )
    drawStroke(ctx, stroke)
    ctx.restore()
  }

  const getNormalizedTool = () => {
    if (DRAW_TOOLS.has(activeTool)) return activeTool
    return 'pen'
  }

  const getEffectiveStrokeWidth = (tool) => {
    if (tool === 'eraser') {
      return Math.max(strokeWidth * 3, 10)
    }

    return strokeWidth
  }

  const buildStrokePayload = (points) => {
    const tool = getNormalizedTool()

    return {
      id: nanoid(),
      userId,
      tool,
      points,
      color: tool === 'eraser' ? '__ERASER__' : color,
      width: getEffectiveStrokeWidth(tool),
      timestamp: Date.now(),
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return

    const handlePointerDown = (event) => {
      if (event.pointerType === 'touch') {
        activeTouchPointersRef.current.add(event.pointerId)

        if (activeTouchPointersRef.current.size > 1) {
          isDrawingRef.current = false
          setIsDrawing(false)
          currentStrokeRef.current = []
          startPointRef.current = null
          replayCanvas(ctx, strokesRef.current, canvas.width, canvas.height, viewportRef.current)
          return
        }
      }

      if (!DRAW_TOOLS.has(activeTool)) return
      if (event.pointerType === 'mouse' && event.button !== 0) return

      if (event.pointerType === 'touch' && activeTouchPointersRef.current.size > 1) return

      event.preventDefault()

      if (canvas.setPointerCapture) {
        canvas.setPointerCapture(event.pointerId)
      }

      const pos = getPointerPos(event)
      startPointRef.current = pos
      currentStrokeRef.current = [pos]
      isDrawingRef.current = true
      setIsDrawing(true)

      const tool = getNormalizedTool()
      if (tool === 'pen' || tool === 'eraser') {
        const firstDot = {
          tool,
          points: [pos],
          color: tool === 'eraser' ? '__ERASER__' : color,
          width: getEffectiveStrokeWidth(tool),
        }
        drawWithViewport(firstDot)
      }
    }

    const handlePointerMove = (event) => {
      if (!isDrawingRef.current || !DRAW_TOOLS.has(activeTool)) return
      if (event.pointerType === 'touch' && activeTouchPointersRef.current.size > 1) return

      event.preventDefault()
      const pos = getPointerPos(event)
      const tool = getNormalizedTool()

      if (SHAPE_TOOLS.has(tool)) {
        currentStrokeRef.current = [startPointRef.current, pos]
        replayCanvas(ctx, strokesRef.current, canvas.width, canvas.height, viewportRef.current)
        drawWithViewport({
          tool,
          points: currentStrokeRef.current,
          color,
          width: getEffectiveStrokeWidth(tool),
        })
        return
      }

      currentStrokeRef.current.push(pos)
      if (currentStrokeRef.current.length > MAX_STROKE_POINTS) {
        currentStrokeRef.current.shift()
      }

      const points = currentStrokeRef.current
      const prevPoint = points[points.length - 2]
      if (!prevPoint) return

      drawWithViewport({
        tool,
        points: [prevPoint, pos],
        color: tool === 'eraser' ? '__ERASER__' : color,
        width: getEffectiveStrokeWidth(tool),
      })
    }

    const finishStroke = () => {
      if (!isDrawingRef.current) return

      const tool = getNormalizedTool()
      const points = currentStrokeRef.current

      isDrawingRef.current = false
      setIsDrawing(false)
      currentStrokeRef.current = []
      startPointRef.current = null

      if (!points.length) return

      if (SHAPE_TOOLS.has(tool)) {
        const [start, end] = points
        if (!start || !end) {
          replayCanvas(ctx, strokesRef.current, canvas.width, canvas.height, viewportRef.current)
          return
        }

        if (start.x === end.x && start.y === end.y) {
          replayCanvas(ctx, strokesRef.current, canvas.width, canvas.height, viewportRef.current)
          return
        }
      }

      const stroke = buildStrokePayload(points)
      addStroke(stroke)

      if (socket) {
        socket.emit('draw:stroke', stroke)
      }
    }

    const handlePointerUp = (event) => {
      if (event?.pointerType === 'touch') {
        activeTouchPointersRef.current.delete(event.pointerId)
      }

      if (event?.preventDefault) {
        event.preventDefault()
      }

      if (event?.pointerId !== undefined && canvas.releasePointerCapture) {
        try {
          canvas.releasePointerCapture(event.pointerId)
        } catch {
          // Ignore release failures when capture is already gone.
        }
      }

      finishStroke()
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointercancel', handlePointerUp)
    canvas.addEventListener('pointerleave', handlePointerUp)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      activeTouchPointersRef.current.clear()
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointercancel', handlePointerUp)
      canvas.removeEventListener('pointerleave', handlePointerUp)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [activeTool, color, strokeWidth, socket, userId, addStroke])

  return {
    canvasRef,
    isDrawing,
  }
}

export default useCanvas
