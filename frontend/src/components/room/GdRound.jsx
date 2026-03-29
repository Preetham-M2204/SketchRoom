import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useGdRound from '../../hooks/useGdRound'

/**
 * GdRound Component
 * Matches Stitch design: 4 dashed speaker zones, circular timer ring,
 * right scoring panel, bottom speaker bar — fully responsive
 */

const ZONES = [
  { id: 'alpha', user: 'Marcus', color: '#D4420A' },
  { id: 'beta', user: 'Elena', color: '#1E5F74' },
  { id: 'gamma', user: 'Sarah', color: '#2A7A4B' },
  { id: 'delta', user: 'Ken', color: '#C0392B' },
]

const GdRound = ({ socket, roomId, userId, room }) => {
  const navigate = useNavigate()
  const {
    speakers,
    currentSpeaker,
    currentSpeakerIndex,
    scores,
    isActive,
    summary,
    isModerator,
    startRound,
    nextSpeaker,
    endRound,
  } = useGdRound(socket, roomId, userId)

  const [timerSeconds] = useState(45)
  const [judgeNotes, setJudgeNotes] = useState('')

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Timer ring calculation
  const timerProgress = (45 - timerSeconds) / 45
  const circumference = 2 * Math.PI * 52
  const dashOffset = circumference * (1 - timerProgress)

  return (
    <div className="h-screen w-screen flex flex-col bg-[#fdf9f1] font-body overflow-hidden">
      {/* ━━ Header ━━ */}
      <header className="h-[48px] bg-[#2C2C28] px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-[#EDE9E0]/60 hover:text-[#EDE9E0]">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h1 className="text-[15px] sm:text-[17px] font-bold text-[#EDE9E0] uppercase tracking-wide">Collaborative Canvas</h1>
          <span className="hidden sm:inline-flex px-2.5 py-[2px] text-[10px] font-bold tracking-wider text-white bg-[#2A7A4B] rounded-full uppercase">
            GD Round Mode
          </span>
        </div>

        <nav className="hidden sm:flex items-center gap-1">
          {['Canvas', 'Timeline', 'History'].map((tab, i) => (
            <a key={tab} href="#" className={`px-3 py-1 text-[13px] font-medium ${i === 0 ? 'text-[#D4420A] border-b-2 border-[#D4420A]' : 'text-[#EDE9E0]/50'}`}>
              {tab}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button className="text-[#EDE9E0]/50 hover:text-[#EDE9E0] p-1"><span className="material-symbols-outlined text-[20px]">help</span></button>
          <button className="text-[#EDE9E0]/50 hover:text-[#EDE9E0] p-1"><span className="material-symbols-outlined text-[20px]">settings</span></button>
          <button className="px-3 py-1.5 bg-[#D4420A] text-white text-[12px] font-semibold rounded-md hover:bg-[#B33508] flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">share</span>
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ━━ Main Canvas — Speaker Zones ━━ */}
        <main className="flex-1 relative overflow-hidden" style={{
          backgroundColor: '#F7F4EF',
          backgroundImage: 'radial-gradient(#D1CDC7 0.8px, transparent 0.8px)',
          backgroundSize: '32px 32px',
        }}>
          {/* Left controls */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
            <button className="w-10 h-10 bg-white rounded-lg shadow-sm border border-[#18170F]/8 flex items-center justify-center text-[#18170F]/40 hover:text-[#18170F]">
              <span className="material-symbols-outlined text-[20px]">zoom_in</span>
            </button>
            <button className="w-10 h-10 bg-white rounded-lg shadow-sm border border-[#18170F]/8 flex items-center justify-center text-[#18170F]/40 hover:text-[#18170F]">
              <span className="material-symbols-outlined text-[20px]">zoom_out</span>
            </button>
            <button className="w-10 h-10 bg-white rounded-lg shadow-sm border border-[#18170F]/8 flex items-center justify-center text-[#18170F]/40 hover:text-[#18170F]">
              <span className="material-symbols-outlined text-[20px]">layers</span>
            </button>
          </div>

          {/* 4 Speaker Zones */}
          <div className="absolute inset-4 sm:inset-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {ZONES.map((zone, index) => (
              <div
                key={zone.id}
                className="relative rounded-xl p-4 sm:p-6 flex flex-col"
                style={{
                  border: `2px dashed ${zone.color}30`,
                  backgroundColor: index === 0 ? `${zone.color}03` : 'transparent',
                }}
              >
                {/* Zone label */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: zone.color }}
                  >
                    Zone {zone.id} / {zone.user}
                  </span>
                  {index === 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2A7A4B] animate-pulse" />
                  )}
                </div>

                {/* Zone content */}
                <div className="flex-1 rounded-lg overflow-hidden">
                  {index === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3">
                      <div className="w-full max-w-[200px] h-[100px] sm:h-[140px] bg-white rounded-lg shadow-sm border border-[#18170F]/6 flex items-center justify-center transform -rotate-2">
                        <div className="w-3/4 h-3/4 bg-gradient-to-br from-[#18170F]/5 to-[#D4420A]/5 rounded flex items-center justify-center">
                          <span className="text-[#18170F]/20 text-[11px] font-mono">Revenue Chart</span>
                        </div>
                      </div>
                      <p className="text-[12px] text-[#18170F]/50 text-center">Market share projections for 2025 roadmap.</p>
                    </div>
                  ) : index === 3 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="bg-[#D4420A] text-white px-4 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wider transform rotate-2 shadow-md">
                        Revenue Goals: +24% YoY
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-[#18170F]/15 text-[13px] italic">Waiting for input...</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Circular Timer (center) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] bg-white rounded-full shadow-xl flex items-center justify-center">
              <svg className="absolute inset-0" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#18170F08" strokeWidth="4" />
                <circle
                  cx="60" cy="60" r="52"
                  fill="none" stroke="#D4420A" strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 60 60)"
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="text-[24px] sm:text-[28px] font-bold text-[#18170F] font-mono relative z-10">
                {timerSeconds}s
              </span>
            </div>
          </div>

          {/* Bottom Toolbar */}
          <div className="absolute bottom-14 sm:bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-[#2C2C28] rounded-2xl px-2 py-1.5 shadow-xl z-20">
            {[
              { icon: 'edit', label: 'Draw', active: true },
              { icon: 'near_me', label: 'Select' },
              { icon: 'sticky_note_2', label: 'Sticky' },
              { icon: 'category', label: 'Shape' },
              { icon: 'title', label: 'Text' },
            ].map((tool) => (
              <button key={tool.icon} className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl ${tool.active ? 'bg-[#D4420A] text-white' : 'text-[#EDE9E0]/60 hover:text-[#EDE9E0] hover:bg-white/10'}`}>
                <span className="material-symbols-outlined text-[20px]">{tool.icon}</span>
                <span className="text-[9px] font-medium">{tool.label}</span>
              </button>
            ))}
          </div>
        </main>

        {/* ━━ Right Sidebar — Live Assessment ━━ */}
        <aside className="hidden lg:flex w-[280px] sm:w-[300px] bg-[#FEFCF8] border-l border-[#18170F]/6 flex-col shrink-0">
          <div className="p-5 border-b border-[#18170F]/6">
            <p className="text-[11px] font-bold text-[#18170F]/40 uppercase tracking-wider">Live Assessment</p>
            <h3 className="text-[22px] font-bold text-[#18170F] mt-1">Scoring</h3>
          </div>

          <div className="p-5 space-y-6 flex-1">
            {/* Clarity score */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[13px] font-semibold text-[#18170F] uppercase tracking-wide">Clarity</span>
                <span className="text-[20px] font-bold text-[#D4420A]">8.4</span>
              </div>
              <div className="relative h-[3px] bg-[#18170F]/6 rounded-full">
                <div className="absolute h-full bg-[#D4420A] rounded-full" style={{ width: '84%' }} />
                <div
                  className="absolute w-3 h-3 bg-[#D4420A] rounded-full -top-[4.5px] shadow-sm"
                  style={{ left: 'calc(84% - 6px)' }}
                />
              </div>
            </div>

            {/* Relevance score */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[13px] font-semibold text-[#18170F] uppercase tracking-wide">Relevance</span>
                <span className="text-[20px] font-bold text-[#D4420A]">7.2</span>
              </div>
              <div className="relative h-[3px] bg-[#18170F]/6 rounded-full">
                <div className="absolute h-full bg-[#D4420A] rounded-full" style={{ width: '72%' }} />
                <div
                  className="absolute w-3 h-3 bg-[#D4420A] rounded-full -top-[4.5px] shadow-sm"
                  style={{ left: 'calc(72% - 6px)' }}
                />
              </div>
            </div>

            {/* Judge Notes */}
            <div>
              <label className="text-[11px] font-bold text-[#18170F]/40 uppercase tracking-wider block mb-2">
                Judge Notes
              </label>
              <textarea
                value={judgeNotes}
                onChange={(e) => setJudgeNotes(e.target.value)}
                placeholder="Type observation..."
                className="w-full bg-[#18170F]/[0.02] rounded-lg p-3 text-sm text-[#18170F] placeholder:text-[#18170F]/20 outline-none border border-[#18170F]/6 focus:border-[#D4420A]/30 resize-none"
                rows={4}
              />
            </div>
          </div>

          {/* Invite button */}
          <div className="p-5 border-t border-[#18170F]/6">
            <button className="w-full py-2.5 bg-[#D4420A] text-white text-[12px] font-semibold rounded-lg hover:bg-[#B33508] transition-colors uppercase tracking-wider">
              Invite Member
            </button>
          </div>
        </aside>
      </div>

      {/* ━━ Bottom Speaker Bar ━━ */}
      <footer className="h-[44px] bg-[#2C2C28] px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-[#EDE9E0]/40 uppercase tracking-wider hidden sm:inline">Queue Order</span>
          <div className="flex -space-x-2">
            {ZONES.slice(0, 3).map((zone, i) => (
              <div
                key={zone.id}
                className="w-7 h-7 rounded-full border-2 border-[#2C2C28] flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: zone.color }}
              >
                {zone.user.charAt(0)}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D4420A] animate-pulse" />
            <span className="text-[12px] font-semibold text-[#EDE9E0] uppercase tracking-wider">
              <span className="hidden sm:inline">Live: </span>Marcus is speaking
            </span>
          </div>
          <button className="px-4 py-1.5 border border-[#EDE9E0]/20 text-[#EDE9E0] text-[11px] font-semibold rounded-md uppercase tracking-wider hover:bg-white/5">
            Next Speaker
          </button>
        </div>
      </footer>
    </div>
  )
}

export default GdRound
