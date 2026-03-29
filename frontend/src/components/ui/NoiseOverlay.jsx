/**
 * NoiseOverlay Component
 * Subtle grain texture overlay for high-end editorial aesthetic
 * Inspired by wekraft.xyz and Stitch design system
 *
 * Props:
 * - opacity: Noise opacity (0-1, default: 0.05)
 * - className: Additional classes
 *
 * Usage:
 * Add to layout components or full-page backgrounds:
 * <div className="relative">
 *   <NoiseOverlay />
 *   <div>Content here</div>
 * </div>
 *
 * How it works:
 * Uses CSS filter with SVG turbulence to create fractal grain pattern
 * Positioned absolute with pointer-events-none so it doesn't block clicks
 */

const NoiseOverlay = ({ opacity = 0.05, className = '' }) => {
  return (
    <>
      {/* SVG filter definition */}
      <svg className="hidden">
        <defs>
          <filter id="noise-filter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="4"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
      </svg>

      {/* Noise overlay */}
      <div
        className={`
          absolute inset-0 pointer-events-none
          ${className}
        `}
        style={{
          filter: 'url(#noise-filter)',
          opacity: opacity,
          mixBlendMode: 'overlay',
        }}
      />
    </>
  )
}

export default NoiseOverlay
