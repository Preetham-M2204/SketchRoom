import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useCanvas from '../../hooks/useCanvas'
import useCanvasStore from '../../stores/useCanvasStore'

/**
 * OpenCanvas Component
 * Matches Stitch design: slim top bar, bottom toolbar pill with tools + colors,
 * thin right icon strip, zoom/pan controls in bottom-left — fully responsive
 */

const TOOLS = [
  { id: 'select', icon: 'near_me', label: 'Select' },
  { id: 'pen', icon: 'edit', label: 'Draw' },
  { id: 'sticky', icon: 'sticky_note_2', label: 'Sticky' },
  { id: 'shape', icon: 'category', label: 'Shape' },
  { id: 'text', icon: 'title', label: 'Text' },
  { id: 'image', icon: 'image', label: 'Image' },
]

const COLORS = [
  { id: 'vermillion', hex: '#D4420A' },
  { id: 'teal', hex: '#1E5F74' },
  { id: 'dark', hex: '#18170F' },
]

const OpenCanvas = ({ socket, roomId, userId, room }) => {
  const navigate = useNavigate()
  const { canvasRef, isDrawing } = useCanvas(socket, userId)
  const activeTool = useCanvasStore((state) => state.activeTool)
  const color = useCanvasStore((state) => state.color)
  const strokeWidth = useCanvasStore((state) => state.strokeWidth)
  const setTool = useCanvasStore((state) => state.setTool)
  const setColor = useCanvasStore((state) => state.setColor)
  const setStrokeWidth = useCanvasStore((state) => state.setStrokeWidth)

  const [zoom, setZoom] = useState(84)
  const [rightTab, setRightTab] = useState('chat')

  return (
    <div className="h-screen w-screen flex flex-col bg-[#fdf9f1] font-body overflow-hidden">
      {/* ━━ Slim Header ━━ */}
      <header className="h-[44px] bg-[#2C2C28] px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/dashboard')} className="text-[#EDE9E0]/60 hover:text-[#EDE9E0] shrink-0">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h1 className="text-[15px] font-bold text-[#EDE9E0] truncate">Collaborative Canvas</h1>
          <span className="hidden sm:inline text-[13px] text-[#EDE9E0]/40 truncate">Project Alpha / Untitled Room</span>
          <span className="hidden sm:inline px-2 py-0.5 text-[10px] font-medium text-[#EDE9E0]/40 bg-[#EDE9E0]/8 rounded">Neutral</span>
        </div>

        <nav className="hidden sm:flex items-center gap-1">
          {['Canvas', 'Timeline', 'History'].map((tab, i) => (
            <a key={tab} href="#" className={`px-3 py-1 text-[13px] font-medium ${i === 0 ? 'text-[#D4420A]' : 'text-[#EDE9E0]/40'}`}>
              {tab}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button className="hidden sm:inline-flex px-3 py-1.5 border border-[#EDE9E0]/15 text-[#EDE9E0] text-[12px] font-medium rounded-md hover:bg-white/5">Present</button>
          <button className="px-3 py-1.5 bg-[#D4420A] text-white text-[12px] font-semibold rounded-md hover:bg-[#B33508]">
            <span className="hidden sm:inline">Share</span>
            <span className="sm:hidden material-symbols-outlined text-[16px]">share</span>
          </button>
          <button className="text-[#EDE9E0]/40 p-1"><span className="material-symbols-outlined text-[18px]">help</span></button>
          <button className="text-[#EDE9E0]/40 p-1"><span className="material-symbols-outlined text-[18px]">settings</span></button>
          {/* User avatar */}
          <div className="w-7 h-7 rounded-full bg-[#1E5F74] border-2 border-[#2C2C28] flex items-center justify-center text-[10px] font-bold text-white">
            SL
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ━━ Main Canvas ━━ */}
        <main className="flex-1 relative overflow-hidden" style={{
          backgroundColor: '#F7F4EF',
          backgroundImage: 'radial-gradient(#D1CDC7 0.8px, transparent 0.8px)',
          backgroundSize: '32px 32px',
        }}>
          {/* Canvas content mockup */}
          <div className="absolute inset-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-[15%] left-[10%]"
            >
              <div className="bg-[#D4420A]/8 border border-[#D4420A]/20 rounded-xl w-[260px] sm:w-[360px] h-[160px] sm:h-[220px] flex items-center justify-center">
                <span className="text-[#D4420A]/20 font-mono text-lg italic">CONCEPT_V1</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="absolute top-[55%] left-[35%] sm:left-[45%] bg-white rounded-xl p-5 shadow-md border border-[#18170F]/6 max-w-[250px]"
            >
              <p className="text-[13px] text-[#18170F]/60 italic leading-relaxed">
                "The goal is to move away from boxed-in design. Elements should feel like they are floating on a canvas."
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="absolute top-[25%] right-[15%] bg-[#1E5F74]/8 border border-[#1E5F74]/15 rounded-xl w-[160px] h-[120px] flex items-center justify-center"
            >
              <span className="text-[#1E5F74]/40 text-[12px] font-bold uppercase tracking-widest">Interaction Zone</span>
            </motion.div>

            {/* Active user label */}
            <div className="absolute top-4 right-16 sm:right-20">
              <div className="bg-[#1E5F74] text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-sm">
                Sarah L.
              </div>
              <div className="w-8 h-8 rounded-full bg-[#1E5F74] border-2 border-white mx-auto mt-1 flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
                SL
              </div>
            </div>
          </div>

          {/* Zoom controls (bottom-left) */}
          <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 flex items-center gap-2 z-20">
            <div className="flex items-center gap-1 bg-white rounded-lg px-2 py-1.5 shadow-sm border border-[#18170F]/6">
              <button onClick={() => setZoom(Math.max(zoom - 10, 25))} className="p-1 text-[#18170F]/40 hover:text-[#18170F]">
                <span className="material-symbols-outlined text-[18px]">remove</span>
              </button>
              <span className="text-[12px] font-medium text-[#18170F] min-w-[36px] text-center font-mono">{zoom}%</span>
              <button onClick={() => setZoom(Math.min(zoom + 10, 200))} className="p-1 text-[#18170F]/40 hover:text-[#18170F]">
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
            <div className="flex items-center gap-1 bg-white rounded-lg px-3 py-1.5 shadow-sm border border-[#18170F]/6">
              <span className="material-symbols-outlined text-[18px] text-[#18170F]/40">pan_tool</span>
              <span className="text-[11px] font-semibold text-[#18170F]/60 uppercase tracking-wider">Pan</span>
            </div>
          </div>

          {/* Bottom Toolbar Pill */}
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20">
            <div className="flex items-center gap-0.5 bg-[#3D3D38] rounded-2xl px-2 py-1.5 shadow-xl">
              {/* Undo/Redo */}
              <button className="p-2 rounded-xl text-[#EDE9E0]/50 hover:text-[#EDE9E0] hover:bg-white/10">
                <span className="material-symbols-outlined text-[20px]">undo</span>
              </button>
              <button className="p-2 rounded-xl text-[#EDE9E0]/50 hover:text-[#EDE9E0] hover:bg-white/10">
                <span className="material-symbols-outlined text-[20px]">redo</span>
              </button>
              <div className="w-px h-6 bg-[#EDE9E0]/10 mx-1" />

              {/* Tools */}
              {TOOLS.map((tool) => {
                const isActive = activeTool === tool.id
                return (
                  <button
                    key={tool.id}
                    onClick={() => setTool(tool.id)}
                    className={`p-2.5 rounded-xl transition-colors ${
                      isActive ? 'bg-[#D4420A] text-white' : 'text-[#EDE9E0]/50 hover:text-[#EDE9E0] hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{tool.icon}</span>
                  </button>
                )
              })}

              <div className="w-px h-6 bg-[#EDE9E0]/10 mx-1" />

              {/* Color swatches */}
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.hex)}
                  className={`w-6 h-6 rounded-full transition-transform hover:scale-110 mx-0.5 ${
                    color === c.hex ? 'ring-2 ring-white ring-offset-2 ring-offset-[#3D3D38]' : ''
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}

              {/* Stroke size indicator */}
              <div className="flex items-center gap-1 ml-1">
                <span className="w-1 h-1 rounded-full bg-[#EDE9E0]/40" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4420A]" />
              </div>
            </div>
          </div>
        </main>

        {/* ━━ Right Icon Strip ━━ */}
        <aside className="hidden sm:flex w-12 bg-[#FEFCF8] border-l border-[#18170F]/6 flex-col items-center py-4 gap-2 shrink-0">
          {[
            { id: 'chat', icon: 'chat_bubble' },
            { id: 'participants', icon: 'group' },
            { id: 'agenda', icon: 'format_list_bulleted' },
            { id: 'layers', icon: 'layers' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRightTab(tab.id)}
              className={`p-2 rounded-lg transition-colors ${
                rightTab === tab.id ? 'text-[#D4420A] bg-[#D4420A]/5' : 'text-[#18170F]/25 hover:text-[#18170F]/60'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
            </button>
          ))}
        </aside>
      </div>
    </div>
  )
}

export default OpenCanvas
