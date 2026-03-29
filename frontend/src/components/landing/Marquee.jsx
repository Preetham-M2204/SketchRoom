import { useEffect, useRef } from 'react'

/**
 * Marquee Component
 * Infinite scrolling text strip
 *
 * Features:
 * - Continuous horizontal scroll
 * - Duplicated content for seamless loop
 * - Customizable speed
 * - CSS animation (no JS RAF needed)
 *
 * Usage:
 * <Marquee speed={50}>Your scrolling text</Marquee>
 */

const Marquee = ({
  children,
  speed = 50, // pixels per second
  direction = 'left', // 'left' or 'right'
  className = ''
}) => {
  const marqueeRef = useRef(null)

  useEffect(() => {
    const marquee = marqueeRef.current
    if (!marquee) return

    const content = marquee.querySelector('.marquee-content')
    const contentWidth = content.offsetWidth

    // Calculate animation duration based on speed
    const duration = contentWidth / speed

    content.style.animationDuration = `${duration}s`
  }, [speed])

  return (
    <div
      ref={marqueeRef}
      className={`overflow-hidden py-16 bg-surface-container-low ${className}`}
    >
      <div
        className={`marquee-content inline-flex whitespace-nowrap ${
          direction === 'right' ? 'animate-marquee-right' : 'animate-marquee-left'
        }`}
      >
        {/* Original content */}
        <div className="flex items-center gap-32 px-16">
          {children}
        </div>

        {/* Duplicate for seamless loop */}
        <div className="flex items-center gap-32 px-16">
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * MarqueeText Component
 * Pre-styled text for marquee
 */
export const MarqueeText = ({ children }) => (
  <span className="text-13 font-medium text-text-secondary uppercase tracking-wider">
    {children}
  </span>
)

/**
 * MarqueeDot Component
 * Separator dot
 */
export const MarqueeDot = () => (
  <span className="w-4 h-4 rounded-full bg-vermillion opacity-60" />
)

export default Marquee
