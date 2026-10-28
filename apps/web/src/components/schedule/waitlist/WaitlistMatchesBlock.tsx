/**
 * WaitlistMatchesBlock.tsx — Инлайн-виджет подбора кандидатов из листа ожидания
 * для встраивания в карточки отмененных слотов (Мандат 8b, Sweet Spot ~120-150 строк).
 */

import React, { useState, useEffect } from "react";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import type { WaitlistCandidateItem, TargetSlotInfo } from "./waitlistTypes";
import {
  generateWaitlistOfferMessage,
  openWhatsAppChat,
  openTelegramChat,
  filterWaitlistCandidates,
} from "./waitlistTypes";

export interface WaitlistMatchesBlockProps {
  appointmentId: string;
  compact?: boolean;
  onBookCandidate?: (candidate: WaitlistCandidateItem) => void;
  className?: string;
}

export function WaitlistMatchesBlock({
  appointmentId,
  compact = false,
  onBookCandidate,
  className = "",
}: WaitlistMatchesBlockProps) {
  const ctx = useOptionalAppLogicContext();
  const [candidates, setCandidates] = useState<WaitlistCandidateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Находим целевой приём в расписании (если есть)
  const appt = (ctx?.dashboard?.appointments || []).find((a: any) => a.id === appointmentId);
  const doctor = (ctx?.dashboard?.clinicSettings?.staff || []).find(
    (s: any) => s.id === appt?.doctorUserId,
  );
  const chair = (ctx?.dashboard?.clinicSettings?.chairs || []).find(
    (c: any) => c.id === appt?.chairId,
  );

  const targetSlot: TargetSlotInfo | null = appt
    ? {
        appointmentId: appt.id,
        startsAt: appt.startsAt,
        endsAt: appt.endsAt,
        doctorUserId: appt.doctorUserId,
        doctorName: doctor?.fullName || null,
        chairId: appt.chairId,
        chairName: chair?.name || null,
        freedBecause: "Отмена приёма",
      }
    : null;

  useEffect(() => {
    let isMounted = true;
    async function loadCandidates() {
      setLoading(true);
      try {
        const headers: Record<string, string> = { Accept: "application/json" };
        if (ctx?.auth?.denteClinicalReadHeaders) {
          Object.assign(headers, ctx.auth.denteClinicalReadHeaders());
        }
        const res = await fetch("/api/waitlist", { headers });
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && Array.isArray(data)) {
          setCandidates(data);
        }
      } catch {
        // Ошибки подавляем в инлайн-блоке, не ломая карточку
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    void loadCandidates();
    return () => {
      isMounted = false;
    };
  }, [ctx]);

  const ranked = filterWaitlistCandidates(candidates, targetSlot, {
    sameDoctorOnly: Boolean(targetSlot?.doctorUserId),
  });

  const topCandidates = ranked.slice(0, compact ? 1 : 3);

  if (loading) {
    return (
      <div className={`p-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-subtle,#f8fafc)] text-xs text-[var(--text-muted,#64748b)] flex items-center gap-2 ${className}`}>
        <span className="animate-spin text-sm">⏳</span>
        <span>Поиск кандидатов в листе ожидания...</span>
      </div>
    );
  }

  if (topCandidates.length === 0) {
    return (
      <div className={`p-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-subtle,#f8fafc)] text-xs text-[var(--text-muted,#64748b)] flex items-center justify-between ${className}`}>
        <span>Нет подходящих пациентов в листе ожидания</span>
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent("dente:open-waitlist-for-slot", { detail: targetSlot }),
            );
          }}
          className="text-[var(--teal,#0d9488)] font-semibold hover:underline"
        >
          Открыть лист
        </button>
      </div>
    );
  }

  const clinicName = ctx?.dashboard?.clinicSettings?.name || "Стоматология DENTE";

  return (
    <div className={`space-y-2 p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-sm ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-[var(--teal,#0d9488)] flex items-center gap-1.5">
          <span>⚡</span>
          <span>Подходящие пациенты из очереди ({ranked.length})</span>
        </span>
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent("dente:open-waitlist-for-slot", { detail: targetSlot }),
            );
          }}
          className="text-xs text-[var(--teal,#0d9488)] hover:underline font-medium"
        >
          Все ({ranked.length}) →
        </button>
      </div>

      <div className="space-y-1.5">
        {topCandidates.map(({ candidate, scoring }) => {
          const offerText = generateWaitlistOfferMessage({
            patientName: candidate.patientName,
            doctorName: targetSlot?.doctorName || candidate.preferredDoctorName,
            startsAt: targetSlot?.startsAt,
            clinicName,
          });

          return (
            <div
              key={candidate.id}
              className="p-2 rounded-lg bg-[var(--paper-subtle,#f8fafc)] border border-[var(--line-subtle,#f1f5f9)] flex items-center justify-between gap-2 text-xs"
            >
              <div className="min-w-0">
                <div className="font-semibold text-[var(--text,#0f172a)] truncate">
                  {candidate.patientName}
                </div>
                <div className="text-[11px] text-[var(--text-muted,#64748b)] truncate">
                  {candidate.patientPhone || "Без телефона"} • {scoring.urgencyLabel}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {candidate.patientPhone && (
                  <button
                    type="button"
                    title="Написать в WhatsApp"
                    onClick={() => openWhatsAppChat(candidate.patientPhone!, offerText)}
                    className="h-7 px-2 rounded border border-[var(--line,#e2e8f0)] hover:bg-[#25D366]/10 text-[#128C7E] font-medium text-[11px]"
                  >
                    WA
                  </button>
                )}
                <button
                  type="button"
                  title="Скопировать текст сообщения"
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(offerText);
                      setCopiedId(candidate.id);
                      setTimeout(() => setCopiedId(null), 2000);
                    }
                  }}
                  className="h-7 px-2 rounded border border-[var(--line,#e2e8f0)] text-[var(--text-muted,#64748b)] text-[11px]"
                >
                  {copiedId === candidate.id ? "✓" : "📋"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onBookCandidate) {
                      onBookCandidate(candidate);
                    } else if (targetSlot) {
                      window.dispatchEvent(
                        new CustomEvent("dente:book-waitlist-candidate", {
                          detail: { candidate, slot: targetSlot },
                        }),
                      );
                    }
                  }}
                  className="h-7 px-2.5 rounded bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white font-semibold text-[11px] shadow-sm transition-colors"
                >
                  Записать
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WaitlistMatchesBlock;
