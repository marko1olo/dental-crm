import React from "react";
import { Calendar } from "lucide-react";
import { createPortal } from "react-dom";
import type { TargetSlotInfo } from "../waitlistCancellationEngine";

export interface WaitlistDrawerMinimizedCapsuleProps {
  itemsCount: number;
  targetSlot?: TargetSlotInfo | null | undefined;
  onExpand: () => void;
}

export function WaitlistDrawerMinimizedCapsule({
  itemsCount,
  targetSlot,
  onExpand,
}: WaitlistDrawerMinimizedCapsuleProps) {
  const content = (
    <div className="fixed top-3.5 right-4 z-50 animate-in fade-in-50 duration-150">
      <button
        type="button"
        onClick={onExpand}
        className="h-9 px-3.5 bg-[var(--paper-strong)] border border-[var(--line-strong)] shadow-xl rounded-full flex items-center gap-2 text-xs font-bold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all cursor-pointer backdrop-blur-md"
        title="Развернуть лист ожидания"
        data-testid="waitlist-drawer-expand-btn"
      >
        <Calendar className="w-4 h-4 text-[var(--teal)] shrink-0" />
        <span>Лист ожидания ({itemsCount})</span>
        {targetSlot && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />}
      </button>
    </div>
  );
  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}
