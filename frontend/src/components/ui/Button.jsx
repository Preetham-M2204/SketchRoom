/**
 * Button Component
 * Reusable button with variant, size, and icon support
 *
 * Variants:
 * - primary: Vermillion background (main CTA)
 * - secondary: Slate teal background
 * - ghost: Transparent with border
 * - danger: Red for destructive actions
 *
 * Sizes: sm, md, lg
 */

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  icon = null,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
}) => {
  // Base styles
  const baseStyles = 'inline-flex items-center justify-center gap-8 font-medium transition-all duration-200 rounded-button disabled:opacity-50 disabled:cursor-not-allowed'

  // Variant styles
  const variants = {
    primary: 'bg-vermillion text-white hover:bg-vermillion-dark active:scale-98',
    secondary: 'bg-slate-teal text-white hover:bg-slate-teal-dark active:scale-98',
    ghost: 'bg-transparent border border-border-light text-text-primary hover:bg-surface-container-low',
    danger: 'bg-red-500 text-white hover:bg-red-600 active:scale-98',
  }

  // Size styles
  const sizes = {
    sm: 'px-16 py-8 text-13',
    md: 'px-24 py-12 text-15',
    lg: 'px-32 py-16 text-16',
  }

  // Width
  const widthClass = fullWidth ? 'w-full' : ''

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
    >
      {loading && (
        <svg className="animate-spin h-16 w-16" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}

      {!loading && icon && iconPosition === 'left' && (
        <span>{icon}</span>
      )}

      {children}

      {!loading && icon && iconPosition === 'right' && (
        <span>{icon}</span>
      )}
    </button>
  )
}

export default Button
