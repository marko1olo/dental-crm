/**
 * WaitlistEntryCard.tsx — Карточка кандидата из листа ожидания DENTE
 * (Мандат 8b: <= 300 строк; Apple HIG: Grouped Cards; Мандат 8am: 1 Primary CTA).
 */

import React, { type ReactElement } from "react";
import { Copy } from "lucide-react";
import type {
  TargetSlotInfo,
  WaitlistCandidateItem,
  WaitlistScoringResult,
} from "./waitlistTypes";
import {
  generateWaitlistOfferMessage,
  openWhatsAppChat,
  openTelegramChat,
} from "./waitlistTypes";

export interface WaitlistEntryCardProps {
  candidate: WaitlistCandidateItem;
  scoring: WaitlistScoringResult;
  targetSlot?: TargetSlotInfo | null;
  clinicName: string;
  copiedId: string | null;
  onCopyOfferMessage: (candidate: WaitlistCandidateItem) => void;
  onBookCandidate: (candidate: WaitlistCandidateItem) => void;
  onAssignDraft?: (candidate: WaitlistCandidateItem) => void;
}

export function WaitlistEntryCard(props: WaitlistEntryCardProps): ReactElement {
  const {
    candidate,
    scoring,
    targetSlot,
    clinicName,
    copiedId,
    onCopyOfferMessage,
    onBookCandidate,
    onAssignDraft,
  } = props;

  const offerText = generateWaitlistOfferMessage({
    patientName: candidate.patientName,
    doctorName: targetSlot?.doctorName || candidate.preferredDoctorName,
    startsAt: targetSlot?.startsAt,
    clinicName,
  });

  return (
    <div
      className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:border-[var(--teal,#0d9488)]/40 transition-all shadow-sm space-y-2.5"
    >
      {/* Верхняя строка карточки: Пациент, Срочность и Рейтинг */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-sm text-[var(--text,#0f172a)]">
            {candidate.patientName}
          </div>
          <div className="text-xs text-[var(--text-muted,#64748b)] flex items-center gap-1.5 mt-0.5">
            <span>{candidate.patientPhone || "Без телефона"}</span>
            {candidate.preferredDoctorName && (
              <span>• Врач: {candidate.preferredDoctorName}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="px-2 py-0.5 text-[11px] font-medium rounded-full"
            style={{
              backgroundColor:
                scoring.urgency === "acute_pain" || scoring.urgency === "urgent"
                  ? "rgba(239, 68, 68, 0.12)"
                  : "rgba(100, 116, 139, 0.1)",
              color:
                scoring.urgency === "acute_pain" || scoring.urgency === "urgent"
                  ? "var(--danger, #ef4444)"
                  : "var(--text-muted, #64748b)",
            }}
          >
            {scoring.urgencyLabel}
          </span>
          {targetSlot && (
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[var(--badge-teal-bg,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)]">
              {scoring.score}%
            </span>
          )}
        </div>
      </div>

      {/* Причины соответствия / теги */}
      {scoring.matchReasons.length > 0 && (
        <div className="flex flex-wrap gap-1 text-[11px]">
          {scoring.matchReasons.map((reason, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded bg-[var(--paper-subtle,#f1f5f9)] text-[var(--text-muted,#64748b)]"
            >
              ✓ {reason}
            </span>
          ))}
        </div>
      )}

      {candidate.notes && (
        <p className="text-xs text-[var(--text-muted,#64748b)] italic bg-[var(--paper-subtle,#f8fafc)] p-2 rounded-md">
          «{candidate.notes}»
        </p>
      )}

      {/* КНОПКИ ДЕЙСТВИЯ: Мессенджеры + Ровно 1 Primary CTA кнопка */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--line-subtle,#f1f5f9)]">
        {/* Мессенджеры и копирование */}
        <div className="flex items-center gap-1.5">
          {candidate.patientPhone && (
            <>
              <button
                type="button"
                title="Написать в WhatsApp"
                onClick={() => openWhatsAppChat(candidate.patientPhone!, offerText)}
                className="h-8 px-2.5 min-w-[36px] rounded-lg border border-[var(--line,#e2e8f0)] hover:bg-[#25D366]/10 text-xs font-medium text-[#128C7E] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                title="Написать в Telegram"
                onClick={() => openTelegramChat(candidate.patientPhone!, offerText)}
                className="h-8 px-2.5 min-w-[36px] rounded-lg border border-[var(--line,#e2e8f0)] hover:bg-[#0088cc]/10 text-xs font-medium text-[#0088cc] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>TG</span>
              </button>
            </>
          )}
          <button
            type="button"
            title="Скопировать вежливый текст предложения"
            onClick={() => onCopyOfferMessage(candidate)}
            className="h-8 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-subtle,#f1f5f9)] text-xs text-[var(--text-muted,#64748b)] transition-colors cursor-pointer flex items-center gap-1"
          >
            <Copy size={12} className="shrink-0" />
            <span>{copiedId === candidate.id ? "Скопировано!" : "Текст"}</span>
          </button>
        </div>

        {/* ЕДИНСТВЕННЫЙ PRIMARY CTA (Мандат 8am): «Записать в окно» */}
        {targetSlot ? (
          <button
            type="button"
            onClick={() => onBookCandidate(candidate)}
            className="h-9 px-4 rounded-lg bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>Записать в окно</span>
            <span>→</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onAssignDraft?.(candidate)}
            className="h-8 px-3 rounded-lg border border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] hover:bg-[var(--teal,#0d9488)]/10 text-xs font-semibold transition-colors cursor-pointer"
          >
            Назначить
          </button>
        )}
      </div>
    </div>
  );
}
