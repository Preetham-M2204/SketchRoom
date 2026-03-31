import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  buildRoomShareLink,
  clearCanvasState,
  copyTextToClipboard,
  getCanvasState,
  isLocalShareOrigin,
  updateCanvasMeta,
} from '../../api/rooms'
import useCanvas from '../../hooks/useCanvas'
import useCanvasStore from '../../stores/useCanvasStore'
import useRoomStore from '../../stores/useRoomStore'
import { toast } from '../ui/Toast'
import JoinRequestsMenu from '../layout/JoinRequestsMenu'

const TOOLS = [
  { id: 'select', icon: 'near_me', label: 'Select' },
  { id: 'pen', icon: 'edit', label: 'Draw' },
  { id: 'eraser', icon: 'ink_eraser', label: 'Erase' },
  { id: 'line', icon: 'show_chart', label: 'Line' },
  { id: 'rectangle', icon: 'rectangle', label: 'Rectangle' },
  { id: 'circle', icon: 'circle', label: 'Circle' },
]

const COLORS = [
  '#18170F', '#2F4858', '#1E5F74', '#2A7A4B', '#3E7C17', '#6B8E23',
  '#D4420A', '#C0392B', '#E74C3C', '#FF6B35', '#C4871A', '#F39C12',
  '#E67E22', '#7B4EA6', '#8E44AD', '#6C5CE7', '#2980B9', '#3498DB',
  '#16A085', '#1ABC9C', '#7F8C8D', '#34495E', '#000000', '#FFFFFF',
]

const STROKE_WIDTHS = [2, 4, 6]
const MIN_ZOOM = 0.25
const MAX_ZOOM = 3

function clampZoom(zoom) {
  return Math.min(Math.max(Number(zoom) || 1, MIN_ZOOM), MAX_ZOOM)
}

function normalizeViewport(viewport = {}) {
  return {
    x: Number.isFinite(viewport?.x) ? viewport.x : 0,
    y: Number.isFinite(viewport?.y) ? viewport.y : 0,
    zoom: clampZoom(viewport?.zoom),
  }
}

function getTouchDistance(firstTouch, secondTouch) {
  return Math.hypot(secondTouch.x - firstTouch.x, secondTouch.y - firstTouch.y)
}

const OpenCanvas = ({ socket, roomId, userId, room, requestsMenu = null }) => {
  const navigate = useNavigate()
  const [viewport, setViewport] = useState(() => ({ x: 0, y: 0, zoom: 1 }))
  const { canvasRef, isDrawing } = useCanvas(socket, userId, viewport)

  const activeTool = useCanvasStore((state) => state.activeTool)
  const color = useCanvasStore((state) => state.color)
  const strokeWidth = useCanvasStore((state) => state.strokeWidth)
  const setTool = useCanvasStore((state) => state.setTool)
  const setColor = useCanvasStore((state) => state.setColor)
  const setStrokeWidth = useCanvasStore((state) => state.setStrokeWidth)

  const strokes = useRoomStore((state) => state.strokes)
  const setStrokes = useRoomStore((state) => state.setStrokes)
  const removeStroke = useRoomStore((state) => state.removeStroke)
  const clearStrokes = useRoomStore((state) => state.clearStrokes)

  const [boardTitle, setBoardTitle] = useState(room?.name || 'Untitled Room')
  const [isLoadingState, setIsLoadingState] = useState(true)
  const [isSavingMeta, setIsSavingMeta] = useState(false)
  const [customColor, setCustomColor] = useState(color)
  const viewportRef = useRef(viewport)
  const pinchStateRef = useRef({
    isActive: false,
    startDistance: 0,
    startZoom: 1,
    hasChanged: false,
  })

  const zoomPercent = Math.round(viewport.zoom * 100)

  const isHost = room?.owner?.id === userId

  useEffect(() => {
    viewportRef.current = viewport
  }, [viewport])

  useEffect(() => {
    setCustomColor(color)
  }, [color])

  useEffect(() => {
    let cancelled = false

    const loadCanvas = async () => {
      if (!roomId) return

      setIsLoadingState(true)
      try {
        const canvasState = await getCanvasState(roomId)
        if (cancelled) return

        setStrokes(Array.isArray(canvasState?.strokes) ? canvasState.strokes : [])
        setBoardTitle(canvasState?.boardTitle || room?.name || 'Untitled Room')
        setViewport(normalizeViewport(canvasState?.viewport || {}))
      } catch (error) {
        if (!cancelled) {
          toast.error(error.message || 'Failed to load canvas state')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingState(false)
        }
      }
    }

    loadCanvas()

    return () => {
      cancelled = true
    }
  }, [roomId, room?.name, setStrokes])

  const saveCanvasMeta = async (payload) => {
    if (!roomId) return

    try {
      setIsSavingMeta(true)
      await updateCanvasMeta(roomId, payload)
    } catch (error) {
      toast.warning(error.message || 'Unable to save canvas settings right now')
    } finally {
      setIsSavingMeta(false)
    }
  }

  const persistViewport = async (nextViewport) => {
    const safeViewport = normalizeViewport(nextViewport)

    await saveCanvasMeta({
      viewport: {
        x: Number(safeViewport.x.toFixed(2)),
        y: Number(safeViewport.y.toFixed(2)),
        zoom: Number(safeViewport.zoom.toFixed(2)),
      },
    })
  }

  const applyZoomAtPoint = (nextZoom, anchorPoint = null) => {
    const safeZoom = clampZoom(nextZoom)
    const currentViewport = viewportRef.current

    const canvasRect = canvasRef.current?.getBoundingClientRect()
    const fallbackAnchor = canvasRect
      ? { x: canvasRect.width / 2, y: canvasRect.height / 2 }
      : { x: 0, y: 0 }
    const anchor = anchorPoint || fallbackAnchor

    const worldX = (anchor.x - currentViewport.x) / currentViewport.zoom
    const worldY = (anchor.y - currentViewport.y) / currentViewport.zoom

    const nextViewport = {
      x: anchor.x - worldX * safeZoom,
      y: anchor.y - worldY * safeZoom,
      zoom: safeZoom,
    }

    setViewport(nextViewport)
    return nextViewport
  }

  const handleZoomChange = async (delta) => {
    const nextViewport = applyZoomAtPoint(viewportRef.current.zoom + delta / 100)
    await persistViewport(nextViewport)
  }

  const handleBoardTitleBlur = async () => {
    const trimmed = boardTitle.trim() || 'Untitled Room'
    if (trimmed !== boardTitle) {
      setBoardTitle(trimmed)
    }

    await saveCanvasMeta({ boardTitle: trimmed })
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const toCanvasPoint = (touch) => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      }
    }

    const handleTouchStart = (event) => {
      if (event.touches.length !== 2) return

      const first = toCanvasPoint(event.touches[0])
      const second = toCanvasPoint(event.touches[1])

      pinchStateRef.current = {
        isActive: true,
        startDistance: getTouchDistance(first, second),
        startZoom: viewportRef.current.zoom,
        hasChanged: false,
      }
    }

    const handleTouchMove = (event) => {
      if (!pinchStateRef.current.isActive || event.touches.length !== 2) return

      event.preventDefault()

      const first = toCanvasPoint(event.touches[0])
      const second = toCanvasPoint(event.touches[1])
      const distance = getTouchDistance(first, second)
      const startDistance = pinchStateRef.current.startDistance || distance

      if (!Number.isFinite(distance) || distance <= 0 || !Number.isFinite(startDistance) || startDistance <= 0) {
        return
      }

      const scale = distance / startDistance
      const nextZoom = clampZoom(pinchStateRef.current.startZoom * scale)
      const center = {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      }

      applyZoomAtPoint(nextZoom, center)
      pinchStateRef.current.hasChanged = true
    }

    const handleTouchEnd = async (event) => {
      if (!pinchStateRef.current.isActive) return
      if (event.touches.length >= 2) return

      const didChange = pinchStateRef.current.hasChanged
      pinchStateRef.current.isActive = false
      pinchStateRef.current.hasChanged = false

      if (didChange) {
        await persistViewport(viewportRef.current)
      }
    }

    canvas.addEventListener('touchstart', handleTouchStart, { passive: true })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true })
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
      canvas.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [canvasRef, roomId])

  const handleUndo = () => {
    if (!strokes.length) return

    const lastStroke = strokes[strokes.length - 1]
    removeStroke(lastStroke.id)

    if (socket) {
      socket.emit('draw:undo-stroke', { roomId, strokeId: lastStroke.id })
    }
  }

  const handleClear = async () => {
    if (!strokes.length) return

    const shouldClear = window.confirm('Clear this canvas? This removes all current strokes.')
    if (!shouldClear) return

    try {
      await clearCanvasState(roomId)
      clearStrokes()
      toast.success('Canvas cleared')
    } catch (error) {
      toast.error(error.message || 'Failed to clear canvas')
    }
  }

  const handleShare = async () => {
    if (!isHost) {
      toast.warning('Only the host can invite guests to this room')
      return
    }

    const roomUrl = buildRoomShareLink(room)
    if (!roomUrl) {
      toast.error('Share link is unavailable for this room')
      return
    }

    const roomCode = room?.publicId || room?.inviteCode || room?.id
    const localOriginTip = isLocalShareOrigin() && !import.meta.env.VITE_SHARE_BASE_URL
      ? '\nTip: Set VITE_SHARE_BASE_URL to your LAN URL for cross-device same-network access.'
      : ''

    const shareText = `Join my SketchRoom session\nRoom: ${roomUrl}${roomCode ? `\nRoom code: ${roomCode}` : ''}\nAdmins need to approve join requests.${localOriginTip}`

    const copied = await copyTextToClipboard(shareText)
    if (copied) {
      toast.success('Invite code copied to clipboard')
      return
    }

    toast.error('Could not copy invite code')
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F7F4EF] font-body overflow-hidden">
      <header className="min-h-[52px] bg-[#2C2C28] px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-[#EDE9E0]/65 hover:text-[#EDE9E0] shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <span className="text-[14px] font-semibold text-[#EDE9E0] hidden sm:inline">Canvas Room</span>
          <input
            value={boardTitle}
            onChange={(event) => setBoardTitle(event.target.value)}
            onBlur={handleBoardTitleBlur}
            className="bg-transparent border-b border-[#EDE9E0]/20 text-[#EDE9E0] text-[14px] sm:text-[15px] font-medium px-1 py-0.5 min-w-0 w-[42vw] sm:w-auto sm:min-w-[260px] max-w-[360px] focus:border-[#D4420A]"
            placeholder="Untitled Room"
          />
          <span className="hidden sm:inline text-[11px] px-2 py-0.5 rounded bg-[#EDE9E0]/10 text-[#EDE9E0]/70 uppercase tracking-wider">
            {room?.mode || 'canvas'}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 text-[#EDE9E0]/70 w-full sm:w-auto">
          {requestsMenu ? <JoinRequestsMenu {...requestsMenu} /> : null}

          {isHost && room?.inviteCode ? (
            <span className="hidden sm:inline text-[11px] px-2 py-1 rounded bg-[#EDE9E0]/10 text-[#EDE9E0]/90 font-mono">
              {room.inviteCode}
            </span>
          ) : (
            <span className="hidden sm:inline text-[11px] px-2 py-1 rounded bg-[#EDE9E0]/10 text-[#EDE9E0]/75">
              Host-only invite
            </span>
          )}
          <span className="text-[11px] hidden sm:inline">
            {isSavingMeta ? 'Saving...' : 'Saved'}
          </span>
          <button
            onClick={handleShare}
            className={`px-3 py-1.5 text-white text-[12px] font-semibold rounded-md ${
              isHost ? 'bg-[#D4420A] hover:bg-[#B33508]' : 'bg-[#8B8178]'
            }`}
          >
            {isHost ? 'Share' : 'Invite Locked'}
          </button>
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundColor: '#F7F4EF',
            backgroundImage: 'radial-gradient(rgba(24,23,15,0.14) 0.8px, transparent 0.8px)',
            backgroundSize: '24px 24px',
          }}
        />

        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full touch-none ${
            ['pen', 'eraser', 'line', 'rectangle', 'circle'].includes(activeTool)
              ? 'cursor-crosshair'
              : 'cursor-default'
          }`}
          aria-label="Collaborative drawing canvas"
        />

        {isLoadingState && (
          <div className="absolute inset-0 z-20 bg-[#F7F4EF]/80 backdrop-blur-[1px] flex items-center justify-center">
            <div className="text-center">
              <div className="w-9 h-9 border-2 border-[#D4420A] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-[12px] text-[#18170F]/70 mt-2">Loading canvas state...</p>
            </div>
          </div>
        )}

        <div className="absolute top-4 left-4 z-20 px-3 py-2 rounded-lg bg-white/85 border border-[#18170F]/10 shadow-sm">
          <p className="text-[11px] font-semibold text-[#18170F]">{strokes.length} strokes</p>
          <p className="text-[10px] text-[#18170F]/60">{isDrawing ? 'Drawing...' : 'Ready'}</p>
        </div>

        <div className="absolute top-4 right-4 sm:top-auto sm:bottom-4 sm:left-6 sm:right-auto z-20 flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white rounded-lg px-2 py-1.5 shadow-sm border border-[#18170F]/10">
            <button
              onClick={() => handleZoomChange(-10)}
              className="p-1 text-[#18170F]/45 hover:text-[#18170F]"
            >
              <span className="material-symbols-outlined text-[18px]">remove</span>
            </button>
            <span className="text-[12px] font-medium text-[#18170F] min-w-[40px] text-center font-mono">
              {zoomPercent}%
            </span>
            <button
              onClick={() => handleZoomChange(10)}
              className="p-1 text-[#18170F]/45 hover:text-[#18170F]"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
          </div>
        </div>

        <div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-6 left-1/2 -translate-x-1/2 z-20 w-[calc(100vw-0.75rem)] sm:w-auto px-1">
          <div className="overflow-x-auto pb-[env(safe-area-inset-bottom)]">
            <div className="flex min-w-max items-center gap-1 bg-[#3D3D38]/95 backdrop-blur-md border border-white/10 rounded-2xl px-2 py-1.5 shadow-xl">
            <button
              onClick={handleUndo}
              disabled={!strokes.length}
              className="p-2 rounded-xl text-[#EDE9E0]/55 hover:text-[#EDE9E0] hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">undo</span>
            </button>
            <button
              onClick={handleClear}
              disabled={!strokes.length}
              className="p-2 rounded-xl text-[#EDE9E0]/55 hover:text-[#EDE9E0] hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">ink_eraser</span>
            </button>

            <div className="w-px h-6 bg-[#EDE9E0]/12 mx-1" />

            {TOOLS.map((tool) => {
              const isActive = activeTool === tool.id
              return (
                <button
                  key={tool.id}
                  onClick={() => setTool(tool.id)}
                  className={`p-2.5 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-[#D4420A] text-white'
                      : 'text-[#EDE9E0]/55 hover:text-[#EDE9E0] hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{tool.icon}</span>
                </button>
              )
            })}

            <div className="w-px h-6 bg-[#EDE9E0]/12 mx-1" />

            {COLORS.map((swatch) => (
              <button
                key={swatch}
                onClick={() => setColor(swatch)}
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-transform hover:scale-110 ${
                  color === swatch
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-[#3D3D38]'
                    : ''
                }`}
                style={{ backgroundColor: swatch }}
              />
            ))}

            <label className="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden border border-white/30 cursor-pointer relative">
              <input
                type="color"
                value={customColor}
                onChange={(event) => {
                  setCustomColor(event.target.value)
                  setColor(event.target.value)
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <span className="block w-full h-full" style={{ backgroundColor: customColor }} />
            </label>

            <div className="w-px h-6 bg-[#EDE9E0]/12 mx-1" />

            <div className="flex items-center gap-1">
              {STROKE_WIDTHS.map((size) => (
                <button
                  key={size}
                  onClick={() => setStrokeWidth(size)}
                  className={`w-6 h-6 rounded-full border border-transparent flex items-center justify-center ${
                    strokeWidth === size
                      ? 'bg-[#D4420A]/80 border-white/30'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <span
                    className="rounded-full bg-white"
                    style={{ width: size + 1, height: size + 1 }}
                  />
                </button>
              ))}
            </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default OpenCanvas
