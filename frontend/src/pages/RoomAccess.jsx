import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getRoomAccessStatusByKey, requestRoomAccessByKey } from '../api/rooms'
import { toast } from '../components/ui/Toast'

const ACCESS_STATUS_POLL_MS = 4000

const RoomAccess = () => {
  const { roomKey } = useParams()
  const navigate = useNavigate()

  const [status, setStatus] = useState('loading')
  const [roomPreview, setRoomPreview] = useState(null)
  const [message, setMessage] = useState('')
  const [isRequesting, setIsRequesting] = useState(false)

  const goToRoom = useCallback(
    (roomData) => {
      const targetKey = roomData?.publicId || roomKey
      navigate(`/room/${targetKey}`, { replace: true })
    },
    [navigate, roomKey]
  )

  const requestAccess = useCallback(async () => {
    if (!roomKey) {
      setStatus('not-found')
      return
    }

    try {
      setIsRequesting(true)
      setStatus('loading')

      const response = await requestRoomAccessByKey(roomKey)
      const nextStatus = response?.status || 'pending'

      setRoomPreview(response?.room || null)
      setMessage(response?.message || '')

      if (nextStatus === 'active') {
        goToRoom(response?.room)
        return
      }

      if (nextStatus === 'pending') {
        setStatus('pending')
        return
      }

      if (nextStatus === 'denied') {
        setStatus('denied')
        return
      }

      setStatus('pending')
    } catch (error) {
      const errorMessage = error?.message || 'Unable to request room access'

      if (errorMessage.toLowerCase().includes('not found')) {
        setStatus('not-found')
        setMessage(errorMessage)
        return
      }

      setStatus('error')
      setMessage(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsRequesting(false)
    }
  }, [goToRoom, roomKey])

  useEffect(() => {
    requestAccess()
  }, [requestAccess])

  useEffect(() => {
    if (status !== 'pending' || !roomKey) return

    const intervalId = setInterval(async () => {
      try {
        const access = await getRoomAccessStatusByKey(roomKey)
        const nextStatus = access?.status || 'pending'

        setRoomPreview(access?.room || roomPreview)
        setMessage(access?.message || message)

        if (nextStatus === 'active') {
          goToRoom(access?.room)
          return
        }

        if (nextStatus === 'denied') {
          setStatus('denied')
          return
        }
      } catch {
        // Keep waiting if polling temporarily fails.
      }
    }, ACCESS_STATUS_POLL_MS)

    return () => clearInterval(intervalId)
  }, [goToRoom, message, roomKey, roomPreview, status])

  const roomName = roomPreview?.name || 'Room'

  return (
    <div className="min-h-screen bg-[#F7F4EF] flex items-center justify-center p-6">
      <div className="w-full max-w-[560px] bg-white border border-[#18170F]/10 rounded-2xl shadow-sm p-6 sm:p-8 text-center">
        <h1 className="text-[24px] font-semibold text-[#18170F]">{roomName}</h1>

        {roomPreview?.mode ? (
          <p className="mt-1 text-[12px] uppercase tracking-wider text-[#18170F]/45">{roomPreview.mode} mode</p>
        ) : null}

        {status === 'loading' ? (
          <div className="mt-6">
            <div className="w-10 h-10 border-2 border-[#D4420A] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-3 text-[13px] text-[#18170F]/60">Requesting room access...</p>
          </div>
        ) : null}

        {status === 'pending' ? (
          <div className="mt-6">
            <p className="text-[14px] text-[#18170F] font-semibold">Waiting for admin approval</p>
            <p className="mt-2 text-[13px] text-[#18170F]/60">
              {message || 'Your request has been sent. Stay on this page while admins review it.'}
            </p>
            <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4420A]/10 text-[#D4420A] text-[12px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4420A] animate-pulse" />
              Checking status every 4 seconds
            </div>
          </div>
        ) : null}

        {status === 'denied' ? (
          <div className="mt-6">
            <p className="text-[14px] text-[#C0392B] font-semibold">Access request denied</p>
            <p className="mt-2 text-[13px] text-[#18170F]/60">
              {message || 'Room admins declined this request. You can ask the host to invite you again.'}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 rounded-lg bg-[#18170F]/8 text-[#18170F]/80 text-[13px] font-semibold hover:bg-[#18170F]/12"
              >
                Back to Dashboard
              </button>
              <button
                onClick={requestAccess}
                disabled={isRequesting}
                className="px-4 py-2 rounded-lg bg-[#D4420A] text-white text-[13px] font-semibold hover:bg-[#B33508] disabled:opacity-60"
              >
                Retry Request
              </button>
            </div>
          </div>
        ) : null}

        {status === 'not-found' || status === 'error' ? (
          <div className="mt-6">
            <p className="text-[14px] text-[#C0392B] font-semibold">
              {status === 'not-found' ? 'Room not found' : 'Unable to access room'}
            </p>
            <p className="mt-2 text-[13px] text-[#18170F]/60">
              {message || 'Check the link or ask the host to share a new one.'}
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 px-4 py-2 rounded-lg bg-[#18170F]/8 text-[#18170F]/80 text-[13px] font-semibold hover:bg-[#18170F]/12"
            >
              Back to Dashboard
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default RoomAccess
