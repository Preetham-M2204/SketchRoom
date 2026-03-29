import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { createRoom, getRooms } from '../api/rooms'
import useAuthStore from '../stores/useAuthStore'
import { toast } from '../components/ui/Toast'
import CustomCursor from '../components/ui/CustomCursor'

const roomModes = [
  {
    id: 'decision',
    icon: 'how_to_reg',
    label: 'Decision',
    chip: 'DECISION',
    color: '#D4420A',
    description: 'Voting & consensus for fast alignment.',
  },
  {
    id: 'meeting',
    icon: 'groups',
    label: 'Meeting',
    chip: 'MEETING',
    color: '#1E5F74',
    description: 'Structured notes & whiteboard sync.',
  },
  {
    id: 'gd',
    icon: 'forum',
    label: 'GD Round',
    chip: 'GD ROUND',
    color: '#2A7A4B',
    description: 'Evaluation & feedback workflows.',
  },
  {
    id: 'canvas',
    icon: 'gesture',
    label: 'Open Canvas',
    chip: 'OPEN CANVAS',
    color: '#18170F',
    description: 'Freeform creative exploration.',
  },
]

/* ── SVG Preview Illustrations for each mode ── */
const DecisionPreview = () => (
  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 160" fill="none">
    {/* Diagonal hatching background */}
    <defs>
      <pattern id="diag" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(24,23,15,0.04)" strokeWidth="1" />
      </pattern>
    </defs>
    <rect width="320" height="160" fill="url(#diag)" />
    {/* Colored sticky notes */}
    <g transform="translate(40, 20) rotate(-5, 50, 40)">
      <rect width="80" height="65" rx="3" fill="#d4f5d4" stroke="#2A7A4B" strokeWidth="0.5" />
      <line x1="10" y1="20" x2="70" y2="20" stroke="#2A7A4B" strokeWidth="0.5" opacity="0.3" />
      <line x1="10" y1="32" x2="55" y2="32" stroke="#2A7A4B" strokeWidth="0.5" opacity="0.3" />
    </g>
    <g transform="translate(100, 40) rotate(3, 50, 40)">
      <rect width="75" height="60" rx="3" fill="#fff5d4" stroke="#C4871A" strokeWidth="0.5" />
      <line x1="10" y1="18" x2="65" y2="18" stroke="#C4871A" strokeWidth="0.5" opacity="0.3" />
      <line x1="10" y1="30" x2="50" y2="30" stroke="#C4871A" strokeWidth="0.5" opacity="0.3" />
    </g>
    <g transform="translate(170, 15) rotate(-2, 50, 40)">
      <rect width="85" height="65" rx="3" fill="#ffe4d4" stroke="#D4420A" strokeWidth="0.5" />
      <line x1="10" y1="20" x2="75" y2="20" stroke="#D4420A" strokeWidth="0.5" opacity="0.3" />
      <line x1="10" y1="32" x2="60" y2="32" stroke="#D4420A" strokeWidth="0.5" opacity="0.3" />
    </g>
    <g transform="translate(210, 70) rotate(4, 40, 30)">
      <rect width="70" height="55" rx="3" fill="#ffd4d4" stroke="#C0392B" strokeWidth="0.5" />
      <line x1="8" y1="16" x2="60" y2="16" stroke="#C0392B" strokeWidth="0.5" opacity="0.3" />
    </g>
  </svg>
)

const MeetingPreview = () => (
  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 160" fill="none">
    <defs>
      <pattern id="dots-m" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="12" cy="12" r="0.6" fill="rgba(30,95,116,0.15)" />
      </pattern>
    </defs>
    <rect width="320" height="160" fill="url(#dots-m)" />
    {/* Agenda lines */}
    <rect x="40" y="30" width="100" height="8" rx="4" fill="rgba(30,95,116,0.18)" />
    <rect x="40" y="48" width="140" height="8" rx="4" fill="rgba(30,95,116,0.12)" />
    <rect x="40" y="66" width="80" height="8" rx="4" fill="rgba(30,95,116,0.08)" />
    {/* Card mock */}
    <rect x="160" y="45" width="110" height="75" rx="6" fill="white" stroke="rgba(30,95,116,0.12)" strokeWidth="0.5" />
    <rect x="170" y="55" width="90" height="10" rx="2" fill="rgba(30,95,116,0.1)" />
    <rect x="170" y="72" width="60" height="6" rx="2" fill="rgba(30,95,116,0.06)" />
    <rect x="170" y="85" width="90" height="25" rx="3" fill="rgba(30,95,116,0.05)" />
  </svg>
)

const GdRoundPreview = () => (
  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 160" fill="none">
    {/* Overlapping circles */}
    <circle cx="130" cy="75" r="42" stroke="rgba(42,122,75,0.2)" strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
    <circle cx="175" cy="65" r="38" stroke="rgba(42,122,75,0.15)" strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
    <circle cx="150" cy="95" r="30" stroke="rgba(42,122,75,0.1)" strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
    {/* Timer ring */}
    <circle cx="155" cy="78" r="16" stroke="rgba(42,122,75,0.25)" strokeWidth="2" fill="white" />
    <text x="155" y="82" textAnchor="middle" fontSize="8" fill="rgba(42,122,75,0.5)" fontFamily="monospace">45s</text>
  </svg>
)

const CanvasPreview = () => (
  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 160" fill="none">
    <defs>
      <pattern id="diag-c" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(24,23,15,0.03)" strokeWidth="1" />
      </pattern>
    </defs>
    <rect width="320" height="160" fill="#FAFAF2" />
    <rect width="320" height="160" fill="url(#diag-c)" />
    {/* Abstract brush strokes */}
    <path d="M60 100 Q100 40 160 80 T260 60" stroke="rgba(212,66,10,0.12)" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M80 120 Q140 70 200 110" stroke="rgba(30,95,116,0.1)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <rect x="180" y="35" width="80" height="50" rx="4" fill="rgba(24,23,15,0.03)" stroke="rgba(24,23,15,0.06)" strokeWidth="0.5" />
  </svg>
)

const PREVIEW_MAP = {
  decision: DecisionPreview,
  meeting: MeetingPreview,
  gd: GdRoundPreview,
  canvas: CanvasPreview,
}

const Dashboard = () => {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [newRoom, setNewRoom] = useState({
    name: '',
    topic: '',
    mode: 'decision',
    isPublic: false,
  })

  useEffect(() => {
    fetchRooms()
  }, [])

  // Close profile menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (showProfileMenu) setShowProfileMenu(false)
      if (showMobileMenu) setShowMobileMenu(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [showProfileMenu, showMobileMenu])

  const fetchRooms = async () => {
    try {
      setLoading(true)
      const data = await getRooms()
      setRooms(data || [])
    } catch (error) {
      setRooms([
        { id: '1', name: 'Q4 Strategy Roadmap', mode: 'decision', isLive: true, updatedAt: new Date(), participants: ['SM', 'MT', '+3'] },
        { id: '2', name: 'Design Sync: Project Aurora', mode: 'meeting', updatedAt: new Date(Date.now() - 3600000), participants: ['JS', 'AL'] },
        { id: '3', name: 'Frontend Architect Interview', mode: 'gd', updatedAt: new Date(Date.now() - 86400000), participants: [] },
        { id: '4', name: 'Moodboard: Spring 2025', mode: 'canvas', updatedAt: new Date(Date.now() - 259200000), participants: ['KM'] },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRoom = async () => {
    if (!newRoom.name.trim()) {
      toast.error('Please enter a room name')
      return
    }
    try {
      const room = await createRoom(newRoom)
      setRooms((prev) => [room, ...prev])
      setShowModal(false)
      setNewRoom({ name: '', topic: '', mode: 'decision', isPublic: false })
      toast.success('Room created successfully!')
      navigate(`/room/${room.id}`)
    } catch (error) {
      toast.error('Failed to create room')
    }
  }

  const formatTime = (date) => {
    const now = new Date()
    const diff = now - new Date(date)
    if (diff < 60000) return 'Edited just now'
    if (diff < 3600000) return `Edited ${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `Edited ${Math.floor(diff / 3600000)}h ago`
    if (diff < 604800000) return `Edited ${Math.floor(diff / 86400000)}d ago`
    return 'Edited last week'
  }

  const getModeMeta = (mode) => roomModes.find((item) => item.id === mode) || roomModes[0]

  const getParticipantTokens = (participants = []) => {
    return participants.slice(0, 3).map((participant) => {
      if (typeof participant === 'string') {
        return participant.length <= 3 ? participant : participant.charAt(0).toUpperCase()
      }
      return 'U'
    })
  }

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch =
        !searchQuery ||
        room.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.topic?.toLowerCase().includes(searchQuery.toLowerCase())
      if (!matchesSearch) return false
      if (activeFilter === 'live') return Boolean(room.isLive)
      if (activeFilter === 'mine') return true
      if (activeFilter === 'recent') return true
      return true
    })
  }, [activeFilter, rooms, searchQuery])

  return (
    <div
      className="min-h-screen antialiased text-[#18170F] font-body"
      style={{
        backgroundColor: '#F2EEE6',
        backgroundImage: 'radial-gradient(rgba(24,23,15,0.07) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}
    >
      <CustomCursor hoverSelector="button, a, input, .cursor-hover" />

      {/* ══════════════════════════════════
          TOP NAVIGATION BAR
      ══════════════════════════════════ */}
      <nav className="h-[52px] w-full sticky top-0 z-50 bg-[#FEFCF8] border-b border-[#18170F]/[0.08] flex items-center justify-between px-4 sm:px-6">
        {/* Left: Logo + Nav links */}
        <div className="flex items-center gap-3 sm:gap-5 min-w-0">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined text-[#D4420A] text-[20px]">edit_square</span>
            <span className="text-[15px] sm:text-[17px] font-bold text-[#18170F] tracking-tight">Sketchroom</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            <button className="text-[#D4420A] font-semibold text-sm px-3 py-1.5 rounded-md bg-[#D4420A]/5">Rooms</button>
            <button className="text-[#18170F]/50 text-sm px-3 py-1.5 rounded-md hover:bg-[#18170F]/5 transition-colors">Templates</button>
            <button className="text-[#18170F]/50 text-sm px-3 py-1.5 rounded-md hover:bg-[#18170F]/5 transition-colors">Assets</button>
          </div>
        </div>

        {/* Right: Search + New room + Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Desktop search bar */}
          <div className="relative hidden lg:block w-[260px] xl:w-[320px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#18170F]/35 text-[18px]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#18170F]/[0.04] border border-[#18170F]/[0.06] rounded-full pl-9 pr-4 h-9 text-sm focus:ring-1 focus:ring-[#D4420A]/40 focus:border-[#D4420A]/40 w-full transition-all placeholder:text-[#18170F]/30"
              placeholder="Search..."
            />
          </div>

          {/* Mobile search toggle */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#18170F]/5 text-[#18170F]/50"
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
          </button>

          {/* New room button */}
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#D4420A] text-white text-[13px] font-semibold px-4 sm:px-5 h-9 rounded-full hover:bg-[#B33508] active:scale-[0.97] transition-all whitespace-nowrap flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px] hidden sm:inline">add</span>
            <span className="hidden sm:inline">New room</span>
            <span className="sm:hidden material-symbols-outlined text-[18px]">add</span>
          </button>

          {/* Profile avatar */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="w-9 h-9 rounded-full bg-[#D4420A] text-white text-sm font-bold border-2 border-[#D4420A]/20 hover:border-[#D4420A]/50 transition-colors flex items-center justify-center"
            >
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </button>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-[#18170F]/8 shadow-xl py-1.5 z-50"
                >
                  <div className="px-4 py-3 border-b border-[#18170F]/6">
                    <p className="font-semibold text-sm text-[#18170F]">{user?.name || 'Demo User'}</p>
                    <p className="text-xs text-[#6A6558] mt-0.5">{user?.email || 'demo@sketchroom.local'}</p>
                  </div>
                  <button
                    onClick={() => {
                      logout()
                      navigate('/login')
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-[#C0392B] hover:bg-[#C0392B]/5 transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMobileMenu(!showMobileMenu)
            }}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#18170F]/5 text-[#18170F]/60"
          >
            <span className="material-symbols-outlined text-[22px]">{showMobileMenu ? 'close' : 'menu'}</span>
          </button>
        </div>
      </nav>

      {/* Mobile search bar */}
      <AnimatePresence>
        {showMobileSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden overflow-hidden bg-[#FEFCF8] border-b border-[#18170F]/[0.08] px-4 sticky top-[52px] z-40"
          >
            <div className="py-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#18170F]/35 text-[18px]">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="bg-[#18170F]/[0.04] border border-[#18170F]/[0.06] rounded-full pl-9 pr-4 h-10 text-sm focus:ring-1 focus:ring-[#D4420A]/40 w-full placeholder:text-[#18170F]/30"
                  placeholder="Search rooms..."
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile nav menu */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden bg-[#FEFCF8] border-b border-[#18170F]/[0.08] px-4 sticky top-[52px] z-40"
          >
            <div className="py-2 flex flex-col gap-1">
              <button className="text-left text-[#D4420A] font-semibold text-sm px-3 py-2 rounded-md bg-[#D4420A]/5">Rooms</button>
              <button className="text-left text-[#18170F]/60 text-sm px-3 py-2 rounded-md hover:bg-[#18170F]/5">Templates</button>
              <button className="text-left text-[#18170F]/60 text-sm px-3 py-2 rounded-md hover:bg-[#18170F]/5">Assets</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header + Filter pills */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 mb-8 sm:mb-10">
          <div>
            <h1 className="text-[26px] sm:text-[32px] font-semibold text-[#18170F] leading-tight">Your rooms</h1>
            <p className="text-[#6A6558] text-sm sm:text-base mt-1">Manage and collaborate on your creative workspaces.</p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#18170F]/[0.05] rounded-full w-fit overflow-x-auto shrink-0 no-scrollbar">
            {['all', 'live', 'mine', 'recent'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  activeFilter === filter
                    ? 'bg-[#18170F] text-[#EDE9E0] shadow-sm'
                    : 'text-[#18170F]/50 hover:text-[#18170F]/80'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </header>

        {/* ══════════════════════════════════
            ROOM GRID
        ══════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
          {/* Create new room card */}
          <button
            onClick={() => setShowModal(true)}
            className="group flex flex-col items-center justify-center min-h-[240px] rounded-[12px] border-2 border-dashed border-[#18170F]/10 bg-[#FEFCF8]/40 hover:bg-[#FEFCF8] hover:border-[#D4420A]/30 transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-full bg-[#18170F]/[0.04] flex items-center justify-center text-[#18170F]/30 group-hover:text-[#D4420A] group-hover:bg-[#D4420A]/8 transition-all duration-300">
              <span className="material-symbols-outlined text-[30px]">add</span>
            </div>
            <span className="mt-4 font-medium text-[#18170F]/50 group-hover:text-[#18170F]/80 transition-colors">Create new room</span>
          </button>

          {/* Room cards */}
          {loading
            ? [...Array(4)].map((_, index) => (
                <div key={index} className="bg-[#FEFCF8] border border-[#18170F]/[0.06] rounded-[12px] overflow-hidden animate-pulse">
                  <div className="h-[140px] bg-[#18170F]/[0.03]" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-[#18170F]/8 rounded w-3/4" />
                    <div className="h-3 bg-[#18170F]/6 rounded w-1/3" />
                  </div>
                </div>
              ))
            : filteredRooms.map((room, index) => {
                const mode = getModeMeta(room.mode)
                const participantTokens = getParticipantTokens(room.participants)
                const PreviewComponent = PREVIEW_MAP[room.mode] || CanvasPreview

                return (
                  <motion.article
                    key={room.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06, duration: 0.4 }}
                    className="group bg-[#FEFCF8] border border-[#18170F]/[0.06] rounded-[12px] overflow-hidden flex flex-col hover:shadow-lg hover:shadow-[#18170F]/[0.06] hover:border-[#18170F]/[0.12] transition-all duration-300"
                  >
                    {/* Preview area */}
                    <div className="relative h-[140px] overflow-hidden">
                      <PreviewComponent />
                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex gap-2 z-10">
                        <span
                          className="px-2.5 py-[3px] rounded-full text-[10px] font-bold tracking-wider text-white shadow-sm"
                          style={{ backgroundColor: mode.color }}
                        >
                          {mode.chip}
                        </span>
                        {room.isLive && (
                          <div className="flex items-center gap-1.5 px-2.5 py-[3px] rounded-full bg-amber-500/12 text-amber-700 text-[10px] font-bold border border-amber-500/15">
                            <span className="w-[6px] h-[6px] rounded-full bg-amber-500 animate-pulse" />
                            LIVE
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info area */}
                    <div className="p-4 flex flex-col flex-grow">
                      <h3 className="font-semibold text-[16px] sm:text-[17px] leading-snug text-[#18170F] line-clamp-2">{room.name}</h3>
                      <p className="text-[12px] text-[#A09890] mt-1">{formatTime(room.updatedAt)}</p>

                      <div className="mt-auto pt-4 flex items-center justify-between gap-3">
                        {/* Participant avatars */}
                        <div className="flex -space-x-2">
                          {participantTokens.length > 0 ? (
                            participantTokens.map((token, tokenIndex) => (
                              <div
                                key={`${room.id}-${tokenIndex}`}
                                className="w-7 h-7 rounded-full border-2 border-[#FEFCF8] bg-[#3D7289] flex items-center justify-center text-[10px] font-bold text-white"
                              >
                                {token}
                              </div>
                            ))
                          ) : (
                            <div className="w-7 h-7 rounded-full border-2 border-[#FEFCF8] bg-[#18170F]/[0.06] flex items-center justify-center text-[#18170F]/30">
                              <span className="material-symbols-outlined text-[14px]">person</span>
                            </div>
                          )}
                        </div>

                        {/* Action button */}
                        <button
                          onClick={() => navigate(`/room/${room.id}`)}
                          className={`px-4 py-1.5 text-[12px] font-semibold rounded-full transition-all duration-200 shrink-0 ${
                            room.isLive
                              ? 'bg-[#2A7A4B] text-white hover:bg-[#23693F] shadow-sm'
                              : 'border border-[#18170F]/10 text-[#18170F]/70 hover:bg-[#18170F]/5 hover:border-[#18170F]/18'
                          }`}
                        >
                          {room.isLive ? 'Join now' : 'Open'}
                        </button>
                      </div>
                    </div>
                  </motion.article>
                )
              })}
        </div>
      </main>

      {/* ══════════════════════════════════
          CREATE ROOM MODAL
      ══════════════════════════════════ */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[#18170F]/40 backdrop-blur-sm p-0 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              transition={{ duration: 0.2 }}
              className="bg-white w-full sm:max-w-[520px] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-3 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-[#18170F]">Create a new room</h2>
                  <p className="text-sm text-[#6A6558] mt-0.5">Step 1: Choose a mode for your workspace</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-9 h-9 rounded-full hover:bg-[#18170F]/5 flex items-center justify-center text-[#18170F]/40"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="overflow-y-auto flex-1">
                <div className="px-6 sm:px-8 py-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roomModes.map((mode) => (
                    <label key={mode.id} className="cursor-pointer">
                      <input
                        type="radio"
                        name="roomMode"
                        value={mode.id}
                        checked={newRoom.mode === mode.id}
                        onChange={(e) => setNewRoom({ ...newRoom, mode: e.target.value })}
                        className="peer hidden"
                      />
                      <div className="p-4 rounded-xl border border-[#18170F]/8 hover:border-[#18170F]/15 text-left transition-all peer-checked:border-2 peer-checked:border-[#18170F]/25 peer-checked:bg-[#18170F]/[0.02]">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white mb-3"
                          style={{ backgroundColor: mode.color }}
                        >
                          <span className="material-symbols-outlined">{mode.icon}</span>
                        </div>
                        <div className="font-bold text-sm text-[#18170F]">{mode.label}</div>
                        <div className="text-[11px] text-[#6A6558] mt-1 leading-relaxed">{mode.description}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="px-6 sm:px-8 pb-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#18170F]/60 uppercase tracking-wider">Room Name</label>
                    <input
                      type="text"
                      value={newRoom.name}
                      onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                      className="w-full rounded-lg border border-[#18170F]/10 focus:ring-1 focus:ring-[#D4420A]/40 focus:border-[#D4420A]/40 h-11 text-sm px-4"
                      placeholder="e.g. Design Strategy Workshop"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#18170F]/60 uppercase tracking-wider">Topic</label>
                    <input
                      type="text"
                      value={newRoom.topic}
                      onChange={(e) => setNewRoom({ ...newRoom, topic: e.target.value })}
                      className="w-full rounded-lg border border-[#18170F]/10 focus:ring-1 focus:ring-[#D4420A]/40 focus:border-[#D4420A]/40 h-11 text-sm px-4"
                      placeholder="What are we deciding on?"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#18170F]/[0.03]">
                    <div>
                      <div className="text-sm font-semibold text-[#18170F]">Public Access</div>
                      <div className="text-[11px] text-[#6A6558]">Anyone with the link can join</div>
                    </div>
                    <button
                      onClick={() => setNewRoom((prev) => ({ ...prev, isPublic: !prev.isPublic }))}
                      className={`w-11 h-6 rounded-full relative transition-colors ${newRoom.isPublic ? 'bg-[#D4420A]' : 'bg-[#18170F]/15'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${newRoom.isPublic ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-6 sm:px-8 py-5 bg-[#18170F]/[0.03] flex justify-end gap-3 shrink-0 border-t border-[#18170F]/[0.04]">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-[#18170F]/50 hover:text-[#18170F]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRoom}
                  className="px-7 py-2.5 bg-[#18170F] text-white text-sm font-semibold rounded-full hover:bg-[#18170F]/90 active:scale-[0.97] transition-all"
                >
                  Create room
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hide scrollbar for filter pills */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}

export default Dashboard
