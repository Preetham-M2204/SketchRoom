import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useSocket from '../hooks/useSocket'
import useRoomStore from '../stores/useRoomStore'
import useModeStore from '../stores/useModeStore'
import useCanvasStore from '../stores/useCanvasStore'
import useAuthStore from '../stores/useAuthStore'
import DecisionBoard from '../components/room/DecisionBoard'
import MeetingRoom from '../components/room/MeetingRoom'
import GdRound from '../components/room/GdRound'
import OpenCanvas from '../components/room/OpenCanvas'
import CollaborativeCursors from '../components/canvas/CollaborativeCursors'
import { toast } from '../components/ui/Toast'
import {
  approveRoomJoinRequest,
  getRoomByKey,
  getRoomJoinRequests,
  rejectRoomJoinRequest,
} from '../api/rooms'

/**
 * Room Page
 * Container for all room modes with collaborative cursors
 */

const Room = () => {
  const { roomKey } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [resolvedRoomId, setResolvedRoomId] = useState(null)
  const [joinRequests, setJoinRequests] = useState([])
  const [isRequestsOpen, setIsRequestsOpen] = useState(false)
  const [isRequestsLoading, setIsRequestsLoading] = useState(false)
  const [actingRequestUserId, setActingRequestUserId] = useState('')

  const user = useAuthStore((state) => state.user)
  const activeTool = useCanvasStore((state) => state.activeTool)
  const room = useRoomStore((state) => state.room)
  const setRoom = useRoomStore((state) => state.setRoom)
  const clearRoom = useRoomStore((state) => state.clearRoom)
  const resetAllModes = useModeStore((state) => state.resetAllModes)

  const socket = useSocket(resolvedRoomId)

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        setLoading(true)
        setError(null)

        const roomData = await getRoomByKey(roomKey)
        setResolvedRoomId(roomData.id)
        setRoom(roomData)
      } catch (err) {
        console.error('Failed to load room:', err)

        const message = err?.message || 'Failed to load room'
        const normalized = message.toLowerCase()

        if (
          normalized.includes('pending admin approval') ||
          normalized.includes('request access')
        ) {
          navigate(`/r/${roomKey}`, { replace: true })
          return
        }

        setError(message)
        toast.error('Room not found or access denied')
        navigate('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchRoom()

    return () => {
      setResolvedRoomId(null)
      clearRoom()
      resetAllModes()
    }
  }, [roomKey, navigate, setRoom, clearRoom, resetAllModes])

  const canModerate = Boolean(room?.permissions?.canModerate)

  const fetchJoinRequests = useCallback(async () => {
    if (!canModerate || !resolvedRoomId) {
      setJoinRequests([])
      return
    }

    try {
      setIsRequestsLoading(true)
      const pendingRequests = await getRoomJoinRequests(resolvedRoomId)
      setJoinRequests(pendingRequests)
    } catch (err) {
      console.error('Failed to fetch join requests', err)
    } finally {
      setIsRequestsLoading(false)
    }
  }, [canModerate, resolvedRoomId])

  useEffect(() => {
    if (!canModerate || !resolvedRoomId) return

    fetchJoinRequests()
    const intervalId = setInterval(fetchJoinRequests, 5000)

    return () => clearInterval(intervalId)
  }, [canModerate, resolvedRoomId, fetchJoinRequests])

  const handleApproveRequest = async (requestUserId) => {
    if (!resolvedRoomId || !requestUserId) return

    try {
      setActingRequestUserId(requestUserId)
      await approveRoomJoinRequest(resolvedRoomId, requestUserId)
      toast.success('Join request approved')
      await fetchJoinRequests()
    } catch (err) {
      toast.error(err?.message || 'Failed to approve request')
    } finally {
      setActingRequestUserId('')
    }
  }

  const handleRejectRequest = async (requestUserId) => {
    if (!resolvedRoomId || !requestUserId) return

    try {
      setActingRequestUserId(requestUserId)
      await rejectRoomJoinRequest(resolvedRoomId, requestUserId)
      toast.success('Join request rejected')
      await fetchJoinRequests()
    } catch (err) {
      toast.error(err?.message || 'Failed to reject request')
    } finally {
      setActingRequestUserId('')
    }
  }

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

  if (error || !room || !resolvedRoomId) {
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

  const cursorTool = room?.mode === 'canvas' ? activeTool : 'discussion'
  const cursorVariant = room?.mode === 'meeting' || room?.mode === 'gd' ? 'minimal' : 'figma'

  const requestsMenu = canModerate
    ? {
        joinRequests,
        isOpen: isRequestsOpen,
        isLoading: isRequestsLoading,
        actingUserId: actingRequestUserId,
        onToggle: () => setIsRequestsOpen((previous) => !previous),
        onApprove: handleApproveRequest,
        onReject: handleRejectRequest,
      }
    : null

  const renderModeComponent = () => {
    switch (room.mode) {
      case 'decision':
        return (
          <DecisionBoard
            socket={socket}
            roomId={resolvedRoomId}
            userId={user?.id}
            room={room}
            requestsMenu={requestsMenu}
          />
        )
      case 'meeting':
        return (
          <MeetingRoom
            socket={socket}
            roomId={resolvedRoomId}
            userId={user?.id}
            room={room}
            requestsMenu={requestsMenu}
          />
        )
      case 'gd':
        return (
          <GdRound
            socket={socket}
            roomId={resolvedRoomId}
            userId={user?.id}
            room={room}
            requestsMenu={requestsMenu}
          />
        )
      case 'canvas':
        return (
          <OpenCanvas
            socket={socket}
            roomId={resolvedRoomId}
            userId={user?.id}
            room={room}
            requestsMenu={requestsMenu}
          />
        )
      default:
        return (
          <OpenCanvas
            socket={socket}
            roomId={resolvedRoomId}
            userId={user?.id}
            room={room}
            requestsMenu={requestsMenu}
          />
        )
    }
  }

  return (
    <>
      {/* Collaborative cursors */}
      <CollaborativeCursors
        socket={socket}
        roomId={resolvedRoomId}
        userId={user?.id}
        userName={user?.name}
        activeTool={cursorTool}
        showLocalCursor={true}
        variant={cursorVariant}
      />

      {renderModeComponent()}
    </>
  )
}

export default Room
