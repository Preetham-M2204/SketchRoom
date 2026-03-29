/**
 * Generates a consistent, vibrant color for a user based on their ID
 * Same user ID always returns the same color (deterministic)
 * Used for: cursor colors, avatar borders, stroke colors in collaborative canvas
 *
 * @param {string} userId - User's unique ID
 * @returns {string} HSL color string like "hsl(210, 80%, 60%)"
 *
 * Color range:
 * - Hue: 0-360 (full spectrum)
 * - Saturation: 70-85% (vibrant but not neon)
 * - Lightness: 50-65% (readable on both light and dark backgrounds)
 *
 * Avoids:
 * - Pure red (too aggressive)
 * - Yellow (hard to read)
 * - Pure white/black (conflicts with UI)
 */
export const generateColor = (userId) => {
  // Simple hash function to convert string to number
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash // Convert to 32-bit integer
  }

  // Map hash to hue (0-360)
  // Avoid red (340-20) and yellow (40-60) ranges
  const hue = Math.abs(hash % 280) + 60 // Range: 60-340 (skips red/yellow)

  // Randomize saturation and lightness slightly for variety
  const saturation = 70 + Math.abs(hash % 15) // 70-85%
  const lightness = 50 + Math.abs(hash % 15) // 50-65%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

/**
 * Generate color with specific lightness (for avatars vs cursors)
 * @param {string} userId
 * @param {number} lightness - 0-100
 * @returns {string} HSL color string
 */
export const generateColorWithLightness = (userId, lightness) => {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash
  }

  const hue = Math.abs(hash % 280) + 60
  const saturation = 70 + Math.abs(hash % 15)

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}
