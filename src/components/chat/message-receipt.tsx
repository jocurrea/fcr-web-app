import React from "react";
import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type MessageDeliveryStatus = "sent" | "delivered" | "read";

interface MessageReceiptProps {
  status: MessageDeliveryStatus;
  className?: string;
  isInsideBlueBubble?: boolean;
}

/**
 * HU-03: Universal Delivery and Read Receipts
 * - Single Gray Check (✓): Stored in database (Sent)
 * - Double Gray Check (✓✓): Delivered to recipient's client
 * - Double Blue Check (✓✓): Recipient explicitly read / opened conversation
 */
export function MessageReceipt({
  status,
  className,
  isInsideBlueBubble = false,
}: MessageReceiptProps) {
  if (status === "read") {
    return (
      <span
        title="Read (Seen)"
        className={cn(
          "inline-flex items-center shrink-0 transition-colors duration-200",
          isInsideBlueBubble ? "text-sky-300" : "text-blue-500",
          className
        )}
      >
        <CheckCheck className="w-3.5 h-3.5 stroke-[2.4]" />
      </span>
    );
  }

  if (status === "delivered") {
    return (
      <span
        title="Delivered"
        className={cn(
          "inline-flex items-center shrink-0 transition-colors duration-200",
          isInsideBlueBubble ? "text-white/70" : "text-gray-400",
          className
        )}
      >
        <CheckCheck className="w-3.5 h-3.5 stroke-[1.8]" />
      </span>
    );
  }

  // Sent (Single Check)
  return (
    <span
      title="Sent"
      className={cn(
        "inline-flex items-center shrink-0 transition-colors duration-200",
        isInsideBlueBubble ? "text-white/60" : "text-gray-400",
        className
      )}
    >
      <Check className="w-3.5 h-3.5 stroke-[1.8]" />
    </span>
  );
}

