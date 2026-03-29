import { motion } from 'framer-motion'
import { Vote, Users, MessageSquare, Pencil } from 'lucide-react'
import Badge from '../ui/Badge'

/**
 * ModeCards Component
 * Displays 4 interactive mode cards on landing page
 *
 * Each card has:
 * - Icon
 * - Title
 * - Description
 * - Category badge
 * - Hover animation
 */

const modes = [
  {
    id: 'decision',
    icon: Vote,
    title: 'Decision Board',
    description: 'Structured outcomes with voting and weighted scales. Perfect for strategic planning.',
    category: 'Strategic',
    color: 'orange',
  },
  {
    id: 'meeting',
    icon: Users,
    title: 'Focus Meeting',
    description: 'Minimalist canvas for focused agendas. Keep meetings on track.',
    category: 'Interactive',
    color: 'blue',
  },
  {
    id: 'gd',
    icon: MessageSquare,
    title: 'GD Round',
    description: 'Rapid ideation sprints for brainstorming. Timed speaking turns.',
    category: 'Exploratory',
    color: 'purple',
  },
  {
    id: 'canvas',
    icon: Pencil,
    title: 'Free Canvas',
    description: 'Open playground for sketching and wireframing. No constraints.',
    category: 'Creative',
    color: 'teal',
  },
]

const ModeCard = ({ mode, index }) => {
  const Icon = mode.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="
        bg-surface-bright p-32 rounded-card
        border border-border-light
        hover:border-border-medium hover:shadow-lg
        transition-all duration-300
        group cursor-pointer
      "
    >
      {/* Category Badge */}
      <div className="flex items-center justify-between mb-20">
        <div className="p-12 bg-surface-container-low rounded-button group-hover:scale-110 transition-transform">
          <Icon size={24} className="text-vermillion" />
        </div>
        <Badge variant="default" size="sm">
          {mode.category}
        </Badge>
      </div>

      {/* Title */}
      <h3 className="text-20 font-semibold text-text-primary mb-12">
        {mode.title}
      </h3>

      {/* Description */}
      <p className="text-15 text-text-secondary leading-relaxed">
        {mode.description}
      </p>

      {/* Hover indicator */}
      <div className="mt-20 flex items-center gap-8 text-14 text-vermillion opacity-0 group-hover:opacity-100 transition-opacity">
        <span>Learn more</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </motion.div>
  )
}

const ModeCards = () => {
  return (
    <section className="py-80 px-24 max-w-7xl mx-auto">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-64"
      >
        <h2 className="text-48 font-light text-text-primary mb-16">
          Four modes. Every kind of thinking.
        </h2>
        <p className="text-18 text-text-secondary max-w-2xl mx-auto">
          Choose the right mode for your team's needs. Switch seamlessly as your session evolves.
        </p>
      </motion.div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-24">
        {modes.map((mode, index) => (
          <ModeCard key={mode.id} mode={mode} index={index} />
        ))}
      </div>
    </section>
  )
}

export default ModeCards
