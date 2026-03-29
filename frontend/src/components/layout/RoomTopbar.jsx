import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, Users, MoreHorizontal } from 'lucide-react'
import useRoomStore from '../../stores/useRoomStore'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { toast } from '../ui/Toast'
import PresencePills from './PresencePills'
import ModeIndicator from './ModeIndicator'

/**
 * RoomTopbar Component
 * Top bar displayed in room pages showing room info and actions
 *
 * Features:
 * - Back to dashboard button
 * - Room name
 * - Mode indicator
 * - Presence pills (active members)
 * - Invite code copy button
 * - Room actions menu
 */

const RoomTopbar = () => {
  const navigate = useNavigate()
  const room = useRoomStore((state) => state.room)
  const members = useRoomStore((state) => state.members)

  const handleCopyInviteCode = () => {
    if (room?.inviteCode) {
      navigator.clipboard.writeText(room.inviteCode)
      toast.success('Invite code copied!')
    }
  }

  const handleLeaveRoom = () => {
    navigate('/dashboard')
    // Socket cleanup happens in useSocket hook
  }

  if (!room) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-bg-light/90 backdrop-blur-md border-b border-border-light">
      <div className="max-w-screen-2xl mx-auto px-24 py-12 flex items-center justify-between gap-16">
        {/* Left: Back Button + Room Info */}
        <div className="flex items-center gap-16 min-w-0 flex-1">
          {/* Back Button */}
          <button
            onClick={handleLeaveRoom}
            className="flex-shrink-0 p-8 hover:bg-surface-container-low rounded-button transition-colors text-text-secondary hover:text-text-primary"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={20} />
          </button>

          {/* Room Name */}
          <div className="min-w-0 flex-1">
            <h1 className="text-18 font-semibold text-text-primary truncate">
              {room.name}
            </h1>
          </div>

          {/* Mode Indicator */}
          <ModeIndicator mode={room.mode} />
        </div>

        {/* Center: Presence Pills */}
        <div className="hidden lg:flex items-center">
          <PresencePills members={members} />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-12 flex-shrink-0">
          {/* Invite Button */}
          {room.inviteCode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyInviteCode}
              icon={<Copy size={16} />}
              iconPosition="left"
              className="hidden md:flex"
            >
              {room.inviteCode}
            </Button>
          )}

          {/* Member Count (mobile) */}
          <div className="lg:hidden flex items-center gap-8 px-12 py-6 bg-surface-container-low rounded-button">
            <Users size={16} className="text-text-secondary" />
            <span className="text-13 font-medium text-text-primary">
              {members.length}
            </span>
          </div>

          {/* More Menu */}
          <button
            className="p-8 hover:bg-surface-container-low rounded-button transition-colors text-text-secondary hover:text-text-primary"
            aria-label="More options"
          >
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Presence Pills */}
      <div className="lg:hidden px-24 pb-12">
        <PresencePills members={members} compact />
      </div>
    </div>
  )
}

export default RoomTopbar
