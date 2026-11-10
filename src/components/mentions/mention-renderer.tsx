"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { fetchFrequencyMentionableMembers } from "@/lib/api/mentions";
import { cn } from "@/lib/utils";

interface MentionRendererProps {
  content: string;
  frequencyId?: string | null;
  isPrivateFrequency?: boolean;
  validMemberUsernames?: string[] | Set<string>;
  validMemberMap?: Map<string, string>; // handle -> userId
  className?: string;
}

/**
 * HU-04: External Mention Disabling
 * - Inside a Private Frequency: Only validated active group members are rendered as clickable mention links.
 * - External user handles typed manually render strictly as plain text (no clickable link, no metadata leaked).
 */
export function MentionRenderer({
  content,
  frequencyId,
  isPrivateFrequency: propIsPrivate,
  validMemberUsernames,
  validMemberMap: propMemberMap,
  className,
}: MentionRendererProps) {
  const [loadedMemberMap, setLoadedMemberMap] = useState<Map<string, string> | null>(null);
  const [loadedIsPrivate, setLoadedIsPrivate] = useState<boolean | null>(null);

  useEffect(() => {
    if (!frequencyId) return;
    let active = true;

    fetchFrequencyMentionableMembers(frequencyId)
      .then((data) => {
        if (!active) return;
        const map = new Map<string, string>();
        data.members.forEach((m) => {
          if (m.username) map.set(m.username.toLowerCase(), m.id);
        });
        setLoadedMemberMap(map);
        setLoadedIsPrivate(data.isPrivate);
      })
      .catch((err) => {
        console.error("Error loading frequency members for mention rendering:", err);
      });

    return () => {
      active = false;
    };
  }, [frequencyId]);

  const effectiveIsPrivate = propIsPrivate !== undefined ? propIsPrivate : (loadedIsPrivate ?? false);
  const effectiveMemberMap = propMemberMap || loadedMemberMap || undefined;

  const renderedElements = useMemo(() => {
    if (!content) return null;

    // Fast path: no '@' in text
    if (!content.includes("@")) {
      return content;
    }

    const validSet = new Set<string>();
    if (validMemberUsernames) {
      if (Array.isArray(validMemberUsernames)) {
        validMemberUsernames.forEach((u) => validSet.add(u.toLowerCase()));
      } else {
        validMemberUsernames.forEach((u) => validSet.add(u.toLowerCase()));
      }
    }

    if (effectiveMemberMap) {
      Array.from(effectiveMemberMap.keys()).forEach((k) => validSet.add(k.toLowerCase()));
    }

    // Regex to capture @mentions (e.g. @john_doe, @captain.smith)
    const regex = /(@[a-zA-Z0-9_.-]+)/g;
    const parts = content.split(regex);

    return parts.map((part, index) => {
      if (part.startsWith("@") && part.length > 1) {
        const rawHandle = part.substring(1);
        const lowerHandle = rawHandle.toLowerCase();

        if (effectiveIsPrivate) {
          // In a PRIVATE Frequency: ONLY active validated members become clickable links!
          const isValidMember = validSet.has(lowerHandle);
          const userId = effectiveMemberMap?.get(lowerHandle);

          if (isValidMember) {
            return (
              <Link
                key={index}
                href={userId ? `/profile/${userId}` : `/search?q=${encodeURIComponent(rawHandle)}`}
                onClick={(e) => e.stopPropagation()}
                className="text-blue-600 font-semibold hover:underline cursor-pointer"
                title={`Group member @${rawHandle}`}
              >
                {part}
              </Link>
            );
          }

          // External handle typed manually -> Render as plain text!
          return (
            <span key={index} className="text-inherit font-normal">
              {part}
            </span>
          );
        }

        // Public / Global posts
        const userId = effectiveMemberMap?.get(lowerHandle);
        return (
          <Link
            key={index}
            href={userId ? `/profile/${userId}` : `/search?q=${encodeURIComponent(rawHandle)}`}
            onClick={(e) => e.stopPropagation()}
            className="text-blue-600 font-semibold hover:underline cursor-pointer"
          >
            {part}
          </Link>
        );
      }

      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  }, [content, effectiveIsPrivate, validMemberUsernames, effectiveMemberMap]);

  return <span className={cn("whitespace-pre-wrap break-words", className)}>{renderedElements}</span>;
}
