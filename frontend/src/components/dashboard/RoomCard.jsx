import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import Badge from '../ui/Badge'
import AvatarStack from '../ui/AvatarStack'
import Button from '../ui/Button'
import ModeIndicator from '../layout/ModeIndicator'

/**
 * RoomCard Component
 * Displays a single room card on dashboard
 *
 * Features:
 * - Mode badge (Decision, Meeting, GD, Canvas)
 * - Live indicator (pulsing dot)
 * - Room title
 * - Last edited timestamp
 * - Member avatars (max 3 visible)
 * - Action button (Join now / Open)
 * - Hover animations
 */

// Fallback for date-fns if not installed
const formatRelativeTime = (date) => {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  } catch {
    // Fallback if date-fns not available
    const seconds = Math.floor((new Date() - new Date(date)) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }
}

const RoomCard = ({ room, index = 0 }) => {
  const navigate = useNavigate()
  const isLive = room.members?.some((m) => m.status === 'active')

  const handleOpen = () => {
    navigate(`/room/${room.publicId || room.id}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="
        bg-surface-bright p-24 rounded-card
        border border-border-light hover:border-border-medium
        hover:shadow-lg
        transition-all duration-200
        cursor-pointer group
      "
      onClick={handleOpen}
    >
      {/* Header: Mode Badge + Live Indicator */}
      <div className="flex items-center justify-between mb-16">
        <ModeIndicator mode={room.mode} showIcon={false} compact />

        {isLive && (
          <Badge variant="live" pulse size="sm">
            LIVE
          </Badge>
        )}
      </div>

      {/* Room Title */}
      <h3 className="text-18 font-semibold text-text-primary mb-8 group-hover:text-vermillion transition-colors line-clamp-2">
        {room.name}
      </h3>

      {/* Last Edited */}
      <p className="text-13 text-text-tertiary mb-20">
        Edited {formatRelativeTime(room.lastActive || room.createdAt)}
      </p>

      {/* Footer: Members + Action */}
      <div className="flex items-center justify-between gap-16">
        {/* Member Avatars */}
        <div className="flex-1 min-w-0">
          {room.members && room.members.length > 0 ? (
            <AvatarStack users={room.members} max={3} size="sm" showBorder />
          ) : (
            <span className="text-13 text-text-tertiary italic">No members</span>
          )}
        </div>

        {/* Action Button */}
        <Button
          variant={isLive ? 'primary' : 'ghost'}
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            handleOpen()
          }}
        >
          {isLive ? 'Join now' : 'Open'}
        </Button>
      </div>
    </motion.div>
  )
}

export default RoomCard
