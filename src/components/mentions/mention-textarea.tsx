"use client";

import React, { useState, useEffect, useRef } from "react";
import { Lock, User, AtSign } from "lucide-react";
import {
  fetchFrequencyMentionableMembers,
  filterMentionSuggestions,
  MentionMember,
} from "@/lib/api/mentions";
import { cn } from "@/lib/utils";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onEnterSubmit?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  frequencyId?: string | null;
  className?: string;
  rows?: number;
  disabled?: boolean;
}

export function MentionTextarea({
  value,
  onChange,
  onEnterSubmit,
  onKeyDown,
  placeholder = "What's on your mind? Type @ to mention a member...",
  frequencyId,
  className,
  rows = 4,
  disabled = false,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [members, setMembers] = useState<MentionMember[]>([]);
  const [isPrivateFrequency, setIsPrivateFrequency] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Load mentionable members when frequencyId changes
  useEffect(() => {
    async function loadMembers() {
      if (!frequencyId) {
        setMembers([]);
        setIsPrivateFrequency(false);
        return;
      }
      const data = await fetchFrequencyMentionableMembers(frequencyId);
      setMembers(data.members);
      setIsPrivateFrequency(data.isPrivate);
    }
    loadMembers();
  }, [frequencyId]);

  // Handle textarea text changes and detect '@'
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(text);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);

    // Find the last '@' that is either at the beginning or preceded by whitespace
    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_.-]*)$/);

    if (match) {
      const query = match[1];
      const matchIndex = textBeforeCursor.lastIndexOf("@");
      setMentionStartIndex(matchIndex);
      setMentionQuery(query);
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
      setMentionStartIndex(null);
    }
  };

  const filteredMembers = filterMentionSuggestions(members, mentionQuery);

  const insertMention = (member: MentionMember) => {
    if (mentionStartIndex === null || !textareaRef.current) return;

    const text = value;
    const cursorPos = textareaRef.current.selectionStart || text.length;

    const beforeMention = text.substring(0, mentionStartIndex);
    const afterMention = text.substring(cursorPos);

    const mentionTag = `@${member.username} `;
    const newText = `${beforeMention}${mentionTag}${afterMention}`;

    onChange(newText);
    setShowSuggestions(false);
    setMentionStartIndex(null);

    // Focus and set cursor position after inserted mention
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = beforeMention.length + mentionTag.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredMembers.length);
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredMembers[selectedIndex]);
        return;
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey && onEnterSubmit) {
      e.preventDefault();
      onEnterSubmit();
      return;
    }

    onKeyDown?.(e);
  };

  // Close suggestions if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "w-full resize-none outline-none text-[15px] text-gray-800 placeholder-gray-400 bg-transparent transition",
          className
        )}
      />

      {/* Autocomplete Suggestions Popup */}
      {showSuggestions && (
        <div className="absolute left-0 bottom-full mb-2 w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Header */}
          <div className="px-3.5 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
            <div className="flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5 text-blue-600" />
              <span>Mention group member</span>
            </div>
            {isPrivateFrequency && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <Lock className="w-2.5 h-2.5" />
                Active members only
              </span>
            )}
          </div>

          {/* Members List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member, index) => (
                <button
                  key={member.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(member);
                  }}
                  className={cn(
                    "w-full px-3.5 py-2.5 flex items-center justify-between text-left transition cursor-pointer group",
                    index === selectedIndex
                      ? "bg-blue-50/80 text-blue-900"
                      : "hover:bg-gray-50 text-gray-900"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as any).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                            member.name
                          )}`;
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate leading-tight">
                        {member.name}
                      </p>
                      <p className="text-[11px] text-gray-400 group-hover:text-blue-600 truncate leading-tight">
                        @{member.username}
                      </p>
                    </div>
                  </div>

                  {member.groupRole && (
                    <span className="text-[10px] font-semibold text-gray-400 capitalize shrink-0 ml-2">
                      {member.groupRole}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-gray-400">
                {isPrivateFrequency
                  ? "No active group members found matching this handle."
                  : "No members found."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
