import { Vote, Users, MessageSquare, Pencil } from 'lucide-react'
import { motion } from 'framer-motion'

/**
 * ModeSelector Component
 * Modal step to select room mode before creating room
 *
 * Features:
 * - 4 mode cards (Decision, Meeting, GD, Canvas)
 * - Icon, title, description for each
 * - Hover animations
 * - Selection highlighting
 */

const modes = [
  {
    id: 'decision',
    icon: Vote,
    title: 'Decision',
    description: 'Voting & consensus for fast alignment',
    color: 'orange',
  },
  {
    id: 'meeting',
    icon: Users,
    title: 'Meeting',
    description: 'Structured notes & whiteboard sync',
    color: 'blue',
  },
  {
    id: 'gd',
    icon: MessageSquare,
    title: 'GD Round',
    description: 'Evaluation & feedback workflows',
    color: 'purple',
  },
  {
    id: 'canvas',
    icon: Pencil,
    title: 'Open Canvas',
    description: 'Freeform creative exploration',
    color: 'teal',
  },
]

const ModeSelector = ({ selectedMode, onSelect }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-16">
      {modes.map((mode, index) => {
        const Icon = mode.icon
        const isSelected = selectedMode === mode.id

        return (
          <motion.button
            key={mode.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelect(mode.id)}
            className={`
              relative p-24 rounded-card text-left transition-all duration-200
              border-2 hover:scale-102
              ${
                isSelected
                  ? 'border-vermillion bg-vermillion/5'
                  : 'border-border-light bg-surface-bright hover:border-border-medium'
              }
            `}
          >
            {/* Icon */}
            <div
              className={`
              w-48 h-48 rounded-button flex items-center justify-center mb-16
              ${isSelected ? 'bg-vermillion/10' : 'bg-surface-container-low'}
            `}
            >
              <Icon
                size={24}
                className={isSelected ? 'text-vermillion' : 'text-text-secondary'}
              />
            </div>

            {/* Content */}
            <h3 className="text-18 font-semibold text-text-primary mb-8">
              {mode.title}
            </h3>
            <p className="text-14 text-text-secondary leading-relaxed">
              {mode.description}
            </p>

            {/* Selected Indicator */}
            {isSelected && (
              <motion.div
                layoutId="selectedMode"
                className="absolute inset-0 border-2 border-vermillion rounded-card pointer-events-none"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </motion.button>
        )
      })}
    </div>
  )
}

export default ModeSelector
