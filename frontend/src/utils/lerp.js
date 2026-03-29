/**
 * Linear interpolation - smoothly moves a value from current to target
 * Used for smooth cursor following
 *
 * @param {number} start - Current value
 * @param {number} end - Target value
 * @param {number} amount - How much to move (0 = no movement, 1 = instant)
 * @returns {number} Interpolated value
 *
 * Example:
 * Current cursor X = 100
 * Mouse actual X = 200
 * lerp(100, 200, 0.1) = 110
 *
 * Call this every frame (60fps) to create smooth "easing" effect
 */
export const lerp = (start, end, amount) => {
  return start + (end - start) * amount
}

/**
 * Lerp for 2D points (cursor position)
 * @param {Object} start - { x, y }
 * @param {Object} end - { x, y }
 * @param {number} amount - Easing factor (0.05-0.2 for smooth follow)
 * @returns {Object} { x, y }
 */
export const lerpPoint = (start, end, amount) => {
  return {
    x: lerp(start.x, end.x, amount),
    y: lerp(start.y, end.y, amount),
  }
}
