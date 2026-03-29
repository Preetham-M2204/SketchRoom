import { drawStroke } from './drawStroke'

/**
 * Replays all strokes on a canvas (used for initial render and late joiners)
 * Clears canvas first, then draws each stroke in chronological order
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Array} strokes - Array of stroke objects from Zustand/backend
 * @param {number} canvasWidth - Canvas width (for clearing)
 * @param {number} canvasHeight - Canvas height (for clearing)
 *
 * Use cases:
 * 1. Late joiner enters room → fetch historical strokes → replay all
 * 2. Undo operation → remove last stroke from array → replay remaining
 * 3. Window resize → clear canvas → replay all strokes at new size
 */
export const replayCanvas = (ctx, strokes, canvasWidth, canvasHeight) => {
  // Clear entire canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  // Optionally draw canvas background
  ctx.fillStyle = '#F7F4EF' // Canvas surface color from design system
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Draw each stroke in order
  strokes.forEach((stroke) => {
    drawStroke(ctx, stroke)
  })
}

/**
 * Partially replay canvas (for performance optimization)
 * Only redraws strokes that changed since last render
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} strokes - All strokes
 * @param {number} lastRenderedCount - How many were drawn last time
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
export const replayCanvasPartial = (
  ctx,
  strokes,
  lastRenderedCount,
  canvasWidth,
  canvasHeight
) => {
  // If stroke count decreased (undo), full replay required
  if (strokes.length < lastRenderedCount) {
    replayCanvas(ctx, strokes, canvasWidth, canvasHeight)
    return strokes.length
  }

  // Only draw new strokes since last render
  for (let i = lastRenderedCount; i < strokes.length; i++) {
    drawStroke(ctx, strokes[i])
  }

  return strokes.length
}
