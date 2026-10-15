/**
 * apps/web/src/components/schedule/SmartSlotRecoveryCard.tsx
 * Clean desktop & mobile card for a matched waitlist candidate.
 */

import React from "react";
import { CalendarPlus, Check, Copy, MessageSquare, Phone, Stethoscope } from "lucide-react";
import type { SmartSlotCandidateMatch, WaitlistUrgency } from "./smartSlotRecoveryTypes";

function getUrgencyBadgeStyle(urgency: WaitlistUrgency): string {
  switch (urgency) {
    case "acute_pain": return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35 font-bold";
    case "ortho_endo": return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35 font-bold";
    case "hygiene": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/35 font-bold";
    default: return "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)] font-medium";
  }
}

function getScoreBadgeStyle(score: number): string {
  if (score >= 80) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  if (score >= 60) return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  return "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]";
}

export interface SmartSlotRecoveryCardProps {
  match: SmartSlotCandidateMatch;
  idx: number;
  isContacted: boolean;
  isCopied: boolean;
  isBookingThis: boolean;
  bookingDisabled: boolean;
  onOfferWhatsApp: (match: SmartSlotCandidateMatch) => void;
  onCopyMessage: (match: SmartSlotCandidateMatch) => void;
  onBook: (match: SmartSlotCandidateMatch) => void;
}

export const SmartSlotRecoveryCard: React.FC<SmartSlotRecoveryCardProps> = ({
  match,
  idx,
  isContacted,
  isCopied,
  isBookingThis,
  bookingDisabled,
  onOfferWhatsApp,
  onCopyMessage,
  onBook,
}) => (
  <article
    className="smart-slot-candidate-card rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)]/40 transition-all p-3 space-y-2.5 relative select-none"
    data-testid={`smart-slot-candidate-card-${idx}`}
  >
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-5 h-5 rounded-full bg-[var(--paper-soft)] border border-[var(--line)] text-[11px] font-bold text-[var(--muted)] inline-flex items-center justify-center shrink-0">
          {idx + 1}
        </span>
        <h4 className="m-0 text-xs sm:text-sm font-bold text-[var(--ink)] leading-snug break-words" title={match.patientName}>
          {match.patientName}
        </h4>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-md border whitespace-nowrap ${getUrgencyBadgeStyle(match.urgency)}`} data-testid={`smart-slot-urgency-${match.id}`}>
          {match.urgencyLabel}
        </span>
        <span className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${getScoreBadgeStyle(match.score)}`} title="Индекс совпадения" data-testid={`smart-slot-score-${match.id}`}>
          {match.score}% совпадение
        </span>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
      <div className="flex items-center gap-1.5 text-[var(--ink)]">
        <Phone className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
        <span className="font-mono text-[11px] sm:text-xs">{match.phone || "Телефон не указан"}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[var(--muted)] min-w-0">
        <Stethoscope className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
        <span className="text-[11px] sm:text-xs text-[var(--ink)] break-words line-clamp-1" title={match.procedureName}>{match.procedureName}</span>
      </div>
    </div>

    {match.matchReasons.length > 0 && (
      <div className="flex items-center gap-1 flex-wrap pt-0.5">
        {match.matchReasons.map((r) => (
          <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line-subtle)] font-medium inline-flex items-center gap-0.5">
            <Check className="w-2.5 h-2.5 text-[var(--teal)]" />
            {r}
          </span>
        ))}
      </div>
    )}

    <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--line-subtle)] flex-wrap">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onOfferWhatsApp(match)}
          disabled={bookingDisabled || !match.phone}
          className={`secondary-button text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${isContacted ? "!bg-emerald-500/15 !text-emerald-700 dark:!text-emerald-300" : ""}`}
          title={match.offerMessage}
          data-testid={`smart-slot-whatsapp-btn-${idx}`}
        >
          {isContacted ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
          <span>{isContacted ? "Отправлено" : "Предложить в WhatsApp"}</span>
        </button>
        <button type="button" onClick={() => onCopyMessage(match)} className="ghost-button w-8 h-8 min-h-[32px] p-0 rounded-lg text-xs cursor-pointer inline-flex items-center justify-center" title="Скопировать текст" data-testid={`smart-slot-copy-btn-${idx}`}>
          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      <button type="button" onClick={() => onBook(match)} disabled={bookingDisabled} className="primary-button text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs" data-testid={`smart-slot-book-btn-${idx}`}>
        {isBookingThis ? (
          <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Запись...</span></>
        ) : (
          <><CalendarPlus className="w-3.5 h-3.5" /><span>Записать в этот слот</span></>
        )}
      </button>
    </div>
  </article>
);
