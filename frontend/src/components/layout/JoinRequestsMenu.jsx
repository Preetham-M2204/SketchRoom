const JoinRequestsMenu = ({
  joinRequests = [],
  isOpen = false,
  isLoading = false,
  actingUserId = '',
  onToggle,
  onApprove,
  onReject,
}) => {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="px-3 py-1.5 rounded-md bg-[#EDE9E0]/10 text-[#EDE9E0] text-[12px] font-semibold hover:bg-[#EDE9E0]/18"
      >
        Requests ({joinRequests.length})
      </button>

      {isOpen ? (
        <div className="absolute right-0 mt-2 w-[340px] max-w-[92vw] rounded-xl border border-[#18170F]/12 bg-white shadow-2xl p-3 z-[140]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[13px] font-semibold text-[#18170F]">Pending Join Requests</h3>
            <span className="text-[11px] text-[#18170F]/55">{joinRequests.length}</span>
          </div>

          {isLoading ? (
            <p className="text-[12px] text-[#18170F]/55">Refreshing requests...</p>
          ) : null}

          {!isLoading && joinRequests.length === 0 ? (
            <p className="text-[12px] text-[#18170F]/55">No one is waiting right now.</p>
          ) : null}

          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {joinRequests.map((request) => {
              const busy = actingUserId === request.userId

              return (
                <article
                  key={request.userId}
                  className="p-2.5 rounded-lg border border-[#18170F]/8 bg-[#F8F5F1]"
                >
                  <p className="text-[12px] font-semibold text-[#18170F] truncate">{request.name}</p>
                  <p className="text-[11px] text-[#18170F]/55 truncate">
                    {request.email || 'No email provided'}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onApprove?.(request.userId)}
                      disabled={busy}
                      className="px-2.5 py-1 rounded bg-[#2A7A4B] text-white text-[11px] font-semibold hover:bg-[#22623D] disabled:opacity-60"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => onReject?.(request.userId)}
                      disabled={busy}
                      className="px-2.5 py-1 rounded bg-[#C0392B]/90 text-white text-[11px] font-semibold hover:bg-[#A93226] disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default JoinRequestsMenu
