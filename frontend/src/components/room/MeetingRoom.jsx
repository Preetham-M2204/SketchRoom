import { useEffect, useMemo, useRef, useState } from 'react'
import { nanoid } from 'nanoid'
import { useNavigate } from 'react-router-dom'
import { buildRoomShareLink, copyTextToClipboard, isLocalShareOrigin } from '../../api/rooms'
import useMeeting from '../../hooks/useMeeting'
import useRoomStore from '../../stores/useRoomStore'
import { toast } from '../ui/Toast'
import JoinRequestsMenu from '../layout/JoinRequestsMenu'

function formatMessageTime(timestamp) {
  if (!timestamp) return ''

  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function getMediaUnsupportedMessage(featureLabel) {
  const hostname = typeof window !== 'undefined' ? window.location?.hostname || '' : ''
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
  const isSecure = typeof window !== 'undefined' ? Boolean(window.isSecureContext) : false

  if (!isSecure && !isLocalhost) {
    return `${featureLabel} needs HTTPS or localhost. Open the app on https://... or http://localhost.`
  }

  return `${featureLabel} is unavailable in this browser/environment. Use latest Chrome, Edge, or Firefox.`
}

const MeetingRoom = ({ socket, roomId, userId, room, requestsMenu = null }) => {
  const navigate = useNavigate()
  const {
    presenter,
    agenda,
    handQueue,
    currentAgendaIndex,
    isPresenter,
    isViewportSynced,
    isLoading,
    isMutating,
    requestPresenter,
    raiseHand,
    lowerHand,
    updateAgenda,
    setAgendaIndex,
    nextAgendaItem,
    setViewportSync,
  } = useMeeting(socket, roomId, userId)

  const members = useRoomStore((state) => state.members)
  const messages = useRoomStore((state) => state.messages)

  const [agendaTitle, setAgendaTitle] = useState('')
  const [agendaDuration, setAgendaDuration] = useState(10)
  const [chatMessage, setChatMessage] = useState('')
  const [showDiscussion, setShowDiscussion] = useState(true)
  const [selectedPresenterId, setSelectedPresenterId] = useState('')
  const [isSharingScreen, setIsSharingScreen] = useState(false)
  const [screenSharingUser, setScreenSharingUser] = useState(null)
  const [remoteScreenFrame, setRemoteScreenFrame] = useState(null)
  const [isPinnedPresenterView, setIsPinnedPresenterView] = useState(false)

  const localShareVideoRef = useRef(null)
  const localShareStreamRef = useRef(null)
  const shareCaptureVideoRef = useRef(null)
  const shareCaptureCanvasRef = useRef(null)
  const shareFrameTimerRef = useRef(null)

  const normalizedUserId = String(userId || '')
  const isHost = String(room?.owner?.id || '') === normalizedUserId
  const viewerRole = room?.permissions?.viewerRole || (isHost ? 'owner' : 'member')
  const canModerate = viewerRole === 'owner' || viewerRole === 'moderator'
  const canManageAgenda = canModerate || isPresenter
  const canShareScreen = canManageAgenda
  const isInQueue = handQueue.includes(normalizedUserId)

  const participantList = useMemo(() => {
    const map = new Map()

    ;(room?.members || []).forEach((member) => {
      const id = String(member?.id || member?.userId || '')
      if (!id) return
      map.set(id, { id, name: member?.name || 'Member' })
    })

    ;(members || []).forEach((member) => {
      const id = String(member?.userId || member?.id || '')
      if (!id) return
      map.set(id, { id, name: member?.name || 'Member' })
    })

    if (userId && !map.has(String(userId))) {
      map.set(String(userId), { id: String(userId), name: 'You' })
    }

    return Array.from(map.values())
  }, [room?.members, members, userId])

  const presenterName = useMemo(() => {
    const activePresenter = participantList.find((member) => member.id === String(presenter || ''))
    if (!activePresenter) return 'No presenter selected'
    return activePresenter.name
  }, [participantList, presenter])

  useEffect(() => {
    const presenterId = String(presenter || '').trim()
    if (presenterId) {
      setSelectedPresenterId(presenterId)
      return
    }

    if (normalizedUserId) {
      setSelectedPresenterId(normalizedUserId)
    }
  }, [presenter, normalizedUserId, participantList])

  const currentUserName = useMemo(() => {
    const me = participantList.find((member) => member.id === normalizedUserId)
    return me?.name || 'You'
  }, [participantList, normalizedUserId])

  const activeAgendaItem = agenda[currentAgendaIndex] || null
  const hasScreenSharePreview = isSharingScreen || Boolean(remoteScreenFrame)
  const recentMessages = useMemo(() => (messages || []).slice(-40), [messages])

  const screenShareStatusText = useMemo(() => {
    if (!screenSharingUser) return null
    if (screenSharingUser.userId === normalizedUserId) return 'You are sharing screen'
    return `${screenSharingUser.userName} is sharing screen`
  }, [screenSharingUser, normalizedUserId])

  const presenterStageLabel = useMemo(() => {
    if (screenShareStatusText) return screenShareStatusText
    if (activeAgendaItem) return `Agenda focus: ${activeAgendaItem.title}`
    return 'No live presentation'
  }, [screenShareStatusText, activeAgendaItem])

  const headerSubtitle = useMemo(() => {
    if (screenShareStatusText) return screenShareStatusText
    if (activeAgendaItem) return 'Agenda-first discussion mode'
    return 'Google Meet style focus layout'
  }, [screenShareStatusText, activeAgendaItem])

  const renderPresenterMedia = (mediaClassName) => {
    if (isSharingScreen) {
      return (
        <video
          ref={localShareVideoRef}
          autoPlay
          muted
          playsInline
          className={mediaClassName}
        />
      )
    }

    if (remoteScreenFrame) {
      return (
        <img
          src={remoteScreenFrame}
          alt="Shared screen preview"
          className={mediaClassName}
        />
      )
    }

    if (activeAgendaItem) {
      return (
        <div className="h-full w-full flex items-center justify-center px-4 text-center bg-[radial-gradient(circle_at_center,#1E5F74_0%,#123844_85%)] text-white">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/65">Active Topic</p>
            <p className="mt-2 text-[20px] sm:text-[26px] font-semibold leading-snug">{activeAgendaItem.title}</p>
            <p className="mt-2 text-[12px] text-white/70">Duration: {activeAgendaItem.duration} min</p>
          </div>
        </div>
      )
    }

    return (
      <div className="h-full w-full flex items-center justify-center px-4 text-center bg-[#0E1013] text-white/70">
        <div>
          <p className="text-[14px] font-semibold text-white/85">No one is presenting</p>
          <p className="text-[12px] mt-1">Share your screen or focus an agenda topic.</p>
        </div>
      </div>
    )
  }

  const stopScreenShare = (emitState = true) => {
    if (shareFrameTimerRef.current) {
      clearInterval(shareFrameTimerRef.current)
      shareFrameTimerRef.current = null
    }

    if (shareCaptureVideoRef.current) {
      shareCaptureVideoRef.current.pause()
      shareCaptureVideoRef.current.srcObject = null
      shareCaptureVideoRef.current = null
    }

    const stream = localShareStreamRef.current
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      localShareStreamRef.current = null
    }

    if (localShareVideoRef.current) {
      localShareVideoRef.current.srcObject = null
    }

    setIsSharingScreen(false)
    setRemoteScreenFrame(null)
    setScreenSharingUser((previous) =>
      previous?.userId === normalizedUserId ? null : previous
    )

    if (emitState && socket && roomId) {
      socket.emit('meeting:screen-share-state', {
        roomId,
        active: false,
        userId: normalizedUserId,
        userName: currentUserName,
      })
    }
  }

  const handleAddAgendaItem = async (event) => {
    event.preventDefault()

    const trimmedTitle = agendaTitle.trim()
    if (!trimmedTitle) return

    const nextAgenda = [
      ...agenda,
      {
        id: nanoid(8),
        title: trimmedTitle,
        duration: Math.max(0, Number(agendaDuration) || 0),
        completed: false,
      },
    ]

    try {
      await updateAgenda(nextAgenda)
      setAgendaTitle('')
      setAgendaDuration(10)
    } catch {
      // Error toast handled in hook.
    }
  }

  const handleToggleAgendaComplete = async (itemId) => {
    const nextAgenda = agenda.map((item) =>
      item.id === itemId
        ? {
            ...item,
            completed: !item.completed,
          }
        : item
    )

    try {
      await updateAgenda(nextAgenda)
    } catch {
      // Error toast handled in hook.
    }
  }

  const handleRemoveAgendaItem = async (itemId) => {
    const nextAgenda = agenda.filter((item) => item.id !== itemId)

    try {
      await updateAgenda(nextAgenda)
    } catch {
      // Error toast handled in hook.
    }
  }

  const handleSendMessage = (event) => {
    event.preventDefault()
    const trimmed = chatMessage.trim()
    if (!trimmed) return

    if (!socket) {
      toast.error('Discussion channel is not connected yet')
      return
    }

    socket.emit(
      'chat:message',
      {
        roomId,
        text: trimmed,
        timestamp: Date.now(),
      },
      (ack) => {
        if (ack && ack.ok === false) {
          toast.error(ack.message || 'Failed to send message')
        }
      }
    )

    setChatMessage('')
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

    const shareText = `Join my SketchRoom meeting room\nRoom: ${roomUrl}${roomCode ? `\nRoom code: ${roomCode}` : ''}\nAdmins need to approve join requests.${localOriginTip}`

    const copied = await copyTextToClipboard(shareText)
    if (copied) {
      toast.success('Invite copied to clipboard')
      return
    }

    toast.error('Could not copy invite details')
  }

  const handleSetPresenter = async (targetPresenterId) => {
    if (!canModerate) {
      toast.warning('Only host or moderator can set presenter')
      return
    }

    const nextPresenterId = String(targetPresenterId || '').trim()
    if (!nextPresenterId) {
      toast.warning('Select a participant to present')
      return
    }

    try {
      await requestPresenter(nextPresenterId)
      toast.success(
        nextPresenterId === normalizedUserId ? 'You are now presenting' : 'Presenter updated'
      )
    } catch {
      // Error toast handled in hook.
    }
  }

  const handleToggleScreenShare = async () => {
    if (isSharingScreen) {
      stopScreenShare(true)
      toast.info('Screen sharing stopped')
      return
    }

    if (!canShareScreen) {
      toast.warning('Only host, moderator, or presenter can share screen')
      return
    }

    if (!navigator?.mediaDevices?.getDisplayMedia) {
      toast.error(getMediaUnsupportedMessage('Screen sharing'))
      return
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 10,
        },
        audio: false,
      })

      localShareStreamRef.current = stream
      setIsSharingScreen(true)
      setScreenSharingUser({
        userId: normalizedUserId,
        userName: currentUserName,
      })
      setRemoteScreenFrame(null)

      if (socket && roomId) {
        socket.emit('meeting:screen-share-state', {
          roomId,
          active: true,
          userId: normalizedUserId,
          userName: currentUserName,
        })
      }

      const captureVideo = document.createElement('video')
      captureVideo.srcObject = stream
      captureVideo.muted = true
      captureVideo.playsInline = true
      await captureVideo.play()
      shareCaptureVideoRef.current = captureVideo

      if (!shareCaptureCanvasRef.current) {
        shareCaptureCanvasRef.current = document.createElement('canvas')
      }

      const broadcastFrame = () => {
        if (!socket || !roomId || !shareCaptureVideoRef.current || !shareCaptureCanvasRef.current) return

        const video = shareCaptureVideoRef.current
        if (video.videoWidth <= 0 || video.videoHeight <= 0) return

        const maxWidth = 720
        const scale = Math.min(1, maxWidth / video.videoWidth)

        const canvas = shareCaptureCanvasRef.current
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale))

        const context = canvas.getContext('2d')
        if (!context) return

        context.drawImage(video, 0, 0, canvas.width, canvas.height)

        socket.emit('meeting:screen-share-frame', {
          roomId,
          frame: canvas.toDataURL('image/jpeg', 0.5),
          width: canvas.width,
          height: canvas.height,
          timestamp: Date.now(),
        })
      }

      broadcastFrame()
      shareFrameTimerRef.current = setInterval(broadcastFrame, 700)

      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.addEventListener(
          'ended',
          () => {
            stopScreenShare(true)
            toast.info('Screen sharing ended')
          },
          { once: true }
        )
      }

      toast.success('Screen sharing started')
    } catch (error) {
      if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
        toast.error('Screen share permission denied. Allow permissions in browser settings.')
        return
      }

      if (error?.name === 'NotFoundError') {
        toast.error('No display source available for screen sharing.')
        return
      }

      toast.error('Unable to start screen sharing')
    }
  }

  useEffect(() => {
    if (!localShareVideoRef.current) return
    localShareVideoRef.current.srcObject = isSharingScreen ? localShareStreamRef.current : null
  }, [isSharingScreen])

  useEffect(() => {
    if (!hasScreenSharePreview && isPinnedPresenterView) {
      setIsPinnedPresenterView(false)
    }
  }, [hasScreenSharePreview, isPinnedPresenterView])

  useEffect(() => {
    if (!socket || !roomId) return

    const handleScreenShareState = (event) => {
      const sharingUserId = String(event?.userId || '')
      if (!sharingUserId || sharingUserId === normalizedUserId) return

      if (event.active) {
        setScreenSharingUser({
          userId: sharingUserId,
          userName: event.userName || 'Presenter',
        })
        return
      }

      setScreenSharingUser((previous) =>
        !previous || previous.userId === sharingUserId ? null : previous
      )
      setRemoteScreenFrame(null)
    }

    const handleScreenShareFrame = (event) => {
      const sharingUserId = String(event?.userId || '')
      if (!sharingUserId || sharingUserId === normalizedUserId || !event?.frame) return

      setScreenSharingUser({
        userId: sharingUserId,
        userName: event.userName || 'Presenter',
      })
      setRemoteScreenFrame(event.frame)
    }

    socket.on('meeting:screen-share-state', handleScreenShareState)
    socket.on('meeting:screen-share-frame', handleScreenShareFrame)

    return () => {
      socket.off('meeting:screen-share-state', handleScreenShareState)
      socket.off('meeting:screen-share-frame', handleScreenShareFrame)
    }
  }, [socket, roomId, normalizedUserId])

  useEffect(() => {
    return () => {
      stopScreenShare(false)
    }
  }, [])

  return (
    <div className="h-screen w-screen flex flex-col bg-[#202124] text-[#EDE9E0] font-body overflow-hidden">
      <header className="min-h-[56px] bg-[#1F1F1F] border-b border-white/10 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-white/70 hover:text-white shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>

          <div className="min-w-0">
            <h1 className="text-[14px] sm:text-[15px] font-semibold text-white truncate">
              {room?.name || 'Meeting Room'}
            </h1>
            <p className="text-[11px] text-white/55 truncate">{headerSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          {requestsMenu ? <JoinRequestsMenu {...requestsMenu} /> : null}

          <button
            onClick={() => setShowDiscussion((previous) => !previous)}
            className="px-2.5 py-1.5 rounded-md bg-white/10 text-white text-[11px] font-semibold hover:bg-white/15"
          >
            {showDiscussion ? 'Hide Panel' : 'Show Panel'}
          </button>

          <button
            onClick={handleShare}
            className={`px-3 py-1.5 rounded-md text-[12px] font-semibold text-white ${
              isHost ? 'bg-[#D4420A] hover:bg-[#B33508]' : 'bg-[#8B8178]'
            }`}
          >
            {isHost ? 'Share' : 'Invite Locked'}
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        <section className="flex-1 min-w-0 p-3 sm:p-4 flex flex-col gap-3 min-h-0">
          <div className="relative flex-1 min-h-[280px] rounded-2xl overflow-hidden border border-white/12 bg-[#0E1013]">
            {isPinnedPresenterView && hasScreenSharePreview ? (
              <div className="h-full w-full flex items-center justify-center px-4 text-center bg-[#0E1013] text-white/70">
                <div>
                  <p className="text-[14px] font-semibold text-white/85">Presenter is pinned</p>
                  <p className="text-[12px] mt-1">Unpin to show the stage here again.</p>
                </div>
              </div>
            ) : (
              renderPresenterMedia('absolute inset-0 w-full h-full object-cover')
            )}

            <div className="absolute inset-x-0 top-0 px-3 py-2 bg-gradient-to-b from-black/75 to-transparent flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-white truncate">{presenterStageLabel}</p>
              <span className="text-[10px] text-white/70 uppercase tracking-wider">
                {hasScreenSharePreview ? 'Live' : 'Meeting'}
              </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/75 to-transparent">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="px-2 py-1 rounded bg-white/12 text-white font-semibold">
                  Presenter: {presenterName}
                </span>
                {activeAgendaItem ? (
                  <span className="px-2 py-1 rounded bg-[#1E5F74]/45 text-white">
                    Agenda: {activeAgendaItem.title}
                  </span>
                ) : null}
                <span className="px-2 py-1 rounded bg-white/10 text-white/85">
                  Queue: {handQueue.length}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-center">
            <div className="flex flex-wrap items-center justify-center gap-2 bg-[#2C2C28] border border-white/10 rounded-full px-2.5 py-2">
              {canModerate ? (
                <>
                  <select
                    value={selectedPresenterId}
                    onChange={(event) => setSelectedPresenterId(event.target.value)}
                    className="px-3 py-1.5 rounded-full bg-white/10 text-white text-[12px] border border-white/15 min-w-[170px]"
                  >
                    {participantList.map((participant) => (
                      <option key={participant.id} value={participant.id} className="text-black">
                        {participant.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleSetPresenter(selectedPresenterId || normalizedUserId)}
                    disabled={isMutating}
                    className="px-3 py-1.5 rounded-full bg-white/10 text-white text-[12px] font-semibold hover:bg-white/15 disabled:opacity-60"
                  >
                    {String(selectedPresenterId) === normalizedUserId ? 'Present Myself' : 'Set Presenter'}
                  </button>
                </>
              ) : null}

              {canManageAgenda ? (
                <button
                  onClick={nextAgendaItem}
                  disabled={isMutating || agenda.length === 0}
                  className="px-3 py-1.5 rounded-full bg-[#D4420A] text-white text-[12px] font-semibold hover:bg-[#B33508] disabled:opacity-60"
                >
                  Next Agenda
                </button>
              ) : null}

              <button
                onClick={isInQueue ? lowerHand : raiseHand}
                disabled={isMutating}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold ${
                  isInQueue
                    ? 'bg-white/10 text-white hover:bg-white/15'
                    : 'bg-[#1E5F74] text-white hover:bg-[#174D5E]'
                } disabled:opacity-60`}
              >
                {isInQueue ? 'Lower Hand' : 'Raise Hand'}
              </button>

              <button
                onClick={() => setViewportSync(!isViewportSynced)}
                disabled={isMutating || !canManageAgenda}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold ${
                  isViewportSynced
                    ? 'bg-[#2A7A4B] text-white'
                    : 'bg-white/10 text-white/85'
                } disabled:opacity-50`}
              >
                Sync {isViewportSynced ? 'ON' : 'OFF'}
              </button>

              {canShareScreen || isSharingScreen ? (
                <button
                  onClick={handleToggleScreenShare}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold text-white ${
                    isSharingScreen
                      ? 'bg-[#C0392B] hover:bg-[#A93226]'
                      : 'bg-[#1E5F74] hover:bg-[#174D5E]'
                  }`}
                >
                  {isSharingScreen ? 'Stop Share' : 'Share Screen'}
                </button>
              ) : null}

              {hasScreenSharePreview ? (
                <button
                  onClick={() => setIsPinnedPresenterView((previous) => !previous)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold ${
                    isPinnedPresenterView
                      ? 'bg-white text-[#18170F]'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  {isPinnedPresenterView ? 'Unpin' : 'Pin'}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {showDiscussion ? (
          <aside className="w-full lg:w-[330px] lg:max-w-[92vw] shrink-0 bg-[#1F1F1F] border-t lg:border-t-0 lg:border-l border-white/10 p-3 sm:p-4 overflow-y-auto space-y-4 max-h-[46vh] lg:max-h-none">
            <section className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-[13px] font-semibold text-white">Agenda</h3>
                <span className="text-[10px] text-white/60">{agenda.length} item{agenda.length === 1 ? '' : 's'}</span>
              </div>

              {canManageAgenda ? (
                <form onSubmit={handleAddAgendaItem} className="grid grid-cols-[1fr_74px_auto] gap-2 mb-3">
                  <input
                    type="text"
                    value={agendaTitle}
                    onChange={(event) => setAgendaTitle(event.target.value)}
                    placeholder="Add topic"
                    className="w-full px-2.5 py-2 rounded-md bg-black/25 border border-white/15 text-[12px] text-white placeholder:text-white/35 outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    value={agendaDuration}
                    onChange={(event) => setAgendaDuration(Number(event.target.value))}
                    className="px-2.5 py-2 rounded-md bg-black/25 border border-white/15 text-[12px] text-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!agendaTitle.trim() || isMutating}
                    className="px-3 py-2 rounded-md bg-[#D4420A] text-white text-[12px] font-semibold hover:bg-[#B33508] disabled:opacity-60"
                  >
                    Add
                  </button>
                </form>
              ) : null}

              {isLoading ? (
                <p className="text-[12px] text-white/55">Loading agenda...</p>
              ) : null}

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {!isLoading && agenda.length === 0 ? (
                  <p className="text-[12px] text-white/55">No agenda items yet.</p>
                ) : null}

                {agenda.map((item, index) => {
                  const isActive = index === currentAgendaIndex
                  return (
                    <article
                      key={item.id}
                      className={`p-2.5 rounded-lg border ${
                        isActive
                          ? 'bg-[#D4420A]/20 border-[#D4420A]/40'
                          : 'bg-black/20 border-white/10'
                      }`}
                    >
                      <p className={`text-[12px] font-semibold ${item.completed ? 'line-through text-white/45' : 'text-white'}`}>
                        {item.title}
                      </p>
                      <p className="text-[11px] text-white/60 mt-0.5">{item.duration} min</p>

                      {canManageAgenda ? (
                        <div className="mt-2 flex items-center gap-2 text-[11px]">
                          <button
                            onClick={() => setAgendaIndex(index)}
                            disabled={isMutating}
                            className="px-2 py-0.5 rounded bg-white/10 text-white/85 hover:bg-white/15 disabled:opacity-60"
                          >
                            Focus
                          </button>
                          <button
                            onClick={() => handleToggleAgendaComplete(item.id)}
                            disabled={isMutating}
                            className="px-2 py-0.5 rounded bg-[#2A7A4B]/30 text-[#D7F2E0] hover:bg-[#2A7A4B]/40 disabled:opacity-60"
                          >
                            {item.completed ? 'Undo' : 'Done'}
                          </button>
                          <button
                            onClick={() => handleRemoveAgendaItem(item.id)}
                            disabled={isMutating}
                            className="px-2 py-0.5 rounded bg-[#C0392B]/30 text-[#FFDAD5] hover:bg-[#C0392B]/40 disabled:opacity-60"
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[13px] font-semibold text-white">Hand Queue</h3>
                <span className="text-[10px] text-white/60">{handQueue.length}</span>
              </div>

              <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                {handQueue.length === 0 ? (
                  <p className="text-[12px] text-white/55">Queue is empty.</p>
                ) : null}

                {handQueue.map((queuedUserId) => {
                  const participant = participantList.find((entry) => entry.id === String(queuedUserId))
                  return (
                    <div
                      key={queuedUserId}
                      className="flex items-center justify-between px-2 py-1.5 rounded bg-black/20 border border-white/10"
                    >
                      <span className="text-[12px] text-white truncate">{participant?.name || queuedUserId}</span>
                      {String(queuedUserId) === String(userId) ? (
                        <span className="text-[10px] text-[#F9B099] font-semibold uppercase tracking-wider">You</span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-3">
              <h3 className="text-[13px] font-semibold text-white mb-2">Discussion</h3>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {recentMessages.length === 0 ? (
                  <p className="text-[12px] text-white/55 p-2.5 rounded bg-black/20 border border-white/10">
                    Start discussion for this meeting.
                  </p>
                ) : null}

                {recentMessages.map((message, index) => (
                  <article
                    key={message.id || `${message.userId || 'user'}-${index}`}
                    className="p-2.5 rounded-lg bg-black/20 border border-white/10"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-semibold text-white truncate">
                        {message.userName || 'Member'}
                      </span>
                      <span className="text-[10px] text-white/45 shrink-0">
                        {formatMessageTime(message.timestamp)}
                      </span>
                    </div>
                    <p className="text-[12px] text-white/78 leading-relaxed break-words">{message.text}</p>
                  </article>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(event) => setChatMessage(event.target.value)}
                  placeholder="Send a message"
                  className="flex-1 px-3 py-2 rounded-md bg-black/25 border border-white/15 text-[12px] text-white placeholder:text-white/35 outline-none"
                />
                <button
                  type="submit"
                  disabled={!chatMessage.trim()}
                  className="px-3 py-2 rounded-md bg-[#D4420A] text-white text-[12px] font-semibold hover:bg-[#B33508] disabled:opacity-60"
                >
                  Send
                </button>
              </form>
            </section>
          </aside>
        ) : null}

        {isPinnedPresenterView && hasScreenSharePreview ? (
          <div className="fixed bottom-3 right-3 sm:bottom-5 sm:right-6 z-[70] w-[min(92vw,520px)] rounded-xl border border-[#1E5F74]/25 bg-[#0E1013] overflow-hidden shadow-2xl">
            <div className="px-3 py-2 bg-[#111923] border-b border-[#1E5F74]/25 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-[#E7EEF1] truncate">
                {screenShareStatusText || 'Pinned presenter view'}
              </p>
              <button
                onClick={() => setIsPinnedPresenterView(false)}
                className="px-2 py-0.5 rounded bg-white/10 text-white text-[10px] font-semibold hover:bg-white/20"
              >
                Unpin
              </button>
            </div>

            <div className="w-full aspect-video">
              {renderPresenterMedia('w-full h-full object-cover')}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}

export default MeetingRoom