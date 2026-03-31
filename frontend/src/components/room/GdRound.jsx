import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildRoomShareLink, copyTextToClipboard, isLocalShareOrigin } from '../../api/rooms'
import useGdRound from '../../hooks/useGdRound'
import useRoomStore from '../../stores/useRoomStore'
import { toast } from '../ui/Toast'
import JoinRequestsMenu from '../layout/JoinRequestsMenu'

function formatSeconds(totalSeconds = 0) {
  const safe = Math.max(0, Number(totalSeconds) || 0)
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function computeAverageScore(scoreMap = {}) {
  const values = Object.values(scoreMap).filter((value) => Number.isFinite(value))
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const SCORE_FIELDS = [
  { key: 'clarity', label: 'Clarity' },
  { key: 'relevance', label: 'Relevance' },
  { key: 'confidence', label: 'Confidence' },
]

const ROUND_TABLE_SEAT_COLORS = [
  '#D4420A',
  '#1E5F74',
  '#2A7A4B',
  '#A65A2A',
  '#7B4EA6',
  '#C4871A',
  '#C0392B',
  '#2980B9',
]

const MAX_ROUND_TABLE_SEATS = 10

function getInitials(name = 'Member') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'M'
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
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

const GdRound = ({ socket, roomId, userId, room, requestsMenu = null }) => {
  const navigate = useNavigate()
  const normalizedUserId = String(userId || '')
  const isHost = String(room?.owner?.id || '') === normalizedUserId
  const viewerRole = room?.permissions?.viewerRole || (isHost ? 'owner' : 'member')
  const canModerate = viewerRole === 'owner' || viewerRole === 'moderator'

  const {
    speakers,
    currentSpeaker,
    currentSpeakerIndex,
    scores,
    micOverrideUserIds,
    isActive,
    summary,
    isLoading,
    isMutating,
    startRound,
    nextSpeaker,
    submitScore,
    setSpeakerMicAccess,
    endRound,
  } = useGdRound(socket, roomId, userId, viewerRole)

  const members = useRoomStore((state) => state.members)

  const [showPanel, setShowPanel] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 1024
  })
  const [selectedSpeakerId, setSelectedSpeakerId] = useState('')
  const [scoreDraft, setScoreDraft] = useState({
    clarity: 7,
    relevance: 7,
    confidence: 7,
  })
  const [isMicOn, setIsMicOn] = useState(false)
  const [isMicBusy, setIsMicBusy] = useState(false)
  const localMicStreamRef = useRef(null)

  const participantList = useMemo(() => {
    const map = new Map()
    const hostId = String(room?.owner?.id || '')

    ;(room?.members || []).forEach((member) => {
      const id = String(member?.id || member?.userId || '')
      if (!id || id === hostId) return
      map.set(id, { id, name: member?.name || 'Member' })
    })

    ;(members || []).forEach((member) => {
      const id = String(member?.userId || member?.id || '')
      if (!id || id === hostId) return
      map.set(id, { id, name: member?.name || 'Member' })
    })

    if (userId && String(userId) !== hostId && !map.has(String(userId))) {
      map.set(String(userId), { id: String(userId), name: 'You' })
    }

    return Array.from(map.values())
  }, [room?.members, room?.owner?.id, members, userId])

  const { roundTableParticipants, roundTableOverflowCount } = useMemo(() => {
    const source =
      speakers.length > 0
        ? speakers.map((speaker) => ({
            id: String(speaker.userId || ''),
            name: speaker.name || 'Speaker',
            timeRemaining: Number(speaker.timeRemaining) || 0,
          }))
        : participantList.map((participant) => ({
            id: String(participant.id || ''),
            name: participant.name || 'Member',
            timeRemaining: null,
          }))

    const deduped = []
    const seen = new Set()

    source.forEach((participant) => {
      if (!participant.id || seen.has(participant.id)) return
      seen.add(participant.id)
      deduped.push(participant)
    })

    return {
      roundTableParticipants: deduped.slice(0, MAX_ROUND_TABLE_SEATS),
      roundTableOverflowCount: Math.max(0, deduped.length - MAX_ROUND_TABLE_SEATS),
    }
  }, [speakers, participantList])

  const roundTableSeats = useMemo(() => {
    const count = roundTableParticipants.length
    if (!count) return []

    const radius =
      count <= 4
        ? 86
        : count <= 6
          ? 98
          : count <= 8
            ? 110
            : 120

    return roundTableParticipants.map((participant, index) => {
      const angle = (Math.PI * 2 * index) / count - Math.PI / 2
      const average = computeAverageScore(scores?.[participant.id] || {})

      return {
        ...participant,
        color: ROUND_TABLE_SEAT_COLORS[index % ROUND_TABLE_SEAT_COLORS.length],
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        isCurrent: String(currentSpeaker?.userId || '') === participant.id,
        isSelected: String(selectedSpeakerId || '') === participant.id,
        averageLabel: average === null ? null : average.toFixed(1),
      }
    })
  }, [roundTableParticipants, scores, currentSpeaker?.userId, selectedSpeakerId])

  const focusedSeat = useMemo(() => {
    return (
      roundTableSeats.find((seat) => seat.isCurrent) ||
      roundTableSeats.find((seat) => seat.isSelected) ||
      null
    )
  }, [roundTableSeats])

  useEffect(() => {
    if (currentSpeaker?.userId) {
      setSelectedSpeakerId(currentSpeaker.userId)
    }
  }, [currentSpeaker?.userId])

  const selectedScoreTarget = useMemo(() => {
    if (!selectedSpeakerId) return null
    return speakers.find((speaker) => speaker.userId === selectedSpeakerId) || null
  }, [speakers, selectedSpeakerId])

  const roundBaselineSeconds = useMemo(() => {
    const fromSpeakers = speakers
      .map((speaker) => Number(speaker?.timeRemaining || 0))
      .filter((value) => Number.isFinite(value) && value > 0)
    if (!fromSpeakers.length) return 120
    return Math.max(120, ...fromSpeakers)
  }, [speakers])

  const currentSpeakerProgress = useMemo(() => {
    if (!currentSpeaker) return 0
    const remaining = Math.max(0, Number(currentSpeaker.timeRemaining) || 0)
    return Math.min(100, Math.max(0, Math.round((remaining / roundBaselineSeconds) * 100)))
  }, [currentSpeaker, roundBaselineSeconds])

  const micOverrideSet = useMemo(() => {
    return new Set((micOverrideUserIds || []).map((value) => String(value)))
  }, [micOverrideUserIds])

  const currentSpeakerUserId = String(currentSpeaker?.userId || '')

  const canSpeakNow = useMemo(() => {
    if (canModerate) return true
    if (!normalizedUserId) return false
    if (micOverrideSet.has(normalizedUserId)) return true
    return isActive && currentSpeakerUserId === normalizedUserId
  }, [canModerate, normalizedUserId, micOverrideSet, isActive, currentSpeakerUserId])

  const canViewSummary = isHost

  const speakerLeaderboard = useMemo(() => {
    return [...speakers]
      .map((speaker) => {
        const average = computeAverageScore(scores?.[speaker.userId] || {})
        return {
          ...speaker,
          average,
          averageLabel: average === null ? 'N/A' : average.toFixed(2),
          averagePercent: average === null ? 0 : Math.round((average / 10) * 100),
        }
      })
      .sort((a, b) => (b.average ?? -1) - (a.average ?? -1))
  }, [speakers, scores])

  const scoreInsights = useMemo(() => {
    const ranked = speakerLeaderboard.filter((entry) => entry.average !== null)
    if (!ranked.length) return []

    const top = ranked[0]
    const low = ranked[ranked.length - 1]
    const insights = [`Top performer: ${top.name}`]

    if (ranked.length > 1) {
      insights.push(`Needs boost: ${low.name}`)
      insights.push(`Score spread: ${(top.average - low.average).toFixed(2)}`)
    }

    if (ranked.length >= 3) {
      insights.push('Good sample size for fair panel ranking')
    }

    return insights
  }, [speakerLeaderboard])

  const coachPrompts = useMemo(() => {
    if (!currentSpeaker) {
      return [
        'Start with a strong opening statement in under 20 seconds.',
        'Use one concrete example to anchor your argument.',
        'Close with a crisp one-line summary.',
      ]
    }

    return [
      `Ask ${currentSpeaker.name} to add one measurable outcome to the argument.`,
      `Challenge ${currentSpeaker.name} with a 15-second counterpoint drill.`,
      `Prompt ${currentSpeaker.name} to conclude with a single memorable line.`,
    ]
  }, [currentSpeaker])

  const stopLocalMic = useCallback(() => {
    if (localMicStreamRef.current) {
      localMicStreamRef.current.getTracks().forEach((track) => track.stop())
      localMicStreamRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      stopLocalMic()
    }
  }, [stopLocalMic])

  useEffect(() => {
    if (canSpeakNow || !isMicOn) return

    stopLocalMic()
    setIsMicOn(false)
    toast.warning('Mic disabled until your turn or moderator override')
  }, [canSpeakNow, isMicOn, stopLocalMic])

  const handleToggleMyMic = async () => {
    if (isMicOn) {
      stopLocalMic()
      setIsMicOn(false)
      toast.success('Mic muted')
      return
    }

    if (!canSpeakNow) {
      toast.warning('Wait for your turn or moderator mic access')
      return
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      toast.error(getMediaUnsupportedMessage('Microphone access'))
      return
    }

    setIsMicBusy(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      })

      stopLocalMic()
      localMicStreamRef.current = stream
      setIsMicOn(true)
      toast.success('Mic enabled')
    } catch (error) {
      if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
        toast.error('Microphone permission was blocked. Allow mic access in browser settings.')
      } else if (error?.name === 'NotFoundError') {
        toast.error('No microphone device found on this system.')
      } else {
        toast.error('Unable to access microphone. Check browser permissions.')
      }
    } finally {
      setIsMicBusy(false)
    }
  }

  const handleToggleSpeakerMicAccess = async (targetUserId) => {
    if (!canModerate) {
      toast.warning('Only host or moderator can control mic access')
      return
    }

    const normalizedTargetId = String(targetUserId || '')
    if (!normalizedTargetId) return

    if (normalizedTargetId === currentSpeakerUserId) {
      toast.info('Current speaker already has mic access')
      return
    }

    const nextEnabled = !micOverrideSet.has(normalizedTargetId)

    try {
      await setSpeakerMicAccess(normalizedTargetId, nextEnabled)
      toast.success(nextEnabled ? 'Mic access granted' : 'Mic access revoked')
    } catch {
      // Error toast handled in hook.
    }
  }

  const handleStartRound = async () => {
    if (!canModerate) {
      toast.warning('Only host or moderator can start the GD round')
      return
    }

    const source = participantList.length > 0 ? participantList : [{ id: String(userId), name: 'You' }]
    const speakerList = source.map((participant) => ({
      userId: participant.id,
      name: participant.name,
      timeRemaining: 120,
      hasSpoken: false,
    }))

    try {
      await startRound(speakerList)
      toast.success('GD round started')
    } catch {
      // Error toast handled in hook.
    }
  }

  const handleNextSpeaker = async () => {
    if (!canModerate) {
      toast.warning('Only host or moderator can advance speakers')
      return
    }

    try {
      const nextState = await nextSpeaker()
      if (!nextState && isActive) {
        await handleEndRound()
      }
    } catch {
      // Error toast handled in hook.
    }
  }

  const handleSubmitScore = async () => {
    if (!canModerate) {
      toast.warning('Only host or moderator can submit scores')
      return
    }

    if (!selectedSpeakerId) {
      toast.warning('Select a speaker first')
      return
    }

    try {
      await submitScore(selectedSpeakerId, scoreDraft)
      toast.success('Score submitted')
    } catch {
      // Error toast handled in hook.
    }
  }

  const handleEndRound = async () => {
    if (!canModerate) {
      toast.warning('Only host or moderator can end the GD round')
      return
    }

    try {
      await endRound()
      toast.success('GD round ended')
    } catch {
      // Error toast handled in hook.
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

    const shareText = `Join my SketchRoom GD room\nRoom: ${roomUrl}${roomCode ? `\nRoom code: ${roomCode}` : ''}\nAdmins need to approve join requests.${localOriginTip}`

    const copied = await copyTextToClipboard(shareText)
    if (copied) {
      toast.success('Invite copied to clipboard')
      return
    }

    toast.error('Could not copy invite details')
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

          <div className="min-w-0">
            <h1 className="text-[14px] sm:text-[15px] font-semibold text-[#EDE9E0] truncate">
              {room?.name || 'GD Round Room'}
            </h1>
            <p className="text-[11px] text-[#EDE9E0]/55 truncate">
              Backend-driven GD flow with persistent scores and summary
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowPanel((previous) => !previous)}
            className="lg:hidden px-2.5 py-1.5 rounded-md bg-[#EDE9E0]/10 text-[#EDE9E0] text-[11px] font-semibold"
          >
            {showPanel ? 'Hide Panel' : 'Panel'}
          </button>

          {requestsMenu ? <JoinRequestsMenu {...requestsMenu} /> : null}

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

      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-5">
        <div className={`grid gap-4 ${showPanel ? 'xl:grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-1'}`}>
          <section className="min-w-0 space-y-4">
            <section className="bg-white border border-[#18170F]/10 rounded-2xl p-3 sm:p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-[#18170F]/45">Current Speaker</p>
                  <h2 className="text-[16px] font-semibold text-[#18170F]">
                    {currentSpeaker ? currentSpeaker.name : 'Round not started'}
                  </h2>
                  <p className="text-[12px] text-[#18170F]/60 mt-1">
                    {currentSpeaker
                      ? `Time remaining: ${formatSeconds(currentSpeaker.timeRemaining)}`
                      : 'Start the round to begin timing and scoring.'}
                  </p>

                  {currentSpeaker ? (
                    <div className="mt-2 w-full max-w-[260px]">
                      <div className="h-2 rounded-full bg-[#18170F]/10 overflow-hidden">
                        <div
                          className="h-full bg-[#1E5F74] transition-all"
                          style={{ width: `${currentSpeakerProgress}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-[#18170F]/55">{currentSpeakerProgress}% speaking time left</p>
                    </div>
                  ) : null}
                </div>

                <div className="min-w-[220px] rounded-xl border border-[#18170F]/12 bg-[#F8F5F1] p-3">
                  <p className="text-[11px] uppercase tracking-wider text-[#18170F]/50">My Mic</p>
                  <p className="mt-1 text-[12px] text-[#18170F]/70">
                    {canSpeakNow
                      ? 'Mic is available for you now.'
                      : 'Mic stays locked until your turn or moderator override.'}
                  </p>
                  <button
                    onClick={handleToggleMyMic}
                    disabled={isMicBusy || (!canSpeakNow && !isMicOn)}
                    className={`mt-2 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white disabled:opacity-60 ${
                      isMicOn
                        ? 'bg-[#8B8178] hover:bg-[#756B63]'
                        : canSpeakNow
                          ? 'bg-[#2A7A4B] hover:bg-[#22623D]'
                          : 'bg-[#B8B1A8]'
                    }`}
                  >
                    {isMicBusy ? 'Checking...' : isMicOn ? 'Mute Mic' : 'Enable Mic'}
                  </button>
                  <p className="mt-1 text-[11px] text-[#18170F]/55">
                    {isMicOn ? 'Mic is on for your local device.' : 'Mic is currently off.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleStartRound}
                    disabled={isMutating || participantList.length === 0 || !canModerate}
                    className="px-3 py-1.5 rounded-lg bg-[#2A7A4B] text-white text-[12px] font-semibold hover:bg-[#22623D] disabled:opacity-60"
                  >
                    Start Round
                  </button>
                  <button
                    onClick={handleNextSpeaker}
                    disabled={isMutating || !isActive || speakers.length === 0 || !canModerate}
                    className="px-3 py-1.5 rounded-lg bg-[#1E5F74] text-white text-[12px] font-semibold hover:bg-[#174D5E] disabled:opacity-60"
                  >
                    Next Speaker
                  </button>
                  <button
                    onClick={handleEndRound}
                    disabled={isMutating || (!isActive && !speakers.length) || !canModerate}
                    className="px-3 py-1.5 rounded-lg bg-[#D4420A] text-white text-[12px] font-semibold hover:bg-[#B33508] disabled:opacity-60"
                  >
                    End Round
                  </button>
                </div>

                {!canModerate ? (
                  <p className="text-[12px] text-[#18170F]/45">Round controls are locked to host and moderators.</p>
                ) : null}

                {canModerate && participantList.length === 0 ? (
                  <p className="text-[12px] text-[#18170F]/45">
                    Host is excluded from GD seats. Add participants to start the round.
                  </p>
                ) : null}
              </div>
            </section>

            <section className="bg-white border border-[#18170F]/10 rounded-2xl p-3 sm:p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-semibold text-[#18170F]">Speaker Queue</h3>
                <span className="text-[11px] px-2 py-0.5 rounded bg-[#18170F]/7 text-[#18170F]/65">
                  {speakers.length} speaker{speakers.length === 1 ? '' : 's'}
                </span>
              </div>

              {isLoading ? (
                <p className="text-[12px] text-[#18170F]/60">Loading GD state...</p>
              ) : null}

              {!isLoading && speakers.length === 0 ? (
                <p className="text-[12px] text-[#18170F]/60">No speakers yet. Start round to initialize queue.</p>
              ) : null}

              {!isLoading && speakers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {speakers.map((speaker, index) => {
                    const isCurrent = index === currentSpeakerIndex
                    const speakerUserId = String(speaker.userId || '')
                    const micGranted = micOverrideSet.has(speakerUserId)
                    const micStatusLabel = isCurrent
                      ? 'Mic: Turn active'
                      : micGranted
                        ? 'Mic: Override on'
                        : 'Mic: Locked'

                    return (
                      <article
                        key={speaker.userId}
                        className={`p-3 rounded-xl border ${
                          isCurrent
                            ? 'border-[#D4420A]/35 bg-[#D4420A]/[0.04]'
                            : 'border-[#18170F]/10 bg-[#FDFCF9]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-semibold text-[#18170F] truncate">{speaker.name}</p>
                          {isCurrent ? (
                            <span className="text-[10px] text-[#D4420A] font-semibold uppercase tracking-wider">Live</span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-[#18170F]/55 mt-1">
                          Time: {formatSeconds(speaker.timeRemaining)}
                        </p>
                        <p className="text-[11px] text-[#18170F]/60 mt-1">{micStatusLabel}</p>

                        {canModerate && !isCurrent ? (
                          <button
                            type="button"
                            onClick={() => handleToggleSpeakerMicAccess(speakerUserId)}
                            disabled={isMutating}
                            className={`mt-2 px-2.5 py-1 rounded-md text-[11px] font-semibold text-white disabled:opacity-60 ${
                              micGranted
                                ? 'bg-[#8B8178] hover:bg-[#756B63]'
                                : 'bg-[#1E5F74] hover:bg-[#174D5E]'
                            }`}
                          >
                            {micGranted ? 'Revoke Override' : 'Allow Mic'}
                          </button>
                        ) : null}
                      </article>
                    )
                  })}
                </div>
              ) : null}
            </section>

            <section className="bg-white border border-[#18170F]/10 rounded-2xl p-3 sm:p-4 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-semibold text-[#18170F]">Round Table Simulator</h3>
                <span className="text-[11px] px-2 py-0.5 rounded bg-[#2A7A4B]/10 text-[#2A7A4B]">
                  {roundTableParticipants.length} seat{roundTableParticipants.length === 1 ? '' : 's'}
                </span>
              </div>

              {roundTableParticipants.length === 0 ? (
                <p className="text-[12px] text-[#18170F]/60">
                  Add participants and start a round to activate the table.
                </p>
              ) : (
                <>
                  <div className="relative mx-auto h-[320px] max-w-[560px] rounded-2xl border border-[#18170F]/8 bg-[linear-gradient(135deg,#FCF8F2_0%,#F2E9DC_100%)] overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute left-1/2 top-1/2 w-[220px] h-[220px] sm:w-[250px] sm:h-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#18170F]/15 bg-[radial-gradient(circle,#E6DAC8_0%,#D6C1A5_60%,#B49474_100%)] shadow-inner" />

                      <div className="absolute left-1/2 top-1/2 w-[130px] h-[130px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-white/40 backdrop-blur-[1px] flex flex-col items-center justify-center px-2 text-center">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-[#18170F]/50">Live Focus</p>
                        <p className="mt-1 text-[12px] font-semibold text-[#18170F] truncate w-full">
                          {focusedSeat ? focusedSeat.name : 'Waiting'}
                        </p>
                        <p className="text-[10px] text-[#18170F]/55">
                          {focusedSeat?.isCurrent ? 'Speaking now' : 'Tap a seat'}
                        </p>
                      </div>
                    </div>

                    {roundTableSeats.map((seat) => (
                      <div
                        key={`seat-${seat.id}`}
                        className="absolute"
                        style={{
                          left: `calc(50% + ${seat.x}px)`,
                          top: `calc(50% + ${seat.y}px)`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedSpeakerId(seat.id)}
                          className={`relative w-11 h-11 rounded-full border-2 border-white text-white text-[11px] font-bold shadow-md transition-all hover:scale-105 ${
                            seat.isCurrent ? 'scale-110 ring-2 ring-[#D4420A]/45 ring-offset-2 ring-offset-[#F4ECE0]' : ''
                          } ${
                            seat.isSelected && !seat.isCurrent
                              ? 'ring-2 ring-[#1E5F74]/45 ring-offset-2 ring-offset-[#F4ECE0]'
                              : ''
                          }`}
                          style={{ backgroundColor: seat.color }}
                          title={`Seat: ${seat.name}`}
                        >
                          {getInitials(seat.name)}

                          {seat.averageLabel ? (
                            <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-white border border-[#18170F]/10 text-[9px] font-semibold text-[#18170F]/75">
                              {seat.averageLabel}
                            </span>
                          ) : null}

                          {seat.isCurrent ? (
                            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-[#D4420A] text-white text-[9px] font-semibold uppercase tracking-wider">
                              Live
                            </span>
                          ) : null}
                        </button>

                        <p className="mt-1 text-[10px] font-semibold text-[#18170F]/70 text-center max-w-[90px] truncate">
                          {seat.name}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="mt-2 text-[11px] text-[#18170F]/60">
                    Interactive round table view. Click a seat to quickly target scoring.
                    {roundTableOverflowCount > 0
                      ? ` +${roundTableOverflowCount} more participant${roundTableOverflowCount === 1 ? '' : 's'} shown in queue.`
                      : ''}
                  </p>
                </>
              )}
            </section>

            {speakerLeaderboard.length > 0 ? (
              <section className="bg-white border border-[#18170F]/10 rounded-2xl p-3 sm:p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[14px] font-semibold text-[#18170F]">Performance Pulse</h3>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[#1E5F74]/10 text-[#1E5F74]">
                    Live ranking
                  </span>
                </div>

                <div className="space-y-2">
                  {speakerLeaderboard.map((entry, index) => (
                    <article
                      key={`rank-${entry.userId}`}
                      className="p-2.5 rounded-lg bg-[#F8F5F1] border border-[#18170F]/8"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-semibold text-[#18170F] truncate">
                          #{index + 1} {entry.name}
                        </p>
                        <span className="text-[11px] font-semibold text-[#1E5F74]">{entry.averageLabel}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-[#18170F]/10 overflow-hidden">
                        <div
                          className="h-full bg-[#2A7A4B]"
                          style={{ width: `${entry.averagePercent}%` }}
                        />
                      </div>
                    </article>
                  ))}
                </div>

                {scoreInsights.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {scoreInsights.map((insight) => (
                      <span
                        key={insight}
                        className="px-2 py-1 rounded bg-[#18170F]/7 text-[11px] text-[#18170F]/75"
                      >
                        {insight}
                      </span>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            {canViewSummary && summary ? (
              <section className="bg-white border border-[#18170F]/10 rounded-2xl p-3 sm:p-4 shadow-sm">
                <h3 className="text-[14px] font-semibold text-[#18170F] mb-2">GD Summary</h3>
                <pre className="whitespace-pre-wrap text-[13px] text-[#18170F]/80 leading-relaxed font-body">
                  {summary}
                </pre>
              </section>
            ) : null}

            {!canViewSummary && !isActive && speakers.length > 0 ? (
              <section className="bg-white border border-[#18170F]/10 rounded-2xl p-3 sm:p-4 shadow-sm">
                <h3 className="text-[14px] font-semibold text-[#18170F] mb-1">GD Summary</h3>
                <p className="text-[12px] text-[#18170F]/65">
                  Round analysis is visible only to the host.
                </p>
              </section>
            ) : null}
          </section>

          {showPanel ? (
            <aside className="bg-white border border-[#18170F]/10 rounded-2xl p-3 sm:p-4 shadow-sm h-fit xl:sticky xl:top-4">
              <section>
                <h3 className="text-[13px] font-semibold text-[#18170F] mb-2">Live Scoring</h3>

                {canModerate ? (
                  <>
                    <select
                      value={selectedSpeakerId}
                      onChange={(event) => setSelectedSpeakerId(event.target.value)}
                      className="w-full mb-3 px-3 py-2 rounded-lg border border-[#18170F]/15 text-[13px] text-[#18170F] focus:border-[#D4420A]/40 outline-none bg-white"
                    >
                      <option value="">Select speaker</option>
                      {speakers.map((speaker) => (
                        <option key={speaker.userId} value={speaker.userId}>
                          {speaker.name}
                        </option>
                      ))}
                    </select>

                    {SCORE_FIELDS.map((field) => (
                      <div key={field.key} className="mb-3 last:mb-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] font-semibold text-[#18170F]/75">{field.label}</span>
                          <span className="text-[12px] text-[#D4420A] font-semibold">{scoreDraft[field.key]}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="1"
                          value={scoreDraft[field.key]}
                          onChange={(event) =>
                            setScoreDraft((previous) => ({
                              ...previous,
                              [field.key]: Number(event.target.value),
                            }))
                          }
                          className="w-full accent-[#D4420A]"
                        />
                      </div>
                    ))}

                    <button
                      onClick={handleSubmitScore}
                      disabled={isMutating || !selectedScoreTarget}
                      className="w-full mt-3 px-3 py-2 rounded-lg bg-[#D4420A] text-white text-[12px] font-semibold hover:bg-[#B33508] disabled:opacity-60"
                    >
                      Submit Score
                    </button>

                    {selectedScoreTarget ? (
                      <p className="mt-2 text-[11px] text-[#18170F]/55">
                        Scoring: {selectedScoreTarget.name}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-[12px] text-[#18170F]/55 p-3 rounded-lg bg-[#F8F5F1] border border-[#18170F]/8">
                    Live scoring controls are available to host and moderators only.
                  </p>
                )}
              </section>

              <section className="mt-4">
                <h3 className="text-[13px] font-semibold text-[#18170F] mb-2">Saved Scores</h3>
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {Object.keys(scores || {}).length === 0 ? (
                    <p className="text-[12px] text-[#18170F]/55">No scores submitted yet.</p>
                  ) : null}

                  {Object.entries(scores || {}).map(([speakerUserId, scoreObj]) => {
                    const speaker = speakers.find((item) => item.userId === speakerUserId)
                    return (
                      <article
                        key={speakerUserId}
                        className="p-2.5 rounded-lg bg-[#F8F5F1] border border-[#18170F]/8"
                      >
                        <p className="text-[12px] font-semibold text-[#18170F] truncate">
                          {speaker?.name || speakerUserId}
                        </p>
                        <p className="text-[11px] text-[#18170F]/60 mt-1 break-words">
                          {Object.entries(scoreObj)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(', ')}
                        </p>
                      </article>
                    )
                  })}
                </div>
              </section>

              <section className="mt-4">
                <h3 className="text-[13px] font-semibold text-[#18170F] mb-2">Coach Prompts</h3>
                <div className="space-y-2">
                  {coachPrompts.map((prompt) => (
                    <p
                      key={prompt}
                      className="text-[12px] text-[#18170F]/75 p-2.5 rounded-lg bg-[#F8F5F1] border border-[#18170F]/8"
                    >
                      {prompt}
                    </p>
                  ))}
                </div>
              </section>
            </aside>
          ) : null}
        </div>
      </main>
    </div>
  )
}

export default GdRound