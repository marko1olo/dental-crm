/**
 * apps/web/src/components/schedule/SmartSlotRecoveryPopover.tsx
 *
 * Smart Slot Recovery Popover for DENTE Dental CRM.
 * Displays top-3 ranked waitlist candidates when an appointment is cancelled or freed.
 *
 * Mandate Compliance:
 * - 152-FZ Safe Messaging (zero clinical data disclosed over WhatsApp/SMS)
 * - Mandate 8e: Doctor & Staff Autonomy (1-click WhatsApp offer and 1-click booking)
 * - Mandate 8d: Apple HIG / Clean Desktop Density (32px action buttons, WCAG AAA)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  CalendarPlus,
  Check,
  Clock,
  Copy,
  ExternalLink,
  MessageSquare,
  Phone,
  Sparkles,
  Stethoscope,
  User,
  X,
  Zap,
} from "lucide-react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { showToast } from "../GlobalToast";
import { logger } from "../../utils/logger";
import {
  type MatchWaitlistSlotParams,
  type SmartSlotCandidateMatch,
  type WaitlistEntryLike,
  type WaitlistUrgency,
  matchWaitlistCandidatesForSlot,
  openWhatsAppLinkDirect,
} from "./smartSlotRecoveryEngine";

export interface SmartSlotRecoveryTargetSlot {
  appointmentId?: string | null | undefined;
  startsAt: string;
  endsAt: string;
  doctorId?: string | null | undefined;
  doctorName?: string | null | undefined;
  chairId?: string | null | undefined;
  chairName?: string | null | undefined;
  freedBecause?: string | null | undefined;
  patientName?: string | null | undefined;
}

export interface SmartSlotRecoveryPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  slot: SmartSlotRecoveryTargetSlot | null;
  waitlistEntries?: WaitlistEntryLike[] | undefined;
  onBookCandidate?: (
    candidate: WaitlistEntryLike,
    slot: SmartSlotRecoveryTargetSlot,
  ) => Promise<void> | void;
  onOpenFullWaitlist?: () => void;
  clinicName?: string;
  inline?: boolean;
}

const DEMO_WAITLIST_ENTRIES: WaitlistEntryLike[] = [
  {
    id: "demo-wl-1",
    patientId: "demo-p-1",
    patientName: "Волков Сергей Николаевич",
    patientPhone: "+7 (916) 111-22-33",
    preferredDoctorId: "doc-1",
    priorityLevel: "high",
    urgency: "acute_pain",
    treatmentCategory: "Терапия (Острая боль)",
    notes: "Острая боль 4.6, просит ближайшее утро",
    status: "waiting",
    createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 4).toISOString(),
    waitingDays: 4,
  },
  {
    id: "demo-wl-2",
    patientId: "demo-p-2",
    patientName: "Морозова Елена Викторовна",
    patientPhone: "+7 (926) 444-55-66",
    preferredDoctorId: "doc-1",
    priorityLevel: "medium",
    urgency: "ortho_endo",
    treatmentCategory: "Ортодонтия (Активация)",
    notes: "Готова подойти в любое окно сегодня",
    status: "waiting",
    createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 6).toISOString(),
    waitingDays: 6,
  },
  {
    id: "demo-wl-3",
    patientId: "demo-p-3",
    patientName: "Кузнецов Дмитрий Павлович",
    patientPhone: "+7 (903) 777-88-99",
    preferredDoctorId: null,
    priorityLevel: "medium",
    urgency: "hygiene",
    treatmentCategory: "Профгигиена Air-Flow",
    notes: "Профгигиена, любой терапевт клиники",
    status: "waiting",
    createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 2).toISOString(),
    waitingDays: 2,
  },
];

function formatTimeOnly(isoOrTime: string): string {
  if (!isoOrTime) return "10:00";
  if (isoOrTime.includes("T")) {
    return isoOrTime.split("T")[1]?.slice(0, 5) || "10:00";
  }
  return isoOrTime.slice(0, 5);
}

function getUrgencyBadgeStyle(urgency: WaitlistUrgency): string {
  switch (urgency) {
    case "acute_pain":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35 font-bold";
    case "ortho_endo":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35 font-bold";
    case "hygiene":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/35 font-bold";
    default:
      return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/25 font-medium";
  }
}

function getScoreBadgeStyle(score: number): string {
  if (score >= 80) {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  }
  if (score >= 60) {
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  }
  return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30";
}

export const SmartSlotRecoveryPopover: React.FC<SmartSlotRecoveryPopoverProps> = ({
  isOpen,
  onClose,
  slot,
  waitlistEntries: propWaitlistEntries,
  onBookCandidate,
  onOpenFullWaitlist,
  clinicName: propClinicName,
  inline = false,
}) => {
  const appLogic = useOptionalAppLogicContext();
  const clinicName =
    propClinicName ||
    appLogic?.dashboard?.clinicSettings?.name ||
    "DENTE";

  const [entries, setEntries] = useState<WaitlistEntryLike[]>(
    propWaitlistEntries || [],
  );
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [contactedSet, setContactedSet] = useState<Set<string>>(new Set());
  const [copiedSet, setCopiedSet] = useState<Set<string>>(new Set());

  // Load waitlist entries if not provided via props
  useEffect(() => {
    if (!isOpen) return;
    if (propWaitlistEntries && propWaitlistEntries.length > 0) {
      setEntries(propWaitlistEntries);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetch("/api/waitlist", {
      headers: appLogic?.auth?.denteClinicalReadHeaders
        ? appLogic.auth.denteClinicalReadHeaders()
        : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : [];
        if (list.length === 0 && isDemoShowcaseMode()) {
          setEntries(DEMO_WAITLIST_ENTRIES);
        } else {
          setEntries(list);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        logger.warn("Could not load waitlist for smart slot recovery:", err);
        if (isDemoShowcaseMode() || entries.length === 0) {
          setEntries(DEMO_WAITLIST_ENTRIES);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, propWaitlistEntries, appLogic?.auth]);

  // Compute matched candidates using Smart Slot Recovery Engine
  const recoveryResult = useMemo(() => {
    if (!slot) return null;
    return matchWaitlistCandidatesForSlot({
      doctorId: slot.doctorId,
      doctorName: slot.doctorName,
      chairId: slot.chairId,
      chairName: slot.chairName,
      startAt: slot.startsAt,
      endAt: slot.endsAt,
      waitlistEntries: entries,
      limit: 3,
      clinicName,
    });
  }, [slot, entries, clinicName]);

  const matches = recoveryResult?.matches || [];
  const durationMinutes = recoveryResult?.slot?.durationMinutes || 30;

  // Handle WhatsApp Offer Click
  const handleOfferWhatsApp = useCallback(
    (match: SmartSlotCandidateMatch) => {
      if (!match.phone) {
        showToast("У пациента не указан номер телефона", "warning");
        return;
      }

      setContactedSet((prev) => new Set(prev).add(match.id));

      if (match.whatsappUrl && typeof window !== "undefined") {
        window.open(match.whatsappUrl, "_blank", "noopener,noreferrer");
      }

      showToast(
        `Текст предложения сформирован для ${match.patientName}`,
        "success",
      );
    },
    [],
  );

  // Handle Copy Message
  const handleCopyMessage = useCallback(
    (match: SmartSlotCandidateMatch) => {
      if (!navigator?.clipboard) {
        showToast("Буфер обмена недоступен", "warning");
        return;
      }
      navigator.clipboard
        .writeText(match.offerMessage)
        .then(() => {
          setCopiedSet((prev) => new Set(prev).add(match.id));
          showToast("Текст сообщения скопирован в буфер", "success");
        })
        .catch(() => {
          showToast("Не удалось скопировать текст", "error");
        });
    },
    [],
  );

  // Handle Booking Patient into Slot
  const handleBook = useCallback(
    async (match: SmartSlotCandidateMatch) => {
      if (!slot || bookingId) return;
      setBookingId(match.id);

      try {
        if (onBookCandidate) {
          await onBookCandidate(match.candidate, slot);
          showToast(
            `Пациент «${match.patientName}» записан в освободившееся окно!`,
            "success",
          );
          onClose();
          return;
        }

        // Default Direct Booking via REST API
        if (slot.appointmentId) {
          const patchRes = await fetch(
            `/api/appointments/${encodeURIComponent(slot.appointmentId)}`,
            {
              method: "PATCH",
              headers: denteAdminSecretRequestHeaders({
                "Content-Type": "application/json",
              }),
              body: JSON.stringify({
                patientId: match.patientId,
                status: "planned",
                reason: match.procedureName || "Запись из листа ожидания",
                comment: `Окно занято из листа ожидания: ${match.patientName}`,
                expectedCurrentStatus: ["cancelled", "no_show"],
              }),
            },
          );

          if (!patchRes.ok) {
            const err = await patchRes.json().catch(() => null);
            showToast(
              err?.message || "Не удалось обновить запись в расписании",
              "error",
            );
            return;
          }

          // Mark waitlist entry fulfilled
          if (match.candidate?.id || match.candidate?.entryId) {
            const entryId = match.candidate.id || match.candidate.entryId;
            await fetch(`/api/waitlist/${encodeURIComponent(entryId!)}`, {
              method: "PUT",
              headers: denteAdminSecretRequestHeaders({
                "Content-Type": "application/json",
              }),
              body: JSON.stringify({ status: "fulfilled" }),
            }).catch(() => {});
          }

          showToast(
            `Пациент «${match.patientName}» успешно записан в окно!`,
            "success",
          );

          if (appLogic?.loadDashboard) {
            void appLogic.loadDashboard();
          }

          onClose();
        } else {
          showToast("Запись слота не найдена для изменения", "warning");
        }
      } catch (err) {
        logger.error("Smart slot recovery booking error:", err);
        showToast("Ошибка при записи пациента в свободное окно", "error");
      } finally {
        setBookingId(null);
      }
    },
    [slot, bookingId, onBookCandidate, onClose, appLogic],
  );

  if (!isOpen || !slot) return null;

  const content = (
    <div
      className="smart-slot-recovery-container bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-2xl shadow-xl overflow-hidden min-w-0 max-w-full"
      data-testid="smart-slot-recovery-popover"
      style={{
        boxShadow: "0 12px 36px -4px rgba(0, 0, 0, 0.16), 0 4px 12px -2px rgba(0, 0, 0, 0.08)",
      }}
    >
      {/* Header bar */}
      <div className="p-3.5 sm:p-4 bg-[var(--paper-soft)] border-b border-[var(--line)] flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1 rounded-lg bg-[var(--teal-soft)] text-[var(--teal-dark)] border border-[var(--teal)]/30 inline-flex items-center justify-center">
              <Zap className="w-4 h-4 text-[var(--teal)]" />
            </span>
            <h3 className="m-0 text-sm sm:text-base font-bold tracking-tight text-[var(--ink)]">
              Освободилось окно:{" "}
              <span className="text-[var(--teal)]">
                {matches.length}{" "}
                {matches.length === 1
                  ? "подходящий пациент"
                  : matches.length >= 2 && matches.length <= 4
                    ? "подходящих пациента"
                    : "подходящих пациентов"}
              </span>
            </h3>
          </div>

          {/* Slot Metadata Chips */}
          <div className="flex items-center gap-2 mt-1.5 text-xs text-[var(--muted)] flex-wrap">
            <span className="inline-flex items-center gap-1 font-mono font-medium text-[var(--ink)] bg-[var(--paper)] px-2 py-0.5 rounded-md border border-[var(--line)]">
              <Clock className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
              {formatTimeOnly(slot.startsAt)} – {formatTimeOnly(slot.endsAt)} (
              {durationMinutes} мин)
            </span>
            {slot.doctorName && (
              <span className="inline-flex items-center gap-1 bg-[var(--paper)] px-2 py-0.5 rounded-md border border-[var(--line)]">
                <User className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                {slot.doctorName}
              </span>
            )}
            {slot.chairName && (
              <span className="hidden sm:inline-flex items-center gap-1 bg-[var(--paper)] px-2 py-0.5 rounded-md border border-[var(--line)]">
                {slot.chairName}
              </span>
            )}
            {slot.freedBecause && (
              <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                ({slot.freedBecause})
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] border border-transparent hover:border-[var(--line)] transition-all cursor-pointer shrink-0"
          aria-label="Закрыть окно подбора"
          data-testid="smart-slot-recovery-close-btn"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body content */}
      <div className="p-3 sm:p-4 space-y-3 max-h-[75vh] overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-xs text-[var(--muted)] flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-[var(--teal)] border-t-transparent rounded-full animate-spin" />
            <span>Подбор лучших кандидатов из листа ожидания...</span>
          </div>
        ) : matches.length === 0 ? (
          <div
            className="py-6 px-4 text-center rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5"
            data-testid="smart-slot-recovery-empty"
          >
            <p className="m-0 text-xs sm:text-sm font-medium text-[var(--ink)]">
              В листе ожидания нет подходящих пациентов на это окно.
            </p>
            <p className="m-0 text-xs text-[var(--muted)]">
              Вы можете добавить нового пациента в очередь или открыть общий список.
            </p>
            {onOpenFullWaitlist && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullWaitlist();
                }}
                className="primary-button mt-2 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
              >
                Открыть лист ожидания
              </button>
            )}
          </div>
        ) : (
          matches.map((match, idx) => {
            const isContacted = contactedSet.has(match.id);
            const isCopied = copiedSet.has(match.id);
            const isBookingThis = bookingId === match.id;

            return (
              <article
                key={match.id}
                className="smart-slot-candidate-card rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)]/40 hover:shadow-xs transition-all p-3 space-y-2.5 relative select-none"
                data-testid={`smart-slot-candidate-card-${idx}`}
              >
                {/* Top header row: Patient FIO + Score + Urgency */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-[var(--paper-soft)] border border-[var(--line)] text-[11px] font-bold text-[var(--muted)] inline-flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <h4
                      className="m-0 text-xs sm:text-sm font-bold text-[var(--ink)] leading-snug break-words"
                      title={match.patientName}
                    >
                      {match.patientName}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Urgency Badge */}
                    <span
                      className={`text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-md border whitespace-nowrap ${getUrgencyBadgeStyle(match.urgency)}`}
                      data-testid={`smart-slot-urgency-${match.id}`}
                    >
                      {match.urgencyLabel}
                    </span>

                    {/* Score Badge */}
                    <span
                      className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${getScoreBadgeStyle(match.score)}`}
                      title="Индекс релевантности кандидата"
                      data-testid={`smart-slot-score-${match.id}`}
                    >
                      {match.score}% совпадение
                    </span>
                  </div>
                </div>

                {/* Patient details & Requested procedure */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  {/* Phone */}
                  <div className="flex items-center gap-1.5 text-[var(--ink)]">
                    <Phone className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                    <span className="font-mono text-[11px] sm:text-xs">
                      {match.phone || "Телефон не указан"}
                    </span>
                  </div>

                  {/* Procedure */}
                  <div className="flex items-center gap-1.5 text-[var(--muted)] min-w-0">
                    <Stethoscope className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
                    <span
                      className="text-[11px] sm:text-xs text-[var(--ink)] break-words line-clamp-1"
                      title={match.procedureName}
                    >
                      {match.procedureName}
                    </span>
                  </div>
                </div>

                {/* Match Reason Chips */}
                {match.matchReasons.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    {match.matchReasons.map((reason) => (
                      <span
                        key={reason}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line-subtle)] font-medium inline-flex items-center gap-0.5"
                      >
                        <Check className="w-2.5 h-2.5 text-[var(--teal)]" />
                        {reason}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions row: WhatsApp CTA + Book in Slot CTA */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--line-subtle)] flex-wrap">
                  {/* Quick message helpers */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOfferWhatsApp(match)}
                      disabled={Boolean(bookingId) || !match.phone}
                      className={`secondary-button text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isContacted
                          ? "!bg-emerald-500/15 !text-emerald-700 dark:!text-emerald-300 !border-emerald-500/40"
                          : ""
                      }`}
                      title={match.offerMessage}
                      data-testid={`smart-slot-whatsapp-btn-${idx}`}
                    >
                      {isContacted ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                      <span>{isContacted ? "Отправлено" : "Предложить в WhatsApp"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyMessage(match)}
                      className="ghost-button w-8 h-8 min-h-[32px] p-0 rounded-lg text-xs cursor-pointer inline-flex items-center justify-center"
                      title="Скопировать текст сообщения 152-ФЗ"
                      data-testid={`smart-slot-copy-btn-${idx}`}
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Primary CTA: Book into Slot */}
                  <button
                    type="button"
                    onClick={() => handleBook(match)}
                    disabled={Boolean(bookingId)}
                    className="primary-button text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                    data-testid={`smart-slot-book-btn-${idx}`}
                  >
                    {isBookingThis ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Запись...</span>
                      </>
                    ) : (
                      <>
                        <CalendarPlus className="w-3.5 h-3.5" />
                        <span>Записать в этот слот</span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Footer link to full waitlist */}
      {matches.length > 0 && onOpenFullWaitlist && (
        <div className="p-2.5 bg-[var(--paper-soft)] border-t border-[var(--line)] text-center">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFullWaitlist();
            }}
            className="text-xs text-[var(--teal)] hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
          >
            <span>Показать весь лист ожидания ({entries.length})</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="smart-slot-recovery-overlay"
    >
      <div className="w-full max-w-lg animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
};

export default SmartSlotRecoveryPopover;
