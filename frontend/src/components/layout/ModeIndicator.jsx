import Badge from '../ui/Badge'
import { Vote, Users, MessageSquare, Pencil } from 'lucide-react'

/**
 * ModeIndicator Component
 * Displays current room mode with icon and label
 *
 * Features:
 * - Color-coded by mode
 * - Icon + text label
 * - Compact size option
 * - Tooltip on hover
 */

const MODE_CONFIG = {
  decision: {
    label: 'Decision Board',
    shortLabel: 'Decision',
    icon: Vote,
    variant: 'decision',
    color: '#FF6B35',
  },
  meeting: {
    label: 'Focus Meeting',
    shortLabel: 'Meeting',
    icon: Users,
    variant: 'meeting',
    color: '#4ECDC4',
  },
  gd: {
    label: 'GD Round',
    shortLabel: 'GD Round',
    icon: MessageSquare,
    variant: 'gd',
    color: '#9B59B6',
  },
  canvas: {
    label: 'Free Canvas',
    shortLabel: 'Canvas',
    icon: Pencil,
    variant: 'canvas',
    color: '#1E5F74',
  },
}

const ModeIndicator = ({ mode, showIcon = true, compact = false }) => {
  const config = MODE_CONFIG[mode] || MODE_CONFIG.canvas
  const Icon = config.icon

  if (compact) {
    return (
      <div
        className="flex items-center gap-6 px-8 py-4 rounded-badge bg-surface-container-low"
        title={config.label}
      >
        {showIcon && <Icon size={14} style={{ color: config.color }} />}
        <span className="text-12 font-medium text-text-primary">
          {config.shortLabel}
        </span>
      </div>
    )
  }

  return (
    <Badge variant={config.variant} size="md">
      <div className="flex items-center gap-6">
        {showIcon && <Icon size={14} />}
        <span>{config.label}</span>
      </div>
    </Badge>
  )
}

export default ModeIndicator
