/**
 * Draws a single stroke on the canvas
 * A stroke is a series of points connected by lines
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Object} stroke - Stroke object from backend/Zustand
 * @param {Array} stroke.points - [{ x, y }, { x, y }, ...]
 * @param {string} stroke.color - Hex or HSL color
 * @param {number} stroke.width - Line thickness in pixels
 *
 * Example stroke object:
 * {
 *   id: 'stroke-123',
 *   userId: 'user-456',
 *   points: [
 *     { x: 100, y: 200 },
 *     { x: 101, y: 201 },
 *     { x: 103, y: 203 }
 *   ],
 *   color: '#18170F',
 *   width: 2,
 *   timestamp: 1678901234567
 * }
 */
export const drawStroke = (ctx, stroke) => {
  if (!stroke.points || stroke.points.length === 0) return

  const tool = stroke.tool || (stroke.color === '__ERASER__' ? 'eraser' : 'pen')

  const prevCompositeOperation = ctx.globalCompositeOperation
  ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'

  // Configure canvas context
  ctx.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : stroke.color
  ctx.lineWidth = stroke.width
  ctx.lineCap = 'round' // Smooth ends
  ctx.lineJoin = 'round' // Smooth corners

  const firstPoint = stroke.points[0]

  if (tool === 'line' || tool === 'rectangle' || tool === 'circle') {
    const endPoint = stroke.points[Math.max(stroke.points.length - 1, 1)] || firstPoint

    if (tool === 'line') {
      ctx.beginPath()
      ctx.moveTo(firstPoint.x, firstPoint.y)
      ctx.lineTo(endPoint.x, endPoint.y)
      ctx.stroke()
      ctx.globalCompositeOperation = prevCompositeOperation
      return
    }

    if (tool === 'rectangle') {
      const x = Math.min(firstPoint.x, endPoint.x)
      const y = Math.min(firstPoint.y, endPoint.y)
      const width = Math.abs(endPoint.x - firstPoint.x)
      const height = Math.abs(endPoint.y - firstPoint.y)

      if (width === 0 || height === 0) {
        ctx.globalCompositeOperation = prevCompositeOperation
        return
      }

      ctx.beginPath()
      ctx.rect(x, y, width, height)
      ctx.stroke()
      ctx.globalCompositeOperation = prevCompositeOperation
      return
    }

    const radius = Math.hypot(endPoint.x - firstPoint.x, endPoint.y - firstPoint.y)
    if (radius <= 0) {
      ctx.globalCompositeOperation = prevCompositeOperation
      return
    }

    ctx.beginPath()
    ctx.arc(firstPoint.x, firstPoint.y, radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalCompositeOperation = prevCompositeOperation
    return
  }

  if (stroke.points.length === 1) {
    const onlyPoint = stroke.points[0]
    ctx.fillStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : stroke.color
    ctx.beginPath()
    ctx.arc(onlyPoint.x, onlyPoint.y, stroke.width / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = prevCompositeOperation
    return
  }

  // Start drawing
  ctx.beginPath()

  // Move to first point (don't draw yet)
  ctx.moveTo(firstPoint.x, firstPoint.y)

  // Draw lines to all subsequent points
  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
  }

  // Actually render the stroke
  ctx.stroke()
  ctx.globalCompositeOperation = prevCompositeOperation
}

/**
 * Draws a single point (for very short strokes or dots)
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} point - { x, y }
 * @param {string} color
 * @param {number} width
 */
export const drawPoint = (ctx, point, color, width) => {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(point.x, point.y, width / 2, 0, Math.PI * 2)
  ctx.fill()
}
