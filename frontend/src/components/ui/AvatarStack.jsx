import Avatar from './Avatar'

/**
 * AvatarStack Component
 * Displays overlapping avatars with "+N" overflow indicator
 * Used in: Room cards, presence pills, member lists
 *
 * Props:
 * - users: Array of user objects
 * - max: Maximum avatars to show before "+N" (default: 3)
 * - size: Avatar size ('xs' | 'sm' | 'md')
 * - showBorder: Show colored borders on avatars
 * - className: Additional classes
 *
 * Example:
 * <AvatarStack users={members} max={3} size="sm" />
 * Result: [Avatar1][Avatar2][Avatar3][+5]
 */

const AvatarStack = ({
  users = [],
  max = 3,
  size = 'sm',
  showBorder = false,
  className = '',
}) => {
  if (!users || users.length === 0) return null

  const visibleUsers = users.slice(0, max)
  const overflowCount = users.length - max

  // Overlap amount based on size
  const overlapMap = {
    xs: '-ml-8',
    sm: '-ml-12',
    md: '-ml-16',
  }
  const overlap = overlapMap[size] || overlapMap.sm

  // Plus badge size
  const badgeSizes = {
    xs: 'w-24 h-24 text-10',
    sm: 'w-32 h-32 text-12',
    md: 'w-40 h-40 text-14',
  }

  return (
    <div className={`flex items-center ${className}`}>
      {visibleUsers.map((user, index) => (
        <div
          key={user.id || index}
          className={`${index > 0 ? overlap : ''}`}
          style={{ zIndex: visibleUsers.length - index }}
        >
          <Avatar
            user={user}
            size={size}
            showBorder={showBorder}
          />
        </div>
      ))}

      {/* Overflow indicator */}
      {overflowCount > 0 && (
        <div
          className={`
            ${badgeSizes[size]}
            ${overlap}
            rounded-full
            bg-surface-container-high
            border-2 border-bg-light
            flex items-center justify-center
            font-medium text-text-secondary
          `}
          style={{ zIndex: 0 }}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  )
}

export default AvatarStack
