import { useEffect, useRef } from 'react'

const CustomCursor = ({ enabled = true, hoverSelector = 'button, a, input, textarea, select, [role="button"], .cursor-hover' }) => {
  const dotRef = useRef(null)
  const ringRef = useRef(null)

  useEffect(() => {
    if (!enabled || !window.matchMedia('(pointer:fine)').matches) {
      document.body.style.cursor = ''
      return undefined
    }

    const dot = dotRef.current
    const ring = ringRef.current

    if (!dot || !ring) {
      return undefined
    }

    document.body.style.cursor = 'none'

    let mouseX = window.innerWidth / 2
    let mouseY = window.innerHeight / 2
    let ringX = mouseX
    let ringY = mouseY
    let animationFrameId = null

    const setHoverState = (isHovering) => {
      ring.style.width = isHovering ? '64px' : '32px'
      ring.style.height = isHovering ? '64px' : '32px'
      ring.style.borderColor = isHovering ? '#D4420A' : 'rgba(212, 66, 10, 0.5)'
      dot.style.transform = isHovering ? 'translate(-50%, -50%) scale(1.5)' : 'translate(-50%, -50%) scale(1)'
    }

    const handleMouseMove = (event) => {
      mouseX = event.clientX
      mouseY = event.clientY
      dot.style.left = `${mouseX}px`
      dot.style.top = `${mouseY}px`
      dot.style.opacity = '1'
      ring.style.opacity = '1'
    }

    const handleMouseLeave = () => {
      dot.style.opacity = '0'
      ring.style.opacity = '0'
    }

    const handleMouseEnter = () => {
      dot.style.opacity = '1'
      ring.style.opacity = '1'
    }

    const animateRing = () => {
      ringX += (mouseX - ringX) * 0.15
      ringY += (mouseY - ringY) * 0.15
      ring.style.left = `${ringX}px`
      ring.style.top = `${ringY}px`
      animationFrameId = window.requestAnimationFrame(animateRing)
    }

    const enterInteractive = () => setHoverState(true)
    const leaveInteractive = () => setHoverState(false)

    const interactiveElements = document.querySelectorAll(hoverSelector)
    interactiveElements.forEach((element) => {
      element.addEventListener('mouseenter', enterInteractive)
      element.addEventListener('mouseleave', leaveInteractive)
    })

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)
    animationFrameId = window.requestAnimationFrame(animateRing)

    return () => {
      document.body.style.cursor = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseenter', handleMouseEnter)
      interactiveElements.forEach((element) => {
        element.removeEventListener('mouseenter', enterInteractive)
        element.removeEventListener('mouseleave', leaveInteractive)
      })
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [enabled, hoverSelector])

  if (!enabled) {
    return null
  }

  return (
    <>
      <div ref={dotRef} className="custom-cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="custom-cursor-ring" aria-hidden="true" />
    </>
  )
}

export default CustomCursor
