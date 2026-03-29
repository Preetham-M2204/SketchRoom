/**
 * Badge Component
 * Small colored label for status, mode, or category indicators
 *
 * Variants:
 * - default: Gray background
 * - live: Green with pulse animation
 * - decision: Orange (Decision Board mode)
 * - meeting: Blue (Meeting Room mode)
 * - gd: Purple (GD Round mode)
 * - canvas: Teal (Open Canvas mode)
 *
 * Props:
 * - variant: Badge style variant
 * - children: Badge text content
 * - pulse: Show pulse animation (for LIVE badges)
 * - size: 'sm' | 'md'
 */

const Badge = ({
  variant = 'default',
  children,
  pulse = false,
  size = 'sm',
  className = '',
}) => {
  // Base styles
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-badge whitespace-nowrap'

  // Size styles
  const sizes = {
    sm: 'px-8 py-4 text-11',
    md: 'px-12 py-6 text-13',
  }

  // Variant styles
  const variants = {
    default: 'bg-surface-container-high text-text-secondary',
    live: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    decision: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    meeting: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    gd: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    canvas: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  }

  return (
    <span className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}>
      {pulse && (
        <span className="relative flex h-8 w-8 mr-6">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-8 w-8 bg-current"></span>
        </span>
      )}
      {children}
    </span>
  )
}

export default Badge
