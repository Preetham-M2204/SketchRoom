import AvatarStack from '../ui/AvatarStack'
import Badge from '../ui/Badge'

/**
 * PresencePills Component
 * Displays active members in a room with their status
 *
 * Features:
 * - Avatar stack showing members
 * - Status indicators (active, idle)
 * - Live count badge
 * - Compact mode for mobile
 * - Tooltips on hover
 */

const PresencePills = ({ members = [], compact = false }) => {
  // Separate members by status
  const activeMembers = members.filter((m) => m.status === 'active')
  const idleMembers = members.filter((m) => m.status === 'idle')

  // For compact mode, show all members together
  if (compact) {
    return (
      <div className="flex items-center gap-12">
        {members.length > 0 && (
          <>
            <AvatarStack users={members} max={5} size="xs" showBorder />
            <span className="text-13 text-text-secondary">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          </>
        )}
      </div>
    )
  }

  // Desktop mode: Show active and idle separately
  return (
    <div className="flex items-center gap-16">
      {/* Active Members */}
      {activeMembers.length > 0 && (
        <div className="flex items-center gap-8 px-12 py-6 bg-green-50 rounded-pill border border-green-200">
          <div className="flex items-center gap-8">
            <div className="relative flex h-8 w-8">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-8 w-8 bg-green-500"></span>
            </div>
            <span className="text-13 font-medium text-green-700">
              {activeMembers.length}
            </span>
          </div>
          <AvatarStack users={activeMembers} max={3} size="xs" showBorder />
        </div>
      )}

      {/* Idle Members */}
      {idleMembers.length > 0 && (
        <div className="flex items-center gap-8 px-12 py-6 bg-surface-container-low rounded-pill border border-border-light">
          <div className="flex items-center gap-8">
            <div className="h-8 w-8 rounded-full bg-text-tertiary opacity-50"></div>
            <span className="text-13 font-medium text-text-secondary">
              {idleMembers.length}
            </span>
          </div>
          <AvatarStack users={idleMembers} max={3} size="xs" />
        </div>
      )}

      {/* Total Count */}
      {members.length === 0 && (
        <div className="text-14 text-text-tertiary italic">
          No members online
        </div>
      )}
    </div>
  )
}

export default PresencePills
