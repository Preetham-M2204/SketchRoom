import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import RoomCard from './RoomCard'
import useAuthStore from '../../stores/useAuthStore'

/**
 * RoomGrid Component
 * Displays rooms in a responsive grid with filter tabs
 *
 * Features:
 * - Filter tabs (All, Live, Mine, Recent)
 * - Responsive grid layout (1-3 columns)
 * - Empty state for no rooms
 * - Smooth animations on filter change
 * - Staggered card entrance animations
 */

const FILTER_TABS = [
  { id: 'all', label: 'All Rooms' },
  { id: 'live', label: 'Live Now' },
  { id: 'mine', label: 'My Rooms' },
  { id: 'recent', label: 'Recent' },
]

const RoomGrid = ({ rooms = [], loading = false }) => {
  const [activeFilter, setActiveFilter] = useState('all')
  const user = useAuthStore((state) => state.user)

  // Filter rooms based on active tab
  const filteredRooms = useMemo(() => {
    if (!rooms.length) return []

    switch (activeFilter) {
      case 'live':
        // Show rooms with active members
        return rooms.filter((room) =>
          room.members?.some((m) => m.status === 'active')
        )

      case 'mine':
        // Show rooms created by current user
        return rooms.filter((room) => room.createdBy === user?.id)

      case 'recent':
        // Show rooms sorted by lastActive (most recent first)
        return [...rooms].sort(
          (a, b) =>
            new Date(b.lastActive || b.createdAt) -
            new Date(a.lastActive || a.createdAt)
        )

      case 'all':
      default:
        return rooms
    }
  }, [rooms, activeFilter, user])

  return (
    <div className="w-full">
      {/* Filter Tabs */}
      <div className="flex items-center gap-8 mb-32 overflow-x-auto pb-4">
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`
                relative px-20 py-10 rounded-button text-14 font-medium
                transition-all duration-200 whitespace-nowrap
                ${
                  isActive
                    ? 'text-vermillion'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-container-low'
                }
              `}
            >
              {tab.label}

              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeFilterTab"
                  className="absolute inset-0 bg-surface-container-low rounded-button border border-vermillion/20"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              <span className="relative z-10">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-80">
          <div className="flex flex-col items-center gap-16">
            <div className="w-48 h-48 border-4 border-vermillion border-t-transparent rounded-full animate-spin" />
            <p className="text-14 text-text-secondary">Loading rooms...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredRooms.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-80 px-24 text-center"
        >
          <div className="w-80 h-80 rounded-full bg-surface-container-low flex items-center justify-center mb-24">
            <svg
              className="w-40 h-40 text-text-tertiary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <h3 className="text-18 font-semibold text-text-primary mb-8">
            {activeFilter === 'all' && 'No rooms yet'}
            {activeFilter === 'live' && 'No live rooms'}
            {activeFilter === 'mine' && "You haven't created any rooms"}
            {activeFilter === 'recent' && 'No recent activity'}
          </h3>
          <p className="text-14 text-text-tertiary max-w-md">
            {activeFilter === 'all' &&
              'Create your first room to get started with collaborative brainstorming.'}
            {activeFilter === 'live' &&
              'No rooms are active right now. Check back later or create a new room.'}
            {activeFilter === 'mine' &&
              'Create a room to invite your team and start collaborating.'}
            {activeFilter === 'recent' &&
              'No recent activity. Join or create a room to get started.'}
          </p>
        </motion.div>
      )}

      {/* Room Grid */}
      {!loading && filteredRooms.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeFilter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-24"
          >
            {filteredRooms.map((room, index) => (
              <RoomCard key={room.id} room={room} index={index} />
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}

export default RoomGrid
