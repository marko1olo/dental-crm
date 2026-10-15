/**
 * apps/web/src/components/schedule/SmartSlotRecoveryPopover.tsx
 * Smart Slot Recovery Popover for DENTE Dental CRM.
 * Clean, compact presentation (< 120 lines) of matched waitlist candidates.
 */

import React from "react";
import { Clock, ExternalLink, User, X, Zap } from "lucide-react";
import { type WaitlistEntryLike } from "./smartSlotRecoveryEngine";
import { useSmartSlotRecoveryState } from "./useSmartSlotRecoveryState";
import { SmartSlotRecoveryCard } from "./SmartSlotRecoveryCard";

export interface SmartSlotRecoveryTargetSlot {
  appointmentId?: string | null;
  startsAt: string;
  endsAt: string;
  doctorId?: string | null;
  doctorName?: string | null;
  chairId?: string | null;
  chairName?: string | null;
  freedBecause?: string | null;
  patientName?: string | null;
}

export interface SmartSlotRecoveryPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  slot: SmartSlotRecoveryTargetSlot | null;
  waitlistEntries?: WaitlistEntryLike[];
  onBookCandidate?: (candidate: WaitlistEntryLike, slot: SmartSlotRecoveryTargetSlot) => Promise<void> | void;
  onOpenFullWaitlist?: () => void;
  clinicName?: string;
  inline?: boolean;
}

const fmtTime = (s: string) => (s?.includes("T") ? s.split("T")[1]?.slice(0, 5) || "10:00" : s?.slice(0, 5) || "10:00");

export const SmartSlotRecoveryPopover: React.FC<SmartSlotRecoveryPopoverProps> = (props) => {
  const { isOpen, onClose, slot, onOpenFullWaitlist, inline = false } = props;
  const state = useSmartSlotRecoveryState(props);
  const { entries, loading, bookingId, contactedSet, copiedSet, matches, durationMinutes, handleOfferWhatsApp, handleCopyMessage, handleBook } = state;

  if (!isOpen || !slot) return null;

  const content = (
    <div className="smart-slot-recovery-container bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-2xl shadow-xl overflow-hidden min-w-0 max-w-full" data-testid="smart-slot-recovery-popover">
      <div className="p-3.5 sm:p-4 bg-[var(--paper-soft)] border-b border-[var(--line)] flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1 rounded-lg bg-[var(--teal-soft,#0d948815)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30 inline-flex items-center justify-center">
              <Zap className="w-4 h-4 text-[var(--teal,#0d9488)]" />
            </span>
            <h3 className="m-0 text-sm sm:text-base font-bold tracking-tight text-[var(--ink)]">
              Освободилось окно: <span className="text-[var(--teal,#0d9488)]">{matches.length} {matches.length === 1 ? "пациент" : "пациента"}</span>
            </h3>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-[var(--muted)] flex-wrap">
            <span className="inline-flex items-center gap-1 font-mono font-medium text-[var(--ink)] bg-[var(--paper)] px-2 py-0.5 rounded-md border border-[var(--line)]">
              <Clock className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0" />
              {fmtTime(slot.startsAt)} – {fmtTime(slot.endsAt)} ({durationMinutes} мин)
            </span>
            {slot.doctorName && <span className="inline-flex items-center gap-1 bg-[var(--paper)] px-2 py-0.5 rounded-md border border-[var(--line)]"><User className="w-3.5 h-3.5 shrink-0" />{slot.doctorName}</span>}
            {slot.chairName && <span className="hidden sm:inline-flex bg-[var(--paper)] px-2 py-0.5 rounded-md border border-[var(--line)]">{slot.chairName}</span>}
            {slot.freedBecause && <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">({slot.freedBecause})</span>}
          </div>
        </div>
        <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-all cursor-pointer shrink-0" aria-label="Закрыть окно подбора" data-testid="smart-slot-recovery-close-btn">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 sm:p-4 space-y-3 max-h-[75vh] overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-xs text-[var(--muted)] flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-[var(--teal,#0d9488)] border-t-transparent rounded-full animate-spin" />
            <span>Подбор лучших кандидатов из очереди...</span>
          </div>
        ) : matches.length === 0 ? (
          <div className="py-6 px-4 text-center rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5" data-testid="smart-slot-recovery-empty">
            <p className="m-0 text-xs sm:text-sm font-medium text-[var(--ink)]">В листе ожидания нет подходящих пациентов на это окно.</p>
            {onOpenFullWaitlist && (
              <button type="button" onClick={() => { onClose(); onOpenFullWaitlist(); }} className="primary-button mt-2 text-xs font-semibold cursor-pointer">Открыть лист ожидания</button>
            )}
          </div>
        ) : (
          matches.map((m, idx) => (
            <SmartSlotRecoveryCard key={m.id} match={m} idx={idx} isContacted={contactedSet.has(m.id)} isCopied={copiedSet.has(m.id)} isBookingThis={bookingId === m.id} bookingDisabled={Boolean(bookingId)} onOfferWhatsApp={handleOfferWhatsApp} onCopyMessage={handleCopyMessage} onBook={handleBook} />
          ))
        )}
      </div>

      {matches.length > 0 && onOpenFullWaitlist && (
        <div className="p-2.5 bg-[var(--paper-soft)] border-t border-[var(--line)] text-center">
          <button type="button" onClick={() => { onClose(); onOpenFullWaitlist(); }} className="text-xs text-[var(--teal,#0d9488)] hover:underline inline-flex items-center gap-1 cursor-pointer font-medium">
            <span>Показать весь лист ожидания ({entries.length})</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );

  if (inline) return content;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-xs animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} data-testid="smart-slot-recovery-overlay">
      <div className="w-full max-w-lg animate-scale-in" onClick={(e) => e.stopPropagation()}>{content}</div>
    </div>
  );
};

export default SmartSlotRecoveryPopover;
