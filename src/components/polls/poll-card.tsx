"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Clock, BarChart2, Loader2, AlertCircle } from "lucide-react";
import {
  PollView,
  PollData,
  formatPollTimeRemaining,
  votePostPoll,
  getPostPolls,
  voteOnPoll,
} from "@/lib/api/polls";
import { supabase } from "@/lib/supabase";

interface PollCardProps {
  postId: string;
  initialPoll: PollView | PollData;
  currentUserId?: string | null;
}

function normalizeToPollView(p: PollView | PollData, postId: string): PollView {
  // If already full PollView
  if (
    "duration_hours" in p &&
    p.duration_hours !== undefined &&
    Array.isArray(p.options) &&
    p.options.length > 0 &&
    "label" in p.options[0]
  ) {
    return p as PollView;
  }

  // Legacy PollData conversion
  const legacy = p as PollData;
  const totalVotes = legacy.total_votes ?? legacy.totalVotes ?? 0;
  const isExpired =
    legacy.is_closed ??
    legacy.isExpired ??
    (legacy.expiresAt ? new Date(legacy.expiresAt).getTime() <= Date.now() : false);
  const selectedOptionId = legacy.selected_option_id
    ? String(legacy.selected_option_id)
    : legacy.userVotedOptionId
    ? String(legacy.userVotedOptionId)
    : null;
  const resultsVisible = legacy.results_visible ?? (selectedOptionId !== null || isExpired);

  return {
    post_id: String(legacy.post_id || postId),
    duration_hours: (legacy.duration_hours ||
      (legacy.duration === "3d" ? 72 : legacy.duration === "7d" ? 168 : 24)) as 24 | 72 | 168,
    created_at: legacy.created_at || legacy.createdAt || new Date().toISOString(),
    ends_at:
      legacy.ends_at ||
      legacy.expiresAt ||
      new Date(Date.now() + 24 * 3600000).toISOString(),
    server_time: new Date().toISOString(),
    is_closed: isExpired,
    can_vote: !selectedOptionId && !isExpired,
    selected_option_id: selectedOptionId,
    results_visible: resultsVisible,
    total_votes: totalVotes,
    options: (legacy.options || []).map((opt: any, idx: number) => {
      const optId = String(opt.id || idx + 1);
      const label = opt.label || opt.text || `Option ${idx + 1}`;
      const votes = resultsVisible ? (opt.votesCount ?? opt.votes ?? null) : null;
      const percentage = resultsVisible ? (opt.percentage ?? null) : null;
      return {
        id: optId,
        position: opt.position || idx + 1,
        label,
        votes,
        percentage,
      };
    }),
  };
}

export function PollCard({ postId, initialPoll, currentUserId }: PollCardProps) {
  const [poll, setPoll] = useState<PollView>(() => normalizeToPollView(initialPoll, postId));
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef(poll);
  pollRef.current = poll;

  // Realtime Broadcast Channel & Hydration
  useEffect(() => {
    let isMounted = true;
    let channel: any = null;

    async function setupRealtimeAndSync() {
      if (!postId) return;

      // 1. Initial hydration via RPC get_post_polls
      try {
        const freshPolls = await getPostPolls([postId]);
        if (isMounted && freshPolls && freshPolls.length > 0) {
          setPoll(freshPolls[0]);
        }
      } catch (err) {
        console.warn("[PollCard] Initial hydration error:", err);
      }

      // 2. Subscribe to private broadcast channel: poll:post:<postId>
      // Migration 090: Both voted and unvoted viewers subscribe
      try {
        await supabase.realtime.setAuth();

        channel = supabase
          .channel(`poll:post:${postId}`, { config: { private: true } })
          .on("broadcast", { event: "poll_changed" }, async () => {
            // Invalidation hint received; refresh authorized poll projection
            const updated = await getPostPolls([postId]);
            if (isMounted && updated && updated.length > 0) {
              setPoll(updated[0]);
            }
          })
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              getPostPolls([postId]).then((res) => {
                if (isMounted && res && res.length > 0) {
                  setPoll(res[0]);
                }
              });
            }
          });
      } catch (err) {
        console.warn("[PollCard] Realtime subscription error:", err);
      }
    }

    setupRealtimeAndSync();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [postId]);

  // Server-relative remaining time calculation
  const { text: timeRemaining, isExpired } = formatPollTimeRemaining(
    poll.ends_at,
    poll.server_time
  );

  const hasVoted = Boolean(poll.selected_option_id);
  const showResults = poll.results_visible || hasVoted || isExpired || poll.is_closed;

  const handleVote = async (optionId: string) => {
    if (poll.selected_option_id || isExpired || poll.is_closed || isSubmitting) return;

    setIsSubmitting(true);
    setPendingOptionId(optionId);
    setError(null);

    // Optimistic UI: immediately highlight selection and show breakdown
    const prevPoll = { ...poll };
    const optTotal = (poll.total_votes || 0) + 1;
    const optOptions = poll.options.map((opt) => {
      const isChosen = String(opt.id) === String(optionId);
      const prevCount = opt.votes ?? 0;
      const newVotes = prevCount + (isChosen ? 1 : 0);
      return {
        ...opt,
        votes: newVotes,
        percentage: optTotal > 0 ? Math.round((newVotes / optTotal) * 100) : 0,
      };
    });

    setPoll({
      ...poll,
      selected_option_id: optionId,
      can_vote: false,
      results_visible: true,
      total_votes: optTotal,
      options: optOptions,
    });

    try {
      // 1. Try official RPC vote_post_poll
      const res = await votePostPoll(postId, optionId);
      if (res.success && res.data) {
        setPoll(res.data);
      } else {
        // 2. Fallback vote for legacy posts
        const optNum = parseInt(optionId, 10);
        const fallbackRes = await voteOnPoll(
          postId,
          isNaN(optNum) ? optionId : optNum,
          poll as any
        );
        if (fallbackRes.success && fallbackRes.updatedPoll) {
          setPoll(normalizeToPollView(fallbackRes.updatedPoll, postId));
        } else {
          setPoll(prevPoll);
          setError(res.error || fallbackRes.error || "Failed to submit vote. Please try again.");
        }
      }
    } catch (err: any) {
      setPoll(prevPoll);
      setError(err?.message || "Failed to submit vote.");
    } finally {
      setIsSubmitting(false);
      setPendingOptionId(null);
    }
  };

  const totalVotes = poll.total_votes ?? 0;

  return (
    <div className="w-full bg-gray-50/80 border border-gray-200/90 rounded-2xl p-4 my-3 transition-all select-none">
      {/* Poll Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Poll</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span>{poll.is_closed ? "Poll ended" : timeRemaining}</span>
        </div>
      </div>

      {/* Options List */}
      <div className="flex flex-col gap-2.5">
        {poll.options.map((option) => {
          const isUserChoice = String(poll.selected_option_id) === String(option.id);
          const isPending = pendingOptionId === String(option.id);
          const percentage = option.percentage !== null && option.percentage !== undefined ? option.percentage : 0;
          const votesCount = option.votes !== null && option.votes !== undefined ? option.votes : 0;

          if (showResults) {
            // Results Mode (Visible only after voting or after expiration)
            return (
              <div
                key={option.id}
                className={`relative overflow-hidden rounded-xl border p-3 flex items-center justify-between transition-all ${
                  isUserChoice
                    ? "border-blue-500 bg-blue-50/40 font-semibold"
                    : "border-gray-200 bg-white"
                }`}
              >
                {/* Background Progress Bar Fill */}
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out ${
                    isUserChoice ? "bg-blue-200/50" : "bg-gray-100/90"
                  }`}
                  style={{ width: `${percentage}%` }}
                />

                {/* Option Content */}
                <div className="relative z-10 flex items-center gap-2 max-w-[75%] pr-2">
                  {isUserChoice && (
                    <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                  <span
                    className={`text-sm break-words ${
                      isUserChoice ? "text-blue-900 font-medium" : "text-gray-800"
                    }`}
                  >
                    {option.label}
                  </span>
                </div>

                {/* Percentage & Vote Count */}
                <div className="relative z-10 flex items-baseline gap-1.5 shrink-0 pl-2">
                  <span
                    className={`text-sm font-bold ${
                      isUserChoice ? "text-blue-600" : "text-gray-700"
                    }`}
                  >
                    {percentage}%
                  </span>
                  <span className="text-[11px] text-gray-400">({votesCount})</span>
                </div>
              </div>
            );
          }

          // Voting Mode (Labels only, clickable until voted or expired)
          return (
            <button
              key={option.id}
              type="button"
              disabled={Boolean(poll.selected_option_id || isExpired || poll.is_closed || isSubmitting)}
              onClick={() => handleVote(String(option.id))}
              className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between group cursor-pointer shadow-xs ${
                isPending
                  ? "border-blue-500 bg-blue-50/50"
                  : "border-blue-200/80 bg-white hover:bg-blue-50/50 hover:border-blue-400 active:scale-[0.99]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-gray-300 group-hover:border-blue-600 flex items-center justify-center transition-colors">
                  {isPending && <Loader2 className="w-3 h-3 animate-spin text-blue-600" />}
                </div>
                <span className="text-sm font-medium text-gray-800 group-hover:text-blue-900">
                  {option.label}
                </span>
              </div>
              <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 font-semibold transition-opacity">
                Vote
              </span>
            </button>
          );
        })}
      </div>

      {/* Error Notice */}
      {error && (
        <div className="mt-2 text-xs text-red-600 font-medium bg-red-50 p-2 rounded-lg flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Footer Info: Migration 090 - ALWAYS DISPLAY TOTAL VOTES */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-200/60 text-xs text-gray-500">
        <span className="font-medium text-gray-600">
          {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        </span>
        {hasVoted ? (
          <span className="text-blue-600 font-medium flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Vote recorded
          </span>
        ) : poll.is_closed ? (
          <span className="text-gray-400">Final results</span>
        ) : poll.can_vote ? (
          <span className="text-gray-400">Select an option to vote</span>
        ) : (
          <span className="text-gray-400">Voting closed</span>
        )}
      </div>
    </div>
  );
}
