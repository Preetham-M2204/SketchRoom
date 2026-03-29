import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useSocket from '../hooks/useSocket'
import useRoomStore from '../stores/useRoomStore'
import useModeStore from '../stores/useModeStore'
import useAuthStore from '../stores/useAuthStore'
import DecisionBoard from '../components/room/DecisionBoard'
import MeetingRoom from '../components/room/MeetingRoom'
import GdRound from '../components/room/GdRound'
import OpenCanvas from '../components/room/OpenCanvas'
import CollaborativeCursors from '../components/canvas/CollaborativeCursors'
import CustomCursor from '../components/ui/CustomCursor'
import { toast } from '../components/ui/Toast'
import { getRoom } from '../api/rooms'

/**
 * Room Page
 * Container for all room modes with collaborative cursors
 */

const Room = () => {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const user = useAuthStore((state) => state.user)
  const room = useRoomStore((state) => state.room)
  const setRoom = useRoomStore((state) => state.setRoom)
  const clearRoom = useRoomStore((state) => state.clearRoom)
  const resetAllModes = useModeStore((state) => state.resetAllModes)

  const socket = useSocket(roomId)

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        setLoading(true)
        const roomData = await getRoom(roomId)
        setRoom(roomData)
      } catch (err) {
        console.error('Failed to load room:', err)
        setError(err.message || 'Failed to load room')
        toast.error('Room not found or access denied')
        navigate('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchRoom()

    return () => {
      clearRoom()
      resetAllModes()
    }
  }, [roomId])

  if (loading) {
    return (
      <div className="h-screen bg-[#fdf9f1] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-[#D4420A] border-t-transparent rounded-full animate-spin" />
          <p className="text-[14px] text-[#6A6558]">Loading room...</p>
        </div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="h-screen bg-[#fdf9f1] flex items-center justify-center">
        <div className="text-center px-6">
          <h1 className="text-[24px] font-semibold text-[#18170F] mb-3">Room not found</h1>
          <p className="text-[14px] text-[#6A6558] mb-6">
            {error || 'The room you are looking for does not exist.'}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2.5 bg-[#D4420A] text-white text-sm font-semibold rounded-full hover:bg-[#B33508]"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const renderModeComponent = () => {
    switch (room.mode) {
      case 'decision':
        return <DecisionBoard socket={socket} roomId={roomId} userId={user?.id} room={room} />
      case 'meeting':
        return <MeetingRoom socket={socket} roomId={roomId} userId={user?.id} room={room} />
      case 'gd':
        return <GdRound socket={socket} roomId={roomId} userId={user?.id} room={room} />
      case 'canvas':
        return <OpenCanvas socket={socket} roomId={roomId} userId={user?.id} room={room} />
      default:
        return <OpenCanvas socket={socket} roomId={roomId} userId={user?.id} room={room} />
    }
  }

  return (
    <>
      {/* Figma-style collaborative cursors */}
      <CollaborativeCursors
        socket={socket}
        roomId={roomId}
        userId={user?.id}
        userName={user?.name}
      />
      {renderModeComponent()}
    </>
  )
}

export default Room
