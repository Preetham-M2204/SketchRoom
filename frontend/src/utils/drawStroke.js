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

  // Configure canvas context
  ctx.strokeStyle = stroke.color
  ctx.lineWidth = stroke.width
  ctx.lineCap = 'round' // Smooth ends
  ctx.lineJoin = 'round' // Smooth corners
  ctx.globalCompositeOperation = 'source-over' // Normal blend mode

  // Start drawing
  ctx.beginPath()

  // Move to first point (don't draw yet)
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y)

  // Draw lines to all subsequent points
  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
  }

  // Actually render the stroke
  ctx.stroke()
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
