import { generateColor } from '../../utils/generateColor'

/**
 * Avatar Component
 * Round user avatar with image or fallback initials
 *
 * Props:
 * - user: { name, avatar } - User object
 * - size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 * - showBorder: Show colored border (uses user color)
 * - className: Additional classes
 *
 * Sizes:
 * - xs: 24px (presence pills)
 * - sm: 32px (chat messages)
 * - md: 40px (default, navbar)
 * - lg: 56px (profile pages)
 * - xl: 80px (settings)
 */

const Avatar = ({
  user,
  size = 'md',
  showBorder = false,
  className = '',
}) => {
  if (!user) return null

  // Size mapping
  const sizes = {
    xs: 'w-24 h-24 text-11',
    sm: 'w-32 h-32 text-13',
    md: 'w-40 h-40 text-15',
    lg: 'w-56 h-56 text-20',
    xl: 'w-80 h-80 text-28',
  }

  // Generate user-specific color for border and fallback background
  const userColor = user.id ? generateColor(user.id) : '#999'

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.split(' ')
    if (parts.length === 1) return parts[0][0].toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const initials = getInitials(user.name)

  return (
    <div
      className={`
        ${sizes[size]}
        rounded-full
        flex items-center justify-center
        font-medium
        overflow-hidden
        ${showBorder ? 'ring-2' : ''}
        ${className}
      `}
      style={{
        backgroundColor: user.avatar ? 'transparent' : userColor,
        ringColor: showBorder ? userColor : undefined,
      }}
    >
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-white font-semibold">
          {initials}
        </span>
      )}
    </div>
  )
}

export default Avatar
