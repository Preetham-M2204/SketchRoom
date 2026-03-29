import { useState, useEffect } from 'react'

/**
 * Timer Component
 * Countdown timer with auto-update and callback
 *
 * Props:
 * - duration: Total duration in seconds
 * - onComplete: Callback when timer reaches 0
 * - isActive: Whether timer is running
 * - format: 'mm:ss' | 'hh:mm:ss'
 * - showProgress: Show progress bar
 * - variant: 'default' | 'warning' | 'danger'
 *
 * Example:
 * <Timer duration={300} onComplete={handleTimeUp} isActive={true} />
 * Shows: "5:00" and counts down to "0:00"
 */

const Timer = ({
  duration,
  onComplete,
  isActive = false,
  format = 'mm:ss',
  showProgress = false,
  variant = 'default',
  className = '',
}) => {
  const [timeRemaining, setTimeRemaining] = useState(duration)

  useEffect(() => {
    setTimeRemaining(duration)
  }, [duration])

  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          if (onComplete) onComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, onComplete])

  // Format time to mm:ss or hh:mm:ss
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (format === 'hh:mm:ss' && hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Progress percentage
  const progress = ((duration - timeRemaining) / duration) * 100

  // Variant colors
  const variants = {
    default: 'text-text-primary',
    warning: 'text-orange-500',
    danger: 'text-red-500',
  }

  // Auto-switch variant based on time remaining
  const getAutoVariant = () => {
    const percentage = (timeRemaining / duration) * 100
    if (percentage <= 10) return 'danger'
    if (percentage <= 30) return 'warning'
    return 'default'
  }

  const currentVariant = variant === 'default' ? getAutoVariant() : variant

  return (
    <div className={`flex flex-col gap-8 ${className}`}>
      <div className={`font-mono text-20 font-semibold ${variants[currentVariant]}`}>
        {formatTime(timeRemaining)}
      </div>

      {showProgress && (
        <div className="w-full h-4 bg-surface-container-low rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              currentVariant === 'danger'
                ? 'bg-red-500'
                : currentVariant === 'warning'
                ? 'bg-orange-500'
                : 'bg-vermillion'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

export default Timer
