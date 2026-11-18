/**
 * WaitlistMatchesBlock.tsx — Инлайн-виджет подбора кандидатов из листа ожидания
 * (Мандат 8b: Sweet Spot ~180 строк, Мандат 8am: 1 Primary CTA, Мандат 8ap: SSOT backend matching).
 */

import React, { useState, useEffect, useCallback } from "react";
import { Check, ClipboardList, Loader2, Zap, AlertCircle } from "lucide-react";
import type { Appointment, StaffMember, Chair } from "@dental/shared";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import { showToast } from "../../GlobalToast";
import { handleBookWaitlistSlot } from "./waitlistSlotBookingHandler";
import type { WaitlistCandidateItem, TargetSlotInfo } from "./waitlistTypes";
import {
  generateWaitlistOfferMessage,
  openWhatsAppChat,
  filterWaitlistCandidates,
} from "./waitlistTypes";

export interface WaitlistMatchesBlockProps {
  appointmentId?: string;
  initialSlot?: TargetSlotInfo | null;
  compact?: boolean;
  onBookCandidate?: (candidate: WaitlistCandidateItem) => void;
  onOpenWaitlist?: (slot: TargetSlotInfo | null) => void;
  className?: string;
}

interface BackendMatchItem {
  entryId: string;
  patientId: string;
  patientName: string;
  phone?: string | null;
  patientPhone?: string | null;
  priorityLevel: string;
  waitingDays: number;
  sameDoctor: boolean;
  timeFits: boolean;
  reason: string;
  alreadyBooked: boolean;
}

interface BackendMatchReport {
  appointmentId?: string;
  slot?: { from: string; to: string; doctorName: string | null };
  matches: BackendMatchItem[];
  examinedEntries: number;
  note?: string;
}

export function WaitlistMatchesBlock({
  appointmentId,
  initialSlot,
  compact = false,
  onBookCandidate,
  onOpenWaitlist,
  className = "",
}: WaitlistMatchesBlockProps) {
  const ctx = useOptionalAppLogicContext();
  const [report, setReport] = useState<BackendMatchReport | null>(null);
  const [fallbackCandidates, setFallbackCandidates] = useState<WaitlistCandidateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bookingEntryId, setBookingEntryId] = useState<string | null>(null);

  // Находим целевой приём в расписании (если есть)
  const appt = (ctx?.dashboard?.appointments || []).find((a: Appointment) => a.id === appointmentId);
  const doctor = (ctx?.dashboard?.clinicSettings?.staff || []).find(
    (s: StaffMember) => s.id === appt?.doctorUserId,
  );
  const chair = (ctx?.dashboard?.clinicSettings?.chairs || []).find(
    (c: Chair) => c.id === appt?.chairId,
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
    : (initialSlot || null);

  const effectiveApptId = appointmentId || targetSlot?.appointmentId;

  const handleOpenList = useCallback(() => {
    if (onOpenWaitlist) {
      onOpenWaitlist(targetSlot);
    }
    window.dispatchEvent(
      new CustomEvent("dente:open-waitlist-for-slot", { detail: targetSlot }),
    );
  }, [onOpenWaitlist, targetSlot]);

  useEffect(() => {
    let isMounted = true;
    async function fetchMatches() {
      setLoading(true);
      try {
        const headers: Record<string, string> = { Accept: "application/json" };
        if (ctx?.auth?.denteClinicalReadHeaders) {
          Object.assign(headers, ctx.auth.denteClinicalReadHeaders());
        }

        // 1. Приоритетный путь: боевой бэкенд-роут GET /api/appointments/:appointmentId/waitlist-matches
        if (effectiveApptId && effectiveApptId !== "freed-slot" && !effectiveApptId.startsWith("demo-")) {
          const res = await fetch(`/api/appointments/${encodeURIComponent(effectiveApptId)}/waitlist-matches`, { headers });
          if (res.ok) {
            const data: BackendMatchReport = await res.json();
            if (isMounted) {
              setReport(data);
              setLoading(false);
              return;
            }
          }
        }

        // 2. Fallback: загрузка общего листа ожидания GET /api/waitlist при отсутствии appointmentId в БД
        const resFallback = await fetch("/api/waitlist", { headers });
        if (resFallback.ok) {
          const data = await resFallback.json();
          if (isMounted && Array.isArray(data)) {
            setFallbackCandidates(data);
            setReport(null);
          }
        }
      } catch (err: unknown) {
        console.warn("[WaitlistMatchesBlock] Failed to load waitlist matches:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void fetchMatches();
    return () => {
      isMounted = false;
    };
  }, [effectiveApptId, ctx]);

  // Консолидированный список кандидатов
  const candidateRows = React.useMemo(() => {
    if (report && Array.isArray(report.matches)) {
      return report.matches.map((m) => {
        const cand: WaitlistCandidateItem = {
          id: m.entryId,
          patientId: m.patientId,
          patientName: m.patientName,
          patientPhone: m.phone ?? m.patientPhone ?? null,
          preferredDoctorName: report.slot?.doctorName ?? null,
          priorityLevel: m.priorityLevel,
          notes: m.reason,
          status: "waiting",
        };
        return {
          candidate: cand,
          reasonText: m.reason,
          alreadyBooked: m.alreadyBooked,
        };
      });
    }

    // Fallback клиентский скоринг при отсутствии отчета бэкенда
    const ranked = filterWaitlistCandidates(fallbackCandidates, targetSlot, {
      sameDoctorOnly: Boolean(targetSlot?.doctorUserId),
    });
    return ranked.map((r) => ({
      candidate: r.candidate,
      reasonText: r.scoring.matchReasons.join(" • ") || r.scoring.urgencyLabel,
      alreadyBooked: false,
    }));
  }, [report, fallbackCandidates, targetSlot]);

  const topCandidates = candidateRows.slice(0, compact ? 1 : 3);

  if (loading) {
    return (
      <div className={`p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] text-xs text-[var(--text-muted,#64748b)] flex items-center gap-2.5 ${className}`}>
        <Loader2 size={16} className="animate-spin text-[var(--teal,#0d9488)] shrink-0" />
        <span>Поиск подходящих пациентов в листе ожидания...</span>
      </div>
    );
  }

  // Честное пустое состояние (Empty State) без белых дыр
  if (topCandidates.length === 0) {
    return (
      <div
        data-testid="waitlist-matches-empty"
        className={`py-5 px-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] text-center flex flex-col items-center justify-center gap-2 ${className}`}
      >
        <ClipboardList size={22} className="text-[var(--text-muted,#64748b)] shrink-0" />
        <div>
          <p className="text-xs font-medium text-[var(--text,#0f172a)]">
            В листе ожидания нет подходящих пациентов
          </p>
          <p className="text-[11px] text-[var(--text-muted,#64748b)] mt-0.5">
            {report?.examinedEntries
              ? `Проверено заявок в очереди: ${report.examinedEntries}`
              : "Окно можно занять новой записью или оставить под экстренный приём"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenList}
          className="h-9 px-3.5 text-xs font-medium rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--teal,#0d9488)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer"
        >
          Открыть лист ожидания
        </button>
      </div>
    );
  }

  const clinicName = ctx?.dashboard?.clinicSettings?.name || "Стоматология DENTE";

  return (
    <div
      data-testid="waitlist-matches-block"
      className={`space-y-2.5 p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between text-xs pb-1 border-b border-[var(--line-subtle,#f1f5f9)]">
        <span className="font-semibold text-[var(--teal,#0d9488)] flex items-center gap-1.5">
          <Zap size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
          <span>Подходящие пациенты из очереди ({candidateRows.length})</span>
        </span>
        <button
          type="button"
          onClick={handleOpenList}
          className="text-xs text-[var(--teal,#0d9488)] hover:underline font-medium cursor-pointer"
        >
          Все ({candidateRows.length}) →
        </button>
      </div>

      <div className="space-y-2" data-testid="waitlist-matches-list">
        {topCandidates.map(({ candidate, reasonText, alreadyBooked }) => {
          const offerText = generateWaitlistOfferMessage({
            patientName: candidate.patientName,
            doctorName: targetSlot?.doctorName || candidate.preferredDoctorName,
            startsAt: targetSlot?.startsAt,
            clinicName,
          });

          return (
            <div
              key={candidate.id}
              className="p-3 rounded-xl bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper-soft,#1e293b)] border border-[var(--line-subtle,#f1f5f9)] dark:border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--text,#0f172a)] truncate">
                    {candidate.patientName}
                  </span>
                  {alreadyBooked && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[var(--warning-soft,rgba(245,158,11,0.1))] text-[var(--warning-ink,#b45309)] border border-[var(--warning-line,rgba(245,158,11,0.2))] shrink-0">
                      Уже записан на будущее
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[var(--text-muted,#64748b)] truncate">
                  {candidate.patientPhone || "Без телефона"}
                </div>
                {reasonText && (
                  <div className="text-[11px] text-[var(--teal,#0d9488)] leading-tight pt-0.5">
                    {reasonText}
                  </div>
                )}
              </div>

              {/* Кнопки действий: Secondary для мессенджеров, ровно 1 Primary CTA для бронирования */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {candidate.patientPhone ? (
                  <button
                    type="button"
                    title="Написать в WhatsApp"
                    onClick={() => openWhatsAppChat(candidate.patientPhone ?? "", offerText)}
                    className="h-9 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] text-xs font-medium text-[var(--ink,#0f172a)] transition-colors cursor-pointer flex items-center justify-center"
                  >
                    WA
                  </button>
                ) : null}

                <button
                  type="button"
                  title="Скопировать текст предложения"
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(offerText);
                      setCopiedId(candidate.id);
                      setTimeout(() => setCopiedId(null), 2000);
                    }
                  }}
                  className="h-9 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] text-xs text-[var(--text-muted,#64748b)] hover:text-[var(--ink,#0f172a)] inline-flex items-center justify-center transition-colors cursor-pointer"
                >
                  {copiedId === candidate.id ? (
                    <Check size={14} className="text-[var(--teal,#0d9488)]" />
                  ) : (
                    <ClipboardList size={14} />
                  )}
                </button>

                {/* Primary CTA (Мандат 8am: Ровно 1 акцентная кнопка h-9 desktop / h-11 mobile) */}
                <button
                  type="button"
                  disabled={bookingEntryId === candidate.id}
                  onClick={async () => {
                    if (onBookCandidate) {
                      onBookCandidate(candidate);
                      return;
                    }
                    if (targetSlot) {
                      setBookingEntryId(candidate.id);
                      try {
                        await handleBookWaitlistSlot({
                          candidate,
                          slot: targetSlot,
                          dashboard: ctx?.dashboard,
                          auth: ctx?.auth,
                          loadDashboard: ctx?.loadDashboard,
                          showToast,
                          onSuccess: () => {
                            window.dispatchEvent(
                              new CustomEvent("dente:book-waitlist-candidate", {
                                detail: { candidate, slot: targetSlot },
                              }),
                            );
                          },
                        });
                      } catch (bookingErr: unknown) {
                        console.warn("[WaitlistMatchesBlock] Booking candidate failed:", bookingErr);
                      } finally {
                        setBookingEntryId(null);
                      }
                    }
                  }}
                  className="h-9 px-3.5 rounded-lg bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  {bookingEntryId === candidate.id ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Запись...</span>
                    </>
                  ) : (
                    <span>Записать</span>
                  )}
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
