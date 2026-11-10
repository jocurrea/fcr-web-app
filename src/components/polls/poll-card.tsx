"use client";

import { useState, useEffect } from "react";
import { Check, Clock, BarChart2 } from "lucide-react";
import { PollData, formatPollTimeRemaining, voteOnPoll, getPollVoteState } from "@/lib/api/polls";

interface PollCardProps {
  postId: string;
  initialPoll: PollData;
  currentUserId?: string | null;
}

export function PollCard({ postId, initialPoll, currentUserId }: PollCardProps) {
  const [poll, setPoll] = useState<PollData>(initialPoll);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync vote stats from server/Supabase
  useEffect(() => {
    let isMounted = true;
    async function syncVotes() {
      if (!postId) return;
      const state = await getPollVoteState(postId, initialPoll, currentUserId);
      if (isMounted) {
        setPoll(state);
      }
    }
    syncVotes();
    return () => {
      isMounted = false;
    };
  }, [postId, initialPoll, currentUserId]);

  const { text: timeRemaining, isExpired } = formatPollTimeRemaining(poll.expiresAt);
  const hasVoted = poll.userVotedOptionId !== null && poll.userVotedOptionId !== undefined;
  // HU-07 Acceptance Criteria 4: Voting Privacy: Live results & percentages are hidden until user votes (or poll expires)
  const showResults = hasVoted || isExpired;

  const handleVote = async (optionId: number) => {
    if (hasVoted || isExpired || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    // Optimistic UI update
    const previousState = { ...poll };
    const optimisticOptions = poll.options.map((opt) => {
      const isSelected = opt.id === optionId;
      const newCount = (opt.votesCount || 0) + (isSelected ? 1 : 0);
      return {
        ...opt,
        votesCount: newCount,
      };
    });
    const newTotal = (poll.totalVotes || 0) + 1;
    const optimisticPoll: PollData = {
      ...poll,
      userVotedOptionId: optionId,
      totalVotes: newTotal,
      options: optimisticOptions.map((o) => ({
        ...o,
        percentage: newTotal > 0 ? Math.round(((o.votesCount || 0) / newTotal) * 100) : 0,
      })),
    };
    setPoll(optimisticPoll);

    try {
      const result = await voteOnPoll(postId, optionId, poll);
      if (result.success && result.updatedPoll) {
        setPoll(result.updatedPoll);
      } else if (!result.success) {
        setPoll(previousState);
        setError(result.error || "Failed to submit vote. Please try again.");
      }
    } catch (e: any) {
      setPoll(previousState);
      setError(e?.message || "Error submitting vote.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalVotes = poll.totalVotes || 0;

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
          <span>{timeRemaining}</span>
        </div>
      </div>

      {/* Options List */}
      <div className="flex flex-col gap-2.5">
        {poll.options.map((option) => {
          const isUserChoice = poll.userVotedOptionId === option.id;
          const percentage = option.percentage || 0;

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
                  <span className={`text-sm break-words ${isUserChoice ? "text-blue-900 font-medium" : "text-gray-800"}`}>
                    {option.text}
                  </span>
                </div>

                {/* Percentage & Vote Count */}
                <div className="relative z-10 flex items-baseline gap-1.5 shrink-0 pl-2">
                  <span className={`text-sm font-bold ${isUserChoice ? "text-blue-600" : "text-gray-700"}`}>
                    {percentage}%
                  </span>
                  <span className="text-[11px] text-gray-400">
                    ({option.votesCount || 0})
                  </span>
                </div>
              </div>
            );
          }

          // Voting Mode (Options clickable, results hidden)
          return (
            <button
              key={option.id}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleVote(option.id)}
              className="w-full text-left p-3.5 rounded-xl border border-blue-200/80 bg-white hover:bg-blue-50/50 hover:border-blue-400 active:scale-[0.99] transition-all flex items-center justify-between group cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-gray-300 group-hover:border-blue-600 flex items-center justify-center transition-colors" />
                <span className="text-sm font-medium text-gray-800 group-hover:text-blue-900">
                  {option.text}
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
        <div className="mt-2 text-xs text-red-600 font-medium bg-red-50 p-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-200/60 text-xs text-gray-500">
        <span>
          {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        </span>
        {hasVoted ? (
          <span className="text-blue-600 font-medium flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Vote recorded
          </span>
        ) : (
          <span className="text-gray-400">Select an option to vote</span>
        )}
      </div>
    </div>
  );
}

