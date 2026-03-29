import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useMeeting from '../../hooks/useMeeting'

/**
 * MeetingRoom Component
 * Matches Stitch design: left agenda sidebar, presenter banner, canvas with content,
 * right chat sidebar, bottom toolbar — fully responsive
 */

const MeetingRoom = ({ socket, roomId, userId, room }) => {
  const navigate = useNavigate()
  const {
    presenter,
    agenda,
    handQueue,
    currentAgendaIndex,
    isPresenter,
    raiseHand,
    lowerHand,
  } = useMeeting(socket, roomId, userId)

  const [chatMessage, setChatMessage] = useState('')
  const [showChat, setShowChat] = useState(true)
  const [showAgenda, setShowAgenda] = useState(true)

  const agendaItems = [
    { id: 1, label: 'Introduction', time: '02:00', status: 'done' },
    { id: 2, label: 'Ideation Phase', time: '04:23 / 10:00', status: 'active' },
    { id: 3, label: 'Asset Review', time: '15:00', status: 'upcoming' },
    { id: 4, label: 'Final Decisions', time: '05:00', status: 'upcoming' },
  ]

  const chatMessages = [
    { user: 'MARCUS T.', time: '10:42 AM', text: "Let's look at the typography on the main hero section again. Should it be Inter or a custom serif?" },
    { user: 'SARAH LANE', time: '10:44 AM', text: "I think Inter Black provides that Swiss-Editorial punch we're aiming for." },
  ]

  return (
    <div className="h-screen w-screen flex flex-col bg-[#fdf9f1] font-body overflow-hidden">
      {/* ━━ Header ━━ */}
      <header className="h-[48px] bg-[#2C2C28] px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-[#EDE9E0]/60 hover:text-[#EDE9E0]">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h1 className="text-[15px] sm:text-[17px] font-bold text-[#EDE9E0]">Collaborative Canvas</h1>
          <span className="hidden sm:inline-flex px-2.5 py-[2px] text-[10px] font-bold tracking-wider text-white bg-[#1E5F74] rounded-full uppercase">
            Meeting Mode
          </span>
        </div>

        <nav className="hidden sm:flex items-center gap-1">
          {['Canvas', 'Timeline', 'History'].map((tab, i) => (
            <a key={tab} href="#" className={`px-3 py-1 text-[13px] font-medium ${i === 0 ? 'text-[#D4420A] border-b-2 border-[#D4420A]' : 'text-[#EDE9E0]/50 hover:text-[#EDE9E0]/80'}`}>
              {tab}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button className="hidden sm:flex px-3 py-1.5 border border-[#EDE9E0]/20 text-[#EDE9E0] text-[12px] font-semibold rounded-md items-center gap-1 hover:bg-white/5">
            Present
          </button>
          <button className="px-3 py-1.5 bg-[#D4420A] text-white text-[12px] font-semibold rounded-md hover:bg-[#B33508] flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">share</span>
            <span className="hidden sm:inline">Share</span>
          </button>
          <button className="text-[#EDE9E0]/50 hover:text-[#EDE9E0] p-1"><span className="material-symbols-outlined text-[20px]">settings</span></button>
          <button className="text-[#EDE9E0]/50 hover:text-[#EDE9E0] p-1"><span className="material-symbols-outlined text-[20px]">help</span></button>
          <button onClick={() => { setShowAgenda(!showAgenda) }} className="lg:hidden text-[#EDE9E0]/50 hover:text-[#EDE9E0] p-1">
            <span className="material-symbols-outlined text-[20px]">left_panel_open</span>
          </button>
          <button onClick={() => setShowChat(!showChat)} className="lg:hidden text-[#EDE9E0]/50 hover:text-[#EDE9E0] p-1">
            <span className="material-symbols-outlined text-[20px]">right_panel_open</span>
          </button>
        </div>
      </header>

      {/* ━━ Presenter Banner ━━ */}
      <div className="h-[40px] bg-[#18170F] px-4 sm:px-6 flex items-center gap-3 shrink-0">
        <span className="material-symbols-outlined text-[#EDE9E0] text-[18px]">videocam</span>
        <span className="text-[#EDE9E0] text-[13px] font-medium uppercase tracking-wide">
          Marcus Thorne is presenting.
        </span>
        <button className="px-3 py-1 border border-[#EDE9E0]/20 text-[#EDE9E0] text-[11px] font-semibold rounded-md uppercase tracking-wider hover:bg-white/5">
          Request Control
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ━━ Left Sidebar — Agenda ━━ */}
        <AnimatePresence>
          {showAgenda && (
            <motion.aside
              initial={{ width: 0 }} animate={{ width: 'auto' }} exit={{ width: 0 }}
              className="w-[200px] sm:w-[220px] bg-[#FEFCF8] border-r border-[#18170F]/6 flex flex-col shrink-0 overflow-hidden"
            >
              <div className="p-4 pb-2">
                <h3 className="text-[11px] font-bold text-[#18170F]/40 uppercase tracking-wider">Live Agenda</h3>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
                {agendaItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-2 p-3 rounded-lg transition-colors ${
                      item.status === 'done' ? 'opacity-40' :
                      item.status === 'active' ? 'border-l-3 border-[#D4420A]' : ''
                    }`}
                    style={item.status === 'active' ? { borderLeft: '3px solid #D4420A' } : {}}
                  >
                    <span className="text-[12px] text-[#18170F]/30 font-mono mt-0.5">
                      {String(item.id).padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-medium ${item.status === 'active' ? 'text-[#D4420A]' : 'text-[#18170F]'}`}>
                        {item.label}
                      </p>
                      <p className={`text-[11px] mt-0.5 ${item.status === 'active' ? 'text-[#D4420A]' : 'text-[#A09890]'}`}>
                        {item.time}
                      </p>
                      {item.status === 'active' && (
                        <div className="w-full h-[3px] bg-[#D4420A]/15 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-[#D4420A] rounded-full" style={{ width: '43%' }} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-[#18170F]/6">
                <button className="w-full py-2.5 border border-[#18170F]/10 text-[#18170F]/60 text-[12px] font-semibold rounded-lg hover:bg-[#18170F]/3 transition-colors flex items-center justify-center gap-1.5 uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  Invite Member
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ━━ Main Canvas ━━ */}
        <main className="flex-1 relative overflow-hidden" style={{
          backgroundColor: '#F7F4EF',
          backgroundImage: 'radial-gradient(#d1d1d1 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}>
          {/* Canvas content mockup */}
          <div className="absolute inset-0 p-6 sm:p-10">
            {/* Design card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg w-[280px] sm:w-[340px] overflow-hidden"
            >
              <div className="p-5">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#18170F] leading-tight">The Curated<br />Artifact</h2>
                <p className="text-[#6A6558] text-sm mt-2">Exploration of visual tension and asymmetric grids for the new branding rollout.</p>
              </div>
              <div className="h-40 bg-gradient-to-br from-[#1E5F74]/10 via-[#D4420A]/5 to-[#2A7A4B]/10" />
            </motion.div>

            {/* Priority sticky */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="absolute top-[120px] right-[30%] bg-[#D4420A] text-white rounded-lg p-4 w-[200px] shadow-md transform rotate-1"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">Priority Focus</p>
              <p className="text-sm font-semibold">Implement GSAP Magnetic Easing</p>
            </motion.div>

            {/* Hand raise indicators */}
            <div className="absolute bottom-28 left-8 space-y-2">
              <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-[#18170F]/6">
                <div className="w-7 h-7 rounded-full bg-[#D4420A] flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[14px]">front_hand</span>
                </div>
                <span className="text-[12px] font-medium text-[#D4420A] uppercase tracking-wider">Raised Hand: Sarah</span>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-[#18170F]/6">
                <div className="w-7 h-7 rounded-full bg-[#18170F]/10" />
                <span className="text-[12px] font-medium text-[#18170F]/40 uppercase tracking-wider">Queue: David</span>
              </div>
            </div>
          </div>

          {/* Bottom Toolbar */}
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-[#2C2C28] rounded-2xl px-2 py-1.5 shadow-xl z-20">
            {[
              { icon: 'near_me', label: 'Select' },
              { icon: 'edit', label: 'Draw', active: true },
              { icon: 'sticky_note_2', label: 'Sticky' },
              { icon: 'category', label: 'Shape' },
              { icon: 'title', label: 'Text' },
            ].map((tool) => (
              <button key={tool.icon} className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors ${tool.active ? 'bg-[#D4420A] text-white' : 'text-[#EDE9E0]/60 hover:text-[#EDE9E0] hover:bg-white/10'}`}>
                <span className="material-symbols-outlined text-[20px]">{tool.icon}</span>
                <span className="text-[9px] font-medium">{tool.label}</span>
              </button>
            ))}
            <div className="w-px h-6 bg-[#EDE9E0]/10 mx-1" />
            <button className="p-2 rounded-xl text-[#EDE9E0]/60 hover:text-[#EDE9E0] hover:bg-white/10">
              <span className="material-symbols-outlined text-[20px]">undo</span>
            </button>
            <button className="p-2 rounded-xl text-[#EDE9E0]/60 hover:text-[#EDE9E0] hover:bg-white/10">
              <span className="material-symbols-outlined text-[20px]">redo</span>
            </button>
            <div className="w-px h-6 bg-[#EDE9E0]/10 mx-1" />
            <button className="p-2 rounded-xl bg-[#D4420A] text-white">
              <span className="material-symbols-outlined text-[20px]">present_to_all</span>
            </button>
          </div>
        </main>

        {/* ━━ Right Sidebar — Chat ━━ */}
        <AnimatePresence>
          {showChat && (
            <motion.aside
              initial={{ width: 0 }} animate={{ width: 'auto' }} exit={{ width: 0 }}
              className="w-[280px] sm:w-[300px] bg-[#FEFCF8] border-l border-[#18170F]/6 flex flex-col shrink-0 overflow-hidden"
            >
              <div className="p-4 border-b border-[#18170F]/6 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-[#18170F]">Live Chat</h3>
                  <p className="text-[11px] text-[#D4420A]">4 Active Participants</p>
                </div>
                <button className="text-[#18170F]/30 hover:text-[#18170F]">
                  <span className="material-symbols-outlined text-[18px]">expand_more</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold text-[#18170F]">{msg.user}</span>
                      <span className="text-[11px] text-[#A09890]">{msg.time}</span>
                    </div>
                    <p className="text-[13px] text-[#18170F]/70 bg-[#18170F]/[0.03] p-3 rounded-lg leading-relaxed">
                      {msg.text}
                    </p>
                  </div>
                ))}

                {/* Hand raise notification */}
                <div className="bg-[#D4420A]/8 rounded-lg p-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#D4420A] text-[18px]">front_hand</span>
                  <span className="text-[12px] text-[#D4420A] font-semibold uppercase tracking-wider">Sarah Lane raised her hand</span>
                </div>
              </div>

              <div className="p-4 border-t border-[#18170F]/6">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 bg-[#18170F]/[0.03] rounded-lg text-sm text-[#18170F] placeholder:text-[#18170F]/25 outline-none border border-[#18170F]/6"
                  />
                  <button className="p-2 text-[#D4420A]">
                    <span className="material-symbols-outlined text-[20px]">send</span>
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button className="p-1 text-[#18170F]/25 hover:text-[#18170F]/50">
                    <span className="material-symbols-outlined text-[16px]">attachment</span>
                  </button>
                  <button className="p-1 text-[#18170F]/25 hover:text-[#18170F]/50">
                    <span className="material-symbols-outlined text-[16px]">mood</span>
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default MeetingRoom
