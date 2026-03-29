import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useDecision from '../../hooks/useDecision'

/**
 * DecisionBoard Component
 * SWOT-style decision board matching the Stitch design reference
 * Features: colored sticky notes, large quadrant watermark letters,
 * sidebar chat, bottom toolbar, responsive mobile layout
 */

const QUADRANT_CONFIG = {
  strength: {
    label: 'STRENGTHS',
    letter: 'S',
    letterColor: 'rgba(42,122,75,0.08)',
    borderColor: '#2A7A4B',
    noteColor: '#d4f5d4',
    noteBorder: '#2A7A4B',
  },
  weakness: {
    label: 'WEAKNESSES',
    letter: 'W',
    letterColor: 'rgba(212,66,10,0.06)',
    borderColor: '#D4420A',
    noteColor: '#ffe4d4',
    noteBorder: '#D4420A',
  },
  opportunity: {
    label: 'OPPORTUNITIES',
    letter: 'O',
    letterColor: 'rgba(30,95,116,0.06)',
    borderColor: '#1E5F74',
    noteColor: '#d4eef5',
    noteBorder: '#1E5F74',
  },
  threat: {
    label: 'THREATS',
    letter: 'T',
    letterColor: 'rgba(192,57,43,0.06)',
    borderColor: '#C0392B',
    noteColor: '#fdd4d4',
    noteBorder: '#C0392B',
  },
}

const DecisionBoard = ({ socket, roomId, userId, room }) => {
  const navigate = useNavigate()
  const { phase, items, addItem, vote, changePhase } = useDecision(socket, roomId)

  const [message, setMessage] = useState('')
  const [activePhase, setActivePhase] = useState('brainstorm')
  const [sidebarTab, setSidebarTab] = useState('chat')
  const [showSidebar, setShowSidebar] = useState(true)

  const swotItems = {
    strength: [
      { id: '01', text: 'High performance engine core and sub-microsecond latency.' },
      { id: '02', text: 'Strong existing user base in financial sector.' },
    ],
    weakness: [
      { id: '08', text: 'Steep learning curve for non-technical admins.' },
    ],
    opportunity: [
      { id: '12', text: 'Expanding into the APAC region next quarter.' },
    ],
    threat: [
      { id: '21', text: 'Increased competitor funding in Q4.' },
    ],
  }

  const chatMessages = [
    { user: 'SARAH M.', time: '10:42 AM', text: 'Should we move item #08 to threats? It feels more external than internal.' },
    { user: 'MARCUS T.', time: '10:44 AM', text: "Agreed. Let's get a consensus on that during the voting phase." },
    { user: 'SYSTEM', time: '10:45 AM', text: 'Marcus T. joined the session', isSystem: true },
  ]

  const StickyNote = ({ item, config, rotation = 0 }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative p-4 rounded-md shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      style={{
        backgroundColor: config.noteColor,
        borderLeft: `3px solid ${config.noteBorder}`,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      <p className="text-sm text-[#18170F] leading-relaxed">{item.text}</p>
      <span className="inline-block mt-2 text-[11px] font-mono text-[#18170F]/40 bg-white/60 px-2 py-0.5 rounded">
        #{item.id}
      </span>
    </motion.div>
  )

  const QuadrantSection = ({ type, items: quadrantItems, position }) => {
    const config = QUADRANT_CONFIG[type]
    const isRight = position === 'topRight' || position === 'bottomRight'
    const isBottom = position === 'bottomLeft' || position === 'bottomRight'

    return (
      <div
        className="relative p-4 sm:p-6 min-h-[200px] sm:min-h-[280px]"
        style={{
          borderRight: !isRight ? '1px solid rgba(24,23,15,0.08)' : 'none',
          borderBottom: !isBottom ? '1px solid rgba(24,23,15,0.08)' : 'none',
        }}
      >
        {/* Large watermark letter */}
        <div
          className="absolute select-none pointer-events-none font-bold"
          style={{
            fontSize: 'clamp(80px, 12vw, 160px)',
            color: config.letterColor,
            top: isBottom ? 'auto' : '-10px',
            bottom: isBottom ? '-10px' : 'auto',
            left: !isRight ? '-5px' : 'auto',
            right: isRight ? '-5px' : 'auto',
            lineHeight: 1,
          }}
        >
          {config.letter}
        </div>

        {/* Quadrant header */}
        <div className={`flex items-center gap-2 mb-4 ${isRight ? 'justify-end' : ''}`}>
          {!isRight && (
            <span
              className="w-1.5 h-6 rounded-full"
              style={{ backgroundColor: config.borderColor }}
            />
          )}
          <h2 className="text-[13px] sm:text-[15px] font-semibold text-[#18170F]/30 tracking-wider uppercase">
            {config.label}
          </h2>
          {isRight && (
            <span
              className="w-1.5 h-6 rounded-full"
              style={{ backgroundColor: config.borderColor }}
            />
          )}
        </div>

        {/* Sticky notes */}
        <div className="space-y-3 relative z-10">
          {quadrantItems.map((item, i) => (
            <StickyNote
              key={item.id}
              item={item}
              config={config}
              rotation={i % 2 === 0 ? -1 : 2}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#fdf9f1] font-body overflow-hidden">
      {/* ━━ Header ━━ */}
      <header className="h-[48px] bg-[#2C2C28] px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-[#EDE9E0]/60 hover:text-[#EDE9E0] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h1 className="text-[15px] sm:text-[17px] font-bold text-[#EDE9E0] tracking-tight">
            Collaborative Canvas
          </h1>
          <span className="hidden sm:inline-flex px-2.5 py-[2px] text-[10px] font-bold tracking-wider text-white bg-[#D4420A] rounded-full uppercase">
            Decision Board
          </span>
        </div>

        {/* Center tabs */}
        <nav className="hidden sm:flex items-center gap-1">
          {['Canvas', 'Timeline', 'History'].map((tab, i) => (
            <a
              key={tab}
              href="#"
              className={`px-3 py-1 text-[13px] font-medium transition-colors ${
                i === 0
                  ? 'text-[#D4420A] border-b-2 border-[#D4420A]'
                  : 'text-[#EDE9E0]/50 hover:text-[#EDE9E0]/80'
              }`}
            >
              {tab}
            </a>
          ))}
        </nav>

        {/* Right: Avatars + Share */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex -space-x-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full bg-[#EDE9E0]/15 border-2 border-[#2C2C28]"
              />
            ))}
            <div className="w-7 h-7 rounded-full bg-[#D4420A]/20 border-2 border-[#2C2C28] flex items-center justify-center text-[10px] font-bold text-[#D4420A]">
              +4
            </div>
          </div>
          <button className="px-3 py-1.5 bg-[#D4420A] text-white text-[12px] font-semibold rounded-md hover:bg-[#B33508] transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">share</span>
            <span className="hidden sm:inline">Share</span>
          </button>
          <button className="text-[#EDE9E0]/50 hover:text-[#EDE9E0] p-1">
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>

          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="lg:hidden text-[#EDE9E0]/50 hover:text-[#EDE9E0] p-1"
          >
            <span className="material-symbols-outlined text-[20px]">
              {showSidebar ? 'right_panel_close' : 'right_panel_open'}
            </span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ━━ Main Canvas ━━ */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Phase tabs */}
          <div className="flex items-center gap-1 px-4 sm:px-6 py-3 border-b border-[#18170F]/6 bg-[#fdf9f1]">
            {[
              { id: 'brainstorm', label: 'INPUT' },
              { id: 'voting', label: 'VOTING' },
              { id: 'analysis', label: 'SUMMARY' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePhase(p.id)}
                className={`px-4 py-1.5 text-[11px] font-bold tracking-wider rounded-full transition-all ${
                  activePhase === p.id
                    ? 'bg-[#D4420A] text-white'
                    : 'text-[#18170F]/40 hover:text-[#18170F]/60 hover:bg-[#18170F]/5'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* SWOT Grid */}
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 min-h-full">
              <QuadrantSection type="strength" items={swotItems.strength} position="topLeft" />
              <QuadrantSection type="weakness" items={swotItems.weakness} position="topRight" />
              <QuadrantSection type="opportunity" items={swotItems.opportunity} position="bottomLeft" />
              <QuadrantSection type="threat" items={swotItems.threat} position="bottomRight" />
            </div>
          </div>

          {/* Bottom Toolbar */}
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-[#2C2C28] rounded-2xl px-2 py-1.5 shadow-xl z-20">
            {[
              { icon: 'near_me', label: 'Select', active: true },
              { icon: 'edit', label: 'Draw' },
              { icon: 'sticky_note_2', label: 'Sticky' },
              { icon: 'category', label: 'Shape' },
              { icon: 'title', label: 'Text' },
            ].map((tool) => (
              <button
                key={tool.icon}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors ${
                  tool.active
                    ? 'bg-[#D4420A] text-white'
                    : 'text-[#EDE9E0]/60 hover:text-[#EDE9E0] hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{tool.icon}</span>
                <span className="text-[9px] font-medium tracking-wide">{tool.label}</span>
              </button>
            ))}
          </div>
        </main>

        {/* ━━ Right Sidebar ━━ */}
        <AnimatePresence>
          {showSidebar && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="w-[280px] sm:w-[300px] bg-[#FEFCF8] border-l border-[#18170F]/8 flex flex-col shrink-0 overflow-hidden"
            >
              {/* Project info */}
              <div className="p-4 border-b border-[#18170F]/6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#D4420A] flex items-center justify-center text-white font-bold text-sm">
                    PA
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[#18170F]">Project Canvas</h3>
                    <p className="text-xs text-[#6A6558]">Collaborative Mode</p>
                  </div>
                </div>
                <button className="w-full mt-3 py-2 bg-[#D4420A] text-white text-[12px] font-semibold rounded-lg hover:bg-[#B33508] transition-colors">
                  Invite Member
                </button>
              </div>

              {/* Sidebar tabs */}
              <div className="flex border-b border-[#18170F]/6">
                {[
                  { id: 'chat', icon: 'chat_bubble', label: 'Chat' },
                  { id: 'participants', icon: 'group', label: 'Participants' },
                  { id: 'agenda', icon: 'format_list_bulleted', label: 'Agenda' },
                  { id: 'layers', icon: 'layers', label: 'Layers' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSidebarTab(tab.id)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                      sidebarTab === tab.id
                        ? 'text-[#D4420A] border-b-2 border-[#D4420A]'
                        : 'text-[#18170F]/35 hover:text-[#18170F]/60'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[11px] font-bold tracking-wider ${msg.isSystem ? 'text-[#D4420A]' : 'text-[#18170F]'}`}>
                        {msg.user}
                      </span>
                      <span className="text-[11px] text-[#A09890]">• {msg.time}</span>
                    </div>
                    <p className={`text-[13px] leading-relaxed p-3 rounded-lg ${
                      msg.isSystem
                        ? 'text-[#D4420A] font-semibold text-[11px] tracking-wider uppercase'
                        : 'text-[#18170F]/70 bg-[#18170F]/[0.03]'
                    }`}>
                      {msg.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Chat input */}
              <div className="p-4 border-t border-[#18170F]/6">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 bg-[#18170F]/[0.03] rounded-lg text-sm text-[#18170F] placeholder:text-[#18170F]/25 outline-none border border-[#18170F]/6 focus:border-[#D4420A]/30"
                  />
                  <button className="p-2 text-[#D4420A] hover:bg-[#D4420A]/5 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]">send</span>
                  </button>
                </div>
              </div>

              {/* Settings */}
              <div className="p-3 border-t border-[#18170F]/6">
                <button className="flex items-center gap-2 text-[#18170F]/35 text-[13px] hover:text-[#18170F]/60 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                  Settings
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* ━━ Status Bar ━━ */}
      <footer className="h-[32px] bg-[#2C2C28] px-4 sm:px-6 flex items-center justify-between text-[11px] text-[#EDE9E0]/50 shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-[#D4420A] font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4420A] animate-pulse" />
            Live Session: 42:15
          </span>
          <span className="hidden sm:inline">6 Participants</span>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <span>Grid: 40px</span>
          <span>Zoom: 100%</span>
          <span>Autosave: Enabled</span>
        </div>
      </footer>
    </div>
  )
}

export default DecisionBoard
