import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildRoomShareLink, copyTextToClipboard, isLocalShareOrigin } from '../../api/rooms'
import useDecision from '../../hooks/useDecision'
import useRoomStore from '../../stores/useRoomStore'
import { toast } from '../ui/Toast'
import JoinRequestsMenu from '../layout/JoinRequestsMenu'

const PHASES = [
  { id: 'brainstorm', label: 'Brainstorm' },
  { id: 'voting', label: 'Voting' },
  { id: 'analysis', label: 'Analysis' },
]

const ITEM_TYPE_OPTIONS = [
  { value: 'strength', label: 'Strength' },
  { value: 'weakness', label: 'Weakness' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'threat', label: 'Threat' },
  { value: 'pro', label: 'Pro' },
  { value: 'con', label: 'Con' },
  { value: 'idea', label: 'Idea' },
  { value: 'question', label: 'Question' },
]

const TYPE_UI = {
  strength: { label: 'Strengths', chip: 'bg-[#2A7A4B]/10 text-[#2A7A4B]' },
  weakness: { label: 'Weaknesses', chip: 'bg-[#D4420A]/10 text-[#D4420A]' },
  opportunity: { label: 'Opportunities', chip: 'bg-[#1E5F74]/10 text-[#1E5F74]' },
  threat: { label: 'Threats', chip: 'bg-[#C0392B]/10 text-[#C0392B]' },
  pro: { label: 'Pros', chip: 'bg-[#2A7A4B]/10 text-[#2A7A4B]' },
  con: { label: 'Cons', chip: 'bg-[#D4420A]/10 text-[#D4420A]' },
  idea: { label: 'Ideas', chip: 'bg-[#8E44AD]/10 text-[#8E44AD]' },
  question: { label: 'Questions', chip: 'bg-[#C4871A]/10 text-[#C4871A]' },
  other: { label: 'Other', chip: 'bg-[#18170F]/8 text-[#18170F]/70' },
}

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

const DecisionBoard = ({ socket, roomId, userId, room, requestsMenu = null }) => {
  const navigate = useNavigate()
  const {
    phase,
    items,
    analysis,
    isLoading,
    isMutating,
    addItem,
    removeItem,
    vote,
    changePhase,
  } = useDecision(socket, roomId)

  const members = useRoomStore((state) => state.members)
  const messages = useRoomStore((state) => state.messages)

  const [text, setText] = useState('')
  const [itemType, setItemType] = useState('idea')
  const [chatMessage, setChatMessage] = useState('')
  const [showDiscussion, setShowDiscussion] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 1024
  })

  const isHost = room?.owner?.id === userId

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

    if (userId) {
      const normalizedUserId = String(userId)
      if (!map.has(normalizedUserId)) {
        map.set(normalizedUserId, {
          id: normalizedUserId,
          name: 'You',
        })
      }
    }

    return Array.from(map.values())
  }, [room?.members, members, userId])

  const groupedItems = useMemo(() => {
    return items.reduce((groups, item) => {
      const key = TYPE_UI[item.type] ? item.type : 'other'
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(item)
      return groups
    }, {})
  }, [items])

  const orderedGroupKeys = useMemo(() => {
    const preferred = ['strength', 'weakness', 'opportunity', 'threat', 'pro', 'con', 'idea', 'question', 'other']
    return preferred.filter((key) => groupedItems[key]?.length)
  }, [groupedItems])

  const recentMessages = useMemo(() => {
    return (messages || []).slice(-40)
  }, [messages])

  const handleAddItem = async (event) => {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    try {
      await addItem({
        text: trimmed,
        type: itemType,
      })
      setText('')
    } catch {
      // Error toasts handled in hook.
    }
  }

  const handlePhaseChange = async (nextPhase) => {
    if (nextPhase === phase) return
    try {
      await changePhase(nextPhase)
    } catch {
      // Error toasts handled in hook.
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

    const shareText = `Join my SketchRoom decision room\nRoom: ${roomUrl}${roomCode ? `\nRoom code: ${roomCode}` : ''}\nAdmins need to approve join requests.${localOriginTip}`

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
              {room?.name || 'Decision Room'}
            </h1>
            <p className="text-[11px] text-[#EDE9E0]/55 truncate">
              Backend-driven decision workflow
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowDiscussion((previous) => !previous)}
            className="lg:hidden px-2.5 py-1.5 rounded-md bg-[#EDE9E0]/10 text-[#EDE9E0] text-[11px] font-semibold"
          >
            {showDiscussion ? 'Hide Chat' : 'Discussion'}
          </button>

          {requestsMenu ? <JoinRequestsMenu {...requestsMenu} /> : null}

          <span className="hidden sm:inline text-[11px] px-2 py-1 rounded bg-[#EDE9E0]/10 text-[#EDE9E0]/85">
            {participantList.length} participants
          </span>

          <button
            onClick={handleShare}
            className={`px-3 py-1.5 rounded-md text-[12px] font-semibold text-white ${
              isHost ? 'bg-[#D4420A] hover:bg-[#B33508]' : 'bg-[#8B8178]'
            }`}
          >
            {isHost ? 'Share' : 'Invite Locked'}
          </button>

          <span className="text-[11px] px-2 py-1 rounded bg-[#D4420A]/20 text-[#FDE7DC] uppercase tracking-wider font-semibold">
            {phase}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-5">
        <div className={`grid gap-4 ${showDiscussion ? 'xl:grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-1'}`}>
          <section className="min-w-0">
            <section className="bg-white border border-[#18170F]/10 rounded-2xl p-3 sm:p-4 shadow-sm mb-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {PHASES.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => handlePhaseChange(entry.id)}
                    disabled={isMutating}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors ${
                      phase === entry.id
                        ? 'bg-[#D4420A] text-white'
                        : 'bg-[#18170F]/6 text-[#18170F]/70 hover:bg-[#18170F]/10'
                    }`}
                  >
                    {entry.label}
                  </button>
                ))}

                <span className="ml-auto hidden sm:inline text-[11px] text-[#18170F]/45 whitespace-nowrap">
                  {items.length} item{items.length === 1 ? '' : 's'}
                </span>
              </div>
            </section>

            <section className="bg-white border border-[#18170F]/10 rounded-2xl p-3 sm:p-4 shadow-sm mb-4">
              <form className="grid grid-cols-1 sm:grid-cols-[1fr_170px_auto] gap-2" onSubmit={handleAddItem}>
                <input
                  type="text"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Add a new decision point..."
                  className="w-full px-3 py-2 rounded-lg border border-[#18170F]/15 text-[14px] text-[#18170F] placeholder:text-[#18170F]/35 focus:border-[#D4420A]/40 outline-none"
                />

                <select
                  value={itemType}
                  onChange={(event) => setItemType(event.target.value)}
                  className="px-3 py-2 rounded-lg border border-[#18170F]/15 text-[14px] text-[#18170F] focus:border-[#D4420A]/40 outline-none bg-white"
                >
                  {ITEM_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={!text.trim() || isMutating}
                  className="px-4 py-2 rounded-lg bg-[#D4420A] text-white text-[13px] font-semibold hover:bg-[#B33508] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </form>
            </section>

            {isLoading ? (
              <div className="bg-white border border-[#18170F]/10 rounded-2xl p-8 text-center text-[#18170F]/60">
                Loading decision state...
              </div>
            ) : null}

            {!isLoading && orderedGroupKeys.length === 0 ? (
              <div className="bg-white border border-[#18170F]/10 rounded-2xl p-8 text-center">
                <h3 className="text-[16px] font-semibold text-[#18170F] mb-2">No decision inputs yet</h3>
                <p className="text-[13px] text-[#18170F]/60">
                  Start by adding strengths, risks, pros, or open questions.
                </p>
              </div>
            ) : null}

            {!isLoading && orderedGroupKeys.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {orderedGroupKeys.map((groupKey) => {
                  const style = TYPE_UI[groupKey] || TYPE_UI.other

                  return (
                    <section
                      key={groupKey}
                      className="bg-white border border-[#18170F]/10 rounded-2xl p-3 sm:p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold ${style.chip}`}>
                          {style.label}
                        </span>
                        <span className="text-[11px] text-[#18170F]/45">
                          {groupedItems[groupKey].length} item{groupedItems[groupKey].length === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {groupedItems[groupKey].map((item) => {
                          const hasVoted = item.votes?.includes(userId)

                          return (
                            <article
                              key={item.id}
                              className="border border-[#18170F]/10 rounded-xl p-3 bg-[#FDFCF9]"
                            >
                              <p className="text-[13px] text-[#18170F] leading-relaxed">{item.text}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <button
                                  onClick={() => vote(item.id)}
                                  disabled={isMutating || hasVoted}
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                    hasVoted
                                      ? 'bg-[#2A7A4B]/15 text-[#2A7A4B]'
                                      : 'bg-[#18170F]/8 text-[#18170F]/75 hover:bg-[#18170F]/14'
                                  } disabled:opacity-70`}
                                >
                                  {hasVoted ? 'Voted' : 'Vote'} ({item.votes?.length || 0})
                                </button>

                                <button
                                  onClick={() => removeItem(item.id)}
                                  disabled={isMutating}
                                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#C0392B]/10 text-[#C0392B] hover:bg-[#C0392B]/16 disabled:opacity-70"
                                >
                                  Remove
                                </button>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </section>
                  )
                })}
              </div>
            ) : null}

            {phase === 'analysis' ? (
              <section className="mt-4 bg-white border border-[#18170F]/10 rounded-2xl p-4 shadow-sm">
                <h3 className="text-[14px] font-semibold text-[#18170F] mb-2">Decision Analysis</h3>
                <pre className="whitespace-pre-wrap text-[13px] text-[#18170F]/80 leading-relaxed font-body">
                  {analysis || 'No analysis yet. Move to analysis phase after adding items.'}
                </pre>
              </section>
            ) : null}
          </section>

          {showDiscussion ? (
            <aside className="bg-white border border-[#18170F]/10 rounded-2xl p-3 sm:p-4 shadow-sm h-fit xl:sticky xl:top-4">
              <section className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[13px] font-semibold text-[#18170F]">Participants</h3>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[#18170F]/7 text-[#18170F]/65">
                    {participantList.length}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                  {participantList.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#F8F5F1] border border-[#18170F]/6"
                    >
                      <span className="text-[12px] text-[#18170F] truncate">{participant.name}</span>
                      {participant.id === String(userId) ? (
                        <span className="text-[10px] text-[#D4420A] font-semibold uppercase tracking-wider">You</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-[13px] font-semibold text-[#18170F] mb-2">Discussion</h3>

                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {recentMessages.length === 0 ? (
                    <p className="text-[12px] text-[#18170F]/55 p-3 rounded-lg bg-[#F8F5F1] border border-[#18170F]/8">
                      Start the conversation for this decision room.
                    </p>
                  ) : null}

                  {recentMessages.map((message, index) => (
                    <article
                      key={message.id || `${message.userId || 'user'}-${index}`}
                      className="p-2.5 rounded-lg bg-[#F8F5F1] border border-[#18170F]/8"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-semibold text-[#18170F] truncate">
                          {message.userName || 'Member'}
                        </span>
                        <span className="text-[10px] text-[#18170F]/45 shrink-0">
                          {formatMessageTime(message.timestamp)}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#18170F]/78 leading-relaxed break-words">{message.text}</p>
                    </article>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(event) => setChatMessage(event.target.value)}
                    placeholder="Send a message"
                    className="flex-1 px-3 py-2 rounded-lg border border-[#18170F]/15 text-[13px] text-[#18170F] placeholder:text-[#18170F]/35 focus:border-[#D4420A]/40 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!chatMessage.trim()}
                    className="px-3 py-2 rounded-lg bg-[#D4420A] text-white text-[12px] font-semibold hover:bg-[#B33508] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </form>
              </section>
            </aside>
          ) : null}
        </div>
      </main>
    </div>
  )
}

export default DecisionBoard