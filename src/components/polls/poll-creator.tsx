"use client";

import { Plus, X, BarChart2, Lock } from "lucide-react";
import { PollDuration } from "@/lib/api/polls";

export interface PollCreatorState {
  options: string[];
  duration: PollDuration;
}

interface PollCreatorProps {
  pollState: PollCreatorState;
  onChange: (state: PollCreatorState) => void;
  onRemove: () => void;
  isImmutable?: boolean;
}

export function PollCreator({ pollState, onChange, onRemove, isImmutable = false }: PollCreatorProps) {
  const { options, duration } = pollState;

  const handleOptionChange = (index: number, value: string) => {
    if (isImmutable) return;
    const next = [...options];
    next[index] = value;
    onChange({ ...pollState, options: next });
  };

  const handleAddOption = () => {
    if (isImmutable || options.length >= 4) return;
    onChange({ ...pollState, options: [...options, ""] });
  };

  const handleRemoveOption = (index: number) => {
    if (isImmutable || options.length <= 2) return;
    const next = options.filter((_, idx) => idx !== index);
    onChange({ ...pollState, options: next });
  };

  const handleDurationChange = (d: PollDuration) => {
    if (isImmutable) return;
    onChange({ ...pollState, duration: d });
  };

  return (
    <div className="w-full bg-blue-50/40 border border-blue-200/80 rounded-2xl p-4 my-2 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 leading-none">Feed Poll</h4>
            <span className="text-[11px] text-gray-500">2 to 4 options &bull; Mutually exclusive with media</span>
          </div>
        </div>

        {!isImmutable && (
          <button
            type="button"
            onClick={onRemove}
            className="w-7 h-7 rounded-full bg-gray-200/70 hover:bg-gray-300 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
            title="Remove poll"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* HU-07 Acceptance Criteria 3: Strict Immutability Notice if editing */}
      {isImmutable && (
        <div className="flex items-center gap-2 p-2.5 mb-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-800 text-xs">
          <Lock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
          <span>Poll options and duration are immutable once published to protect live voting.</span>
        </div>
      )}

      {/* Options Inputs (Min 2, Max 4) */}
      <div className="flex flex-col gap-2.5 mb-3">
        {options.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                disabled={isImmutable}
                value={opt}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                placeholder={`Option ${idx + 1}`}
                maxLength={60}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed shadow-xs"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">
                {opt.length}/60
              </span>
            </div>

            {/* Remove option button (only if > 2 options and not immutable) */}
            {!isImmutable && options.length > 2 && (
              <button
                type="button"
                onClick={() => handleRemoveOption(idx)}
                className="w-8 h-8 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                title="Remove option"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {/* Add option button (up to 4 options) */}
        {!isImmutable && options.length < 4 && (
          <button
            type="button"
            onClick={handleAddOption}
            className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-100/50 rounded-lg transition-colors cursor-pointer mt-0.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add option</span>
          </button>
        )}
      </div>

      {/* Duration Selector */}
      <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-600">Poll duration:</span>
        <div className="inline-flex rounded-lg p-0.5 bg-gray-200/60">
          {(["24h", "3d", "7d"] as PollDuration[]).map((d) => {
            const label = d === "24h" ? "24 hours" : d === "3d" ? "3 days" : "7 days";
            const isActive = duration === d;
            return (
              <button
                key={d}
                type="button"
                disabled={isImmutable}
                onClick={() => handleDurationChange(d)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-white text-blue-600 shadow-xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                } disabled:cursor-not-allowed`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

