import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  MessageSquare,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import type { PanelSubject } from "../../lib/panelStateText";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { EmptyState } from "../EmptyState";
import { showToast } from "../GlobalToast";
import { PanelLoadFailure } from "../PanelLoadFailure";
import {
  type DoctorFreeSlot,
  findDoctorFreeSlots,
} from "./doctorFreeSlotsEngine";
import {
  type TargetSlotInfo,
  type WaitlistCandidateItem,
  type WaitlistUrgency,
  URGENCY_CONFIG,
  detectWaitlistUrgency,
  extractPatientPoliteName,
  filterWaitlistCandidates,
  generate152FzWaitlistOfferMessage,
  scoreWaitlistCandidate,
} from "./waitlistCancellationEngine";

export type { TargetSlotInfo, WaitlistCandidateItem, WaitlistUrgency };
export {
  generate152FzWaitlistOfferMessage,
  detectWaitlistUrgency,
  extractPatientPoliteName,
};

function waitlistWriteHeaders(): Record<string, string> {
  return denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
}

async function writeFailureText(
  response: Response,
  action: string,
): Promise<string> {
  // biome-ignore lint/suspicious/noExplicitAny: error body parsing
  const body = await response.json().catch((err: any) => {
    logger.error(err);
    showToast(
      actionFailureToast(
        "Ошибка чтения ответа",
        (err as { status?: number })?.status ?? null,
      ),
      "error",
    );
    return null;
  });
  const serverMessage =
    body && typeof body.message === "string" ? body.message.trim() : "";
  if (serverMessage) return serverMessage;
  if (response.status === 401 || response.status === 403) {
    return `Не удалось ${action}: требуется вход сотрудника клиники.`;
  }
  if (response.status === 404) {
    return `Не удалось ${action}: запись уже изменена или удалена.`;
  }
  if (response.status >= 500) {
    return `Не удалось ${action}: сервер клиники ответил отказом. Повторите попытку.`;
  }
  return `Не удалось ${action}. Повторите попытку.`;
}

const WAITLIST_SUBJECT: PanelSubject = {
  notLoadedTitle: "Очередь ожидания не прочитана",
  accusative: "очередь ожидания",
  emptyTitle: "В листе ожидания никто не ждёт",
  emptyHint:
    "Пациентов в очереди нет. Добавьте пациента формой ниже за 5 секунд, и при отмене чужой записи система сама предложит его на освободившееся окно.",
  failureConsequence:
    "Список ожидания не прочитан. Освободившееся окно можно отдать мимо тех, кто его ждёт.",
};

export interface WaitlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  targetSlot?: TargetSlotInfo | null;
  onBookSlot?: (
    patient: WaitlistCandidateItem,
    slot: TargetSlotInfo,
  ) => Promise<void> | void;
  updateNewAppointmentDraft?: (key: any, value: any) => void;
  focusNewAppointmentEditor?: () => void;
  onAppointmentCreated?: () => void;
  // biome-ignore lint/suspicious/noExplicitAny: dashboard prop
  dashboard?: any;
  // biome-ignore lint/suspicious/noExplicitAny: auth prop
  auth?: any;
}

export function WaitlistDrawer(props: WaitlistDrawerProps) {
  const {
    isOpen,
    onClose,
    targetSlot,
    onBookSlot,
    updateNewAppointmentDraft,
    focusNewAppointmentEditor,
    onAppointmentCreated,
    dashboard: propDashboard,
    auth: propAuth,
  } = props;

  const ctx = useAppLogicContext();
  const dashboard = propDashboard || ctx?.dashboard;
  const auth = propAuth || ctx?.auth;

  const [items, setItems] = useState<WaitlistCandidateItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadFailureStatus, setLoadFailureStatus] = useState<
    number | null | undefined
  >(undefined);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [contactedPatients, setContactedPatients] = useState<Set<string>>(
    new Set(),
  );
  const [bookedItemIds, setBookedItemIds] = useState<Set<string>>(new Set());

  // Filter state (Compact 32-36px toolbar)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUrgency, setSelectedUrgency] = useState<
    WaitlistUrgency | "all"
  >("all");
  const [onlySameDoctor, setOnlySameDoctor] = useState(
    Boolean(targetSlot?.doctorUserId),
  );
  const [selectedDoctorFilter, setSelectedDoctorFilter] =
    useState<string>("all");
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  // Quick 5-second Add Patient Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [quickNewPatientMode, setQuickNewPatientMode] = useState(false);
  const [quickFullName, setQuickFullName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [preferredDoctorId, setPreferredDoctorId] = useState(
    targetSlot?.doctorUserId || "",
  );
  const [addUrgency, setAddUrgency] = useState<WaitlistUrgency>("acute_pain");
  const [addPreferredTime, setAddPreferredTime] = useState<string>("any");
  const [notes, setNotes] = useState("");

  const staff = dashboard?.clinicSettings?.staff ?? [];
  const doctors = staff.filter(
    // biome-ignore lint/suspicious/noExplicitAny: doctor filtering
    (s: any) =>
      s.role === "doctor" ||
      s.role === "Врач" ||
      s.role === "admin" ||
      s.role === "owner",
  );
  const patientsList = dashboard?.patients ?? [];
  const clinicName = dashboard?.clinicSettings?.name || "DENTE";

  // Close action menu on click outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest(".waitlist-item-menu-container")) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [openMenuId]);

  // ESC key handler: close menu, form or drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (openMenuId) {
          setOpenMenuId(null);
          return;
        }
        if (isAddFormOpen) {
          setIsAddFormOpen(false);
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, openMenuId, isAddFormOpen, onClose]);

  // Sync doctor preference if targetSlot changes
  useEffect(() => {
    if (targetSlot?.doctorUserId) {
      setPreferredDoctorId(targetSlot.doctorUserId);
      setOnlySameDoctor(true);
    }
  }, [targetSlot?.doctorUserId]);

  const fetchWaitlist = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadFailureStatus(undefined);
      const res = await fetch("/api/waitlist", {
        headers: auth?.denteClinicalReadHeaders
          ? auth.denteClinicalReadHeaders()
          : {},
      });
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
        return;
      }
      setLoadFailureStatus(res.status);
    } catch (e) {
      logger.error("Failed to load waitlist", e);
      setLoadFailureStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    if (isOpen) {
      fetchWaitlist();
    }
  }, [isOpen, fetchWaitlist]);

  // 1-Click WhatsApp Direct
  const handleSendWhatsApp = (item: WaitlistCandidateItem) => {
    if (!item.patientPhone) {
      showToast("У пациента не указан номер телефона", "error");
      return;
    }
    const msg = generate152FzWaitlistOfferMessage({
      patientName: item.patientName,
      doctorName: targetSlot?.doctorName || item.preferredDoctorName,
      startsAt: targetSlot?.startsAt || new Date().toISOString(),
      clinicName,
    });

    const cleanPhone = item.patientPhone
      .replace(/[^\d+]/g, "")
      .replace(/^\+/, "");
    window.open(
      `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
    setContactedPatients((prev) => new Set(prev).add(item.id));
    showToast(
      `Сообщение WhatsApp подготовлено для ${item.patientName || "пациента"}`,
      "success",
    );
  };

  // 1-Click Copy SMS
  const handleCopySms = (item: WaitlistCandidateItem) => {
    const msg = generate152FzWaitlistOfferMessage({
      patientName: item.patientName,
      doctorName: targetSlot?.doctorName || item.preferredDoctorName,
      startsAt: targetSlot?.startsAt || new Date().toISOString(),
      clinicName,
    });

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(msg).then(() => {
        setContactedPatients((prev) => new Set(prev).add(item.id));
        showToast("Текст 152-ФЗ скопирован в буфер обмена", "success");
      });
    }
  };

  // 1-Click Booking into Freed Target Slot with 152-FZ messaging
  const handleOneClickBookSlot = async (item: WaitlistCandidateItem) => {
    if (loadingId === item.id) return;
    setLoadingId(item.id);
    try {
      if (onBookSlot && targetSlot) {
        await onBookSlot(item, targetSlot);
      } else if (targetSlot) {
        // If slot has appointmentId, patch the cancelled appointment
        if (targetSlot.appointmentId) {
          const patchRes = await fetch(
            `/api/appointments/${encodeURIComponent(targetSlot.appointmentId)}`,
            {
              method: "PATCH",
              headers: waitlistWriteHeaders(),
              body: JSON.stringify({
                patientId: item.patientId,
                status: "planned",
                reason:
                  item.treatmentCategory ||
                  item.notes ||
                  targetSlot.reason ||
                  "Запись из листа ожидания (посадка в окно)",
                comment: `Посадка из листа ожидания: пациент ${item.patientName || ""}`,
                assistantUserId: "",
              }),
            },
          );

          if (!patchRes.ok) {
            const err = await patchRes.json().catch(() => null);
            showToast(
              err?.message || "Не удалось занять окно расписания",
              "error",
            );
            return;
          }
        } else {
          // Create fresh appointment in the freed slot
          const postRes = await fetch("/api/appointments", {
            method: "POST",
            headers: waitlistWriteHeaders(),
            body: JSON.stringify({
              patientId: item.patientId,
              doctorUserId: targetSlot.doctorUserId,
              chairId: targetSlot.chairId,
              startsAt: targetSlot.startsAt,
              endsAt: targetSlot.endsAt,
              status: "planned",
              reason:
                item.treatmentCategory ||
                item.notes ||
                "Запись из листа ожидания",
              comment: "Посадка из листа ожидания в 1 клик",
              assistantUserId: "",
              clientMutationId: `waitlist-direct-${Date.now()}`,
            }),
          });

          if (!postRes.ok) {
            const err = await postRes.json().catch(() => null);
            showToast(
              err?.message || "Не удалось создать запись на прием",
              "error",
            );
            return;
          }
        }

        // Mark waitlist entry fulfilled
        await fetch(`/api/waitlist/${encodeURIComponent(item.id)}`, {
          method: "PUT",
          headers: waitlistWriteHeaders(),
          body: JSON.stringify({ status: "fulfilled" }),
        }).catch((e) =>
          logger.warn("Failed to mark waitlist item fulfilled", e),
        );
      } else {
        // Fallback: populate appointment draft in editor
        updateNewAppointmentDraft?.("patientId", item.patientId);
        if (item.preferredDoctorId) {
          updateNewAppointmentDraft?.("doctorUserId", item.preferredDoctorId);
        }
        onClose();
        focusNewAppointmentEditor?.();
        showToast(
          `Пациент «${item.patientName || ""}» выбран. Укажите время записи.`,
          "success",
        );
        return;
      }

      // 152-FZ Polite Message Generation & Clipboard Copy
      const offerMsg = generate152FzWaitlistOfferMessage({
        patientName: item.patientName,
        doctorName: targetSlot?.doctorName || item.preferredDoctorName,
        startsAt: targetSlot?.startsAt || new Date().toISOString(),
        clinicName,
      });

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(offerMsg).catch(() => {});
      }

      setBookedItemIds((prev) => new Set(prev).add(item.id));
      showToast(
        `Пациент «${item.patientName || "Пациент"}» записан в слот! Сообщение WhatsApp/SMS скопировано.`,
        "success",
        5000,
      );

      fetchWaitlist();
      onAppointmentCreated?.();
    } catch (err) {
      logger.error("Failed to book waitlist candidate", err);
      showToast("Ошибка при записи пациента в слот", "error");
    } finally {
      setLoadingId(null);
    }
  };

  // Mark waitlist item fulfilled
  const handleFulfill = async (item: WaitlistCandidateItem) => {
    if (loadingId === item.id) return;
    setLoadingId(item.id);
    try {
      const res = await fetch(`/api/waitlist/${encodeURIComponent(item.id)}`, {
        method: "PUT",
        headers: waitlistWriteHeaders(),
        body: JSON.stringify({ status: "fulfilled" }),
      });
      if (res.ok) {
        showToast(
          `${item.patientName || "Пациент"} отмечен как принятый`,
          "success",
        );
        fetchWaitlist();
      } else {
        showToast(await writeFailureText(res, "закрыть заявку"), "error");
      }
    } catch {
      showToast("Сервер клиники не ответил. Повторите попытку.", "error");
    } finally {
      setLoadingId(null);
    }
  };

  // Delete waitlist item
  const handleDelete = async (id: string) => {
    if (loadingId === id) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/waitlist/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: waitlistWriteHeaders(),
      });
      if (res.ok) {
        showToast("Запись удалена из листа ожидания", "success");
        fetchWaitlist();
      } else {
        showToast(await writeFailureText(res, "удалить запись"), "error");
      }
    } catch {
      showToast("Сервер клиники не ответил", "error");
    } finally {
      setLoadingId(null);
    }
  };

  // Fast 5-Second Waitlist Registration from Reception Desk
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    let effectivePatientId = selectedPatientId;

    setIsSubmitting(true);
    try {
      // If quick new patient mode, register patient in database first
      if (quickNewPatientMode) {
        const fName = quickFullName.trim();
        const fPhone = quickPhone.trim();
        if (!fName && !fPhone) {
          showToast("Укажите имя или телефон пациента", "warning");
          setIsSubmitting(false);
          return;
        }

        try {
          const patRes = await fetch("/api/patients", {
            method: "POST",
            headers: waitlistWriteHeaders(),
            body: JSON.stringify({
              fullName: fName || `Пациент (${fPhone})`,
              phone: fPhone || null,
            }),
          });
          if (patRes.ok) {
            const patData = await patRes.json();
            if (patData?.id) {
              effectivePatientId = patData.id;
            }
          }
        } catch {
          // Fallback optimistic ID
          effectivePatientId = `pat-wait-${Date.now()}`;
        }
      }

      if (!effectivePatientId) {
        showToast("Выберите или укажите пациента", "warning");
        setIsSubmitting(false);
        return;
      }

      const urgencyCfg = URGENCY_CONFIG[addUrgency];
      const priorityLevel =
        addUrgency === "acute_pain"
          ? "high"
          : addUrgency === "ortho_endo"
            ? "medium"
            : "low";

      const preferredTimeRanges =
        addPreferredTime !== "any"
          ? [{ day: "any", slot: addPreferredTime }]
          : [];

      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: waitlistWriteHeaders(),
        body: JSON.stringify({
          patientId: effectivePatientId,
          preferredDoctorId: preferredDoctorId || null,
          priorityLevel,
          preferredTimeRanges,
        }),
      });

      if (res.ok) {
        showToast(
          `Пациент добавлен в лист ожидания (${urgencyCfg.shortLabel}) за 5 сек!`,
          "success",
        );
        setSelectedPatientId("");
        setQuickFullName("");
        setQuickPhone("");
        setQuickNewPatientMode(false);
        setNotes("");
        setIsAddFormOpen(false);
        fetchWaitlist();
      } else {
        showToast(
          await writeFailureText(res, "добавить в лист ожидания"),
          "error",
        );
      }
    } catch {
      showToast("Ошибка соединения с сервером клиники", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nearest free slots lookup when drawer is opened generally without targetSlot
  const fallbackFreeSlots = useMemo(() => {
    if (targetSlot) return [];
    const today = new Date().toISOString().slice(0, 10);
    const days = findDoctorFreeSlots({
      startDate: today,
      horizonDays: 3,
      durationMinutes: 30,
      appointments: dashboard?.appointments ?? [],
      chairs: dashboard?.clinicSettings?.chairs ?? [],
    });
    const flat: (DoctorFreeSlot & {
      dateFormatted: string;
      doctorName?: string;
    })[] = [];
    for (const day of days) {
      for (const s of day.slots) {
        const doc = staff.find((m: any) => m.id === s.doctorId);
        flat.push({
          ...s,
          dateFormatted: day.dateFormatted,
          doctorName: doc?.fullName || doc?.name || "Дежурный врач",
        });
        if (flat.length >= 6) break;
      }
      if (flat.length >= 6) break;
    }
    return flat;
  }, [
    targetSlot,
    dashboard?.appointments,
    dashboard?.clinicSettings?.chairs,
    staff,
  ]);

  // Filtered & scored candidates
  const filteredCandidates = useMemo(() => {
    return filterWaitlistCandidates(items, {
      searchQuery,
      urgencyFilter: selectedUrgency,
      doctorFilter: selectedDoctorFilter,
      onlySameDoctor: Boolean(onlySameDoctor && targetSlot?.doctorUserId),
      targetSlot: targetSlot ?? null,
    });
  }, [
    items,
    searchQuery,
    selectedUrgency,
    selectedDoctorFilter,
    onlySameDoctor,
    targetSlot,
  ]);

  if (!isOpen) return null;

  // Minimized Floating Capsule (Ergonomics)
  if (isMinimized) {
    const minimizedContent = (
      <div className="fixed top-3.5 right-4 z-50 animate-in fade-in-50 duration-150">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="h-9 px-3.5 bg-[var(--paper-strong)] border border-[var(--line-strong)] shadow-xl rounded-full flex items-center gap-2 text-xs font-bold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all cursor-pointer backdrop-blur-md"
          title="Развернуть лист ожидания"
          data-testid="waitlist-drawer-expand-btn"
        >
          <Calendar className="w-4 h-4 text-[var(--teal)] shrink-0" />
          <span>Лист ожидания ({items.length})</span>
          {targetSlot && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          )}
        </button>
      </div>
    );
    return typeof document !== "undefined"
      ? createPortal(minimizedContent, document.body)
      : minimizedContent;
  }

  const drawerContent = (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs"
      data-testid="waitlist-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Лист ожидания и автозаполнение отмен"
    >
      {/* Backdrop button */}
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Закрыть шторку листа ожидания"
      />

      {/* Main Drawer Surface: Desktop Ergonomic Panel (max-w-md / 460px) */}
      <div
        className="relative w-full max-w-lg h-full bg-[var(--paper)] border-l border-[var(--line)] shadow-2xl flex flex-col z-10 text-[var(--ink)] animate-slide-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header: 32-36px toolbar elements, Hick's law, Apple HIG */}
        <div className="p-3.5 sm:p-4 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-[var(--teal)]/15 text-[var(--teal)] shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-[var(--ink)] truncate m-0">
                Лист ожидания
              </h3>
              <p className="text-[11px] text-[var(--muted)] truncate m-0">
                {targetSlot
                  ? "Подбор пациентов на освободившееся окно"
                  : `В очереди: ${items.length} пациентов`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsAddFormOpen((prev) => !prev)}
              className={`h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isAddFormOpen
                  ? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)]"
                  : "bg-[var(--paper)] hover:bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)]"
              }`}
              title="Быстро добавить пациента в лист ожидания со стойки за 5 секунд"
              data-testid="waitlist-quick-add-toggle-btn"
            >
              <UserPlus className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">+ В очередь (5 сек)</span>
              <span className="sm:hidden">+ В очередь</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
              title="Свернуть шторку"
              aria-label="Свернуть"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
              aria-label="Закрыть"
              data-testid="waitlist-drawer-close-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Target Slot Banner (when opened upon cancellation) */}
        {targetSlot && (
          <div
            className="p-3 mx-3.5 sm:mx-4 mt-3 rounded-xl bg-gradient-to-r from-[var(--teal)]/15 via-[var(--teal)]/10 to-teal-500/5 border border-[var(--teal)]/30 flex flex-col gap-2 shrink-0 shadow-2xs"
            data-testid="waitlist-target-slot-banner"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--teal-dark,var(--teal))]">
                <Zap className="w-4 h-4 text-amber-400 fill-current shrink-0" />
                <span>Освободившийся слот для автозаполнения:</span>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30">
                Горящее окно
              </span>
            </div>

            <div className="text-xs text-[var(--ink)] font-semibold flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                {new Date(targetSlot.startsAt).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "short",
                  weekday: "short",
                })}{" "}
                {targetSlot.startsAt.includes("T")
                  ? targetSlot.startsAt.split("T")[1]?.slice(0, 5)
                  : ""}
                –
                {targetSlot.endsAt.includes("T")
                  ? targetSlot.endsAt.split("T")[1]?.slice(0, 5)
                  : ""}
              </span>
              {targetSlot.doctorName && (
                <span className="truncate max-w-[200px]">
                  · Врач: {targetSlot.doctorName}
                </span>
              )}
              {targetSlot.chairName && (
                <span className="truncate max-w-[140px]">
                  · {targetSlot.chairName}
                </span>
              )}
            </div>

            {targetSlot.freedBecause && (
              <div className="text-[11px] text-[var(--muted)] italic truncate">
                Причина освобождения: {targetSlot.freedBecause}
              </div>
            )}
          </div>
        )}

        {/* 5-Second Reception Waitlist Registration Form (Collapsible) */}
        {isAddFormOpen && (
          <form
            onSubmit={handleQuickAdd}
            className="p-3.5 mx-3.5 sm:mx-4 mt-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--teal)]/40 space-y-3 shrink-0 animate-in fade-in zoom-in-95 duration-100"
            data-testid="waitlist-quick-add-form"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--teal-dark,var(--teal))] flex items-center gap-1.5 m-0">
                <UserPlus className="w-3.5 h-3.5 shrink-0" />
                Добавить пациента в очередь за 5 секунд
              </h4>
              <button
                type="button"
                onClick={() => setIsAddFormOpen(false)}
                className="text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                Свернуть
              </button>
            </div>

            {/* Patient Mode Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--muted)] font-semibold">
                  Пациент *
                </span>
                <div className="inline-flex rounded-md p-0.5 bg-[var(--paper)] border border-[var(--line)] text-[11px]">
                  <button
                    type="button"
                    onClick={() => setQuickNewPatientMode(false)}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      !quickNewPatientMode
                        ? "bg-[var(--teal)] text-white font-bold"
                        : "text-[var(--muted)]"
                    }`}
                  >
                    Из базы
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickNewPatientMode(true)}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      quickNewPatientMode
                        ? "bg-[var(--teal)] text-white font-bold"
                        : "text-[var(--muted)]"
                    }`}
                  >
                    Новый
                  </button>
                </div>
              </div>

              {!quickNewPatientMode ? (
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full h-8 px-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
                  required={!quickNewPatientMode}
                  data-testid="waitlist-add-patient-select"
                >
                  <option value="">-- Выберите пациента из базы --</option>
                  {patientsList.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} {p.phone ? `(${p.phone})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={quickFullName}
                    onChange={(e) => setQuickFullName(e.target.value)}
                    placeholder="ФИО пациента *"
                    className="h-8 px-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] outline-none focus:ring-1 focus:ring-[var(--teal)]"
                    autoFocus
                    data-testid="waitlist-quick-name-input"
                  />
                  <input
                    type="tel"
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    placeholder="+7 (___) ___-__-__"
                    className="h-8 px-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] outline-none focus:ring-1 focus:ring-[var(--teal)]"
                    data-testid="waitlist-quick-phone-input"
                  />
                </div>
              )}
            </div>

            {/* Urgency 4-Pill Selector */}
            <div className="space-y-1">
              <span className="text-xs text-[var(--muted)] font-semibold block">
                Срочность обращения *
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(
                  ["acute_pain", "ortho_endo", "hygiene", "routine"] as const
                ).map((u) => {
                  const cfg = URGENCY_CONFIG[u];
                  const isSel = addUrgency === u;
                  return (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setAddUrgency(u)}
                      className={`h-7 px-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center text-center ${
                        isSel
                          ? `${cfg.badgeClass} ring-1 ring-offset-0`
                          : "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
                      }`}
                    >
                      {cfg.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Doctor & Preferred Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-[var(--muted)] font-semibold block mb-0.5">
                  Желаемый врач
                </span>
                <select
                  value={preferredDoctorId}
                  onChange={(e) => setPreferredDoctorId(e.target.value)}
                  className="w-full h-8 px-2 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] outline-none focus:ring-1 focus:ring-[var(--teal)]"
                >
                  <option value="">-- Любой врач клиники --</option>
                  {doctors.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName || d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="text-[11px] text-[var(--muted)] font-semibold block mb-0.5">
                  Удобное время
                </span>
                <select
                  value={addPreferredTime}
                  onChange={(e) => setAddPreferredTime(e.target.value)}
                  className="w-full h-8 px-2 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] outline-none focus:ring-1 focus:ring-[var(--teal)]"
                >
                  <option value="any">Любое время дня</option>
                  <option value="morning">Утро (08:00–12:00)</option>
                  <option value="day">День (12:00–17:00)</option>
                  <option value="evening">Вечер (17:00–21:00)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-8 bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)] font-bold rounded-lg text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              data-testid="waitlist-quick-submit-btn"
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                {isSubmitting
                  ? "Сохраняю..."
                  : "Записать в лист ожидания (+5 сек)"}
              </span>
            </button>
          </form>
        )}

        {/* 1-Row Clinical Filter Bar (Hick's Law: 32-36px toolbar, Mandate 8p) */}
        <div
          className="p-3 sm:px-4 border-b border-[var(--line)] flex flex-col gap-2 shrink-0 bg-[var(--paper)]"
          data-testid="waitlist-toolbar"
        >
          {/* Search input + doctor filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[140px]">
              <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по ФИО или телефону..."
                className="w-full pl-8 pr-2.5 h-8 bg-[var(--paper-soft)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:ring-1 focus:ring-[var(--teal)]"
                data-testid="waitlist-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {targetSlot?.doctorUserId && (
              <button
                type="button"
                onClick={() => setOnlySameDoctor((prev) => !prev)}
                className={`h-8 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
                  onlySameDoctor
                    ? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)]"
                    : "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
                title="Показывать только пациентов, согласных на этого же врача"
                data-testid="waitlist-filter-same-doctor-btn"
              >
                <span>По врачу</span>
              </button>
            )}
          </div>

          {/* Urgency Filter Chips: 4 fast pills */}
          <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap py-0.5 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedUrgency("all")}
              className={`h-7 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
                selectedUrgency === "all"
                  ? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)]"
                  : "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
              data-testid="waitlist-urgency-all"
            >
              Все ({items.length})
            </button>
            {(["acute_pain", "ortho_endo", "hygiene", "routine"] as const).map(
              (u) => {
                const cfg = URGENCY_CONFIG[u];
                const count = items.filter(
                  (i) => detectWaitlistUrgency(i) === u,
                ).length;
                const isSel = selectedUrgency === u;
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setSelectedUrgency(u)}
                    className={`h-7 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                      isSel
                        ? `${cfg.badgeClass} ring-1`
                        : "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
                    }`}
                    data-testid={`waitlist-urgency-${u}`}
                  >
                    <span>{cfg.shortLabel}</span>
                    {count > 0 && <span className="opacity-75">({count})</span>}
                  </button>
                );
              },
            )}
          </div>
        </div>

        {/* Candidates List / Queue */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5">
          {loadFailureStatus !== undefined ? (
            <PanelLoadFailure
              subject={WAITLIST_SUBJECT}
              status={loadFailureStatus}
              onRetry={fetchWaitlist}
            />
          ) : isLoading && items.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted)] text-sm">
              Загружаем лист ожидания…
            </div>
          ) : filteredCandidates.length === 0 ? (
            <EmptyState
              icon={<Calendar size={24} />}
              title={
                searchQuery || selectedUrgency !== "all" || onlySameDoctor
                  ? "По выбранным фильтрам совпадений нет"
                  : WAITLIST_SUBJECT.emptyTitle
              }
              description={
                searchQuery || selectedUrgency !== "all" || onlySameDoctor
                  ? "Сбросьте фильтры или добавьте нового пациента в лист ожидания за 5 секунд."
                  : WAITLIST_SUBJECT.emptyHint
              }
              glass={false}
              action={
                <button
                  type="button"
                  onClick={() => {
                    if (
                      searchQuery ||
                      selectedUrgency !== "all" ||
                      onlySameDoctor
                    ) {
                      setSearchQuery("");
                      setSelectedUrgency("all");
                      setOnlySameDoctor(false);
                    } else {
                      setIsAddFormOpen(true);
                    }
                  }}
                  className="h-8 px-3 rounded-lg bg-[var(--teal)] text-[var(--on-teal)] font-bold text-xs inline-flex items-center gap-1.5 hover:brightness-105 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {searchQuery || selectedUrgency !== "all" || onlySameDoctor
                      ? "Сбросить фильтры"
                      : "+ Добавить в лист ожидания"}
                  </span>
                </button>
              }
            />
          ) : (
            <ul
              className="space-y-2.5 list-none m-0 p-0"
              data-testid="waitlist-candidates-list"
            >
              {filteredCandidates.map(({ item, scoring }, idx) => {
                const urgencyCfg = URGENCY_CONFIG[scoring.urgency];
                const isContacted = contactedPatients.has(item.id);
                const isBooked = bookedItemIds.has(item.id);
                const targetMatchSlot = targetSlot;

                // Fallback matched slot if no explicit targetSlot provided
                const fallbackSlot =
                  !targetMatchSlot &&
                  ((item.preferredDoctorId
                    ? fallbackFreeSlots.find(
                        (s) => s.doctorId === item.preferredDoctorId,
                      )
                    : null) ||
                    fallbackFreeSlots[0]);

                return (
                  <li
                    key={item.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/json",
                        JSON.stringify({ type: "waitlist_item", item }),
                      );
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl p-3 flex flex-col gap-2 hover:border-[var(--teal)]/40 transition-all cursor-grab active:cursor-grabbing"
                    data-testid={`waitlist-candidate-${item.id}`}
                  >
                    {/* Top Row: Index, Name, Urgency badge */}
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-[var(--muted)] shrink-0">
                          #{idx + 1}
                        </span>
                        <h5
                          className="font-bold text-sm text-[var(--ink)] truncate max-w-[240px] m-0"
                          title={item.patientName || "Пациент"}
                        >
                          {item.patientName || "Неизвестный пациент"}
                        </h5>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {targetSlot && (
                          <span
                            className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                              scoring.score >= 80
                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                : scoring.score >= 50
                                  ? "bg-sky-500/20 text-sky-700 dark:text-sky-300"
                                  : "bg-slate-500/20 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {scoring.score}%
                          </span>
                        )}
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${urgencyCfg.badgeClass}`}
                        >
                          {urgencyCfg.shortLabel}
                        </span>
                      </div>
                    </div>

                    {/* Details: Phone, Doctor, Reasons */}
                    <div className="text-xs text-[var(--muted)] flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      {item.patientPhone ? (
                        <span className="font-semibold text-[var(--ink-2)] shrink-0 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[var(--teal)]" />
                          {item.patientPhone}
                        </span>
                      ) : (
                        <span className="shrink-0 italic">
                          телефон не указан
                        </span>
                      )}

                      {item.preferredDoctorName && (
                        <span className="truncate max-w-[180px]">
                          · Врач: {item.preferredDoctorName}
                        </span>
                      )}

                      {scoring.matchReasons.map((r) => (
                        <span
                          key={r}
                          className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--teal)]/10 text-[var(--teal-dark,var(--teal))] font-medium shrink-0"
                        >
                          {r}
                        </span>
                      ))}
                    </div>

                    {item.notes && (
                      <p className="text-xs italic text-[var(--muted)] m-0 line-clamp-2">
                        "{item.notes}"
                      </p>
                    )}

                    {/* Action buttons: Law of Miller (strictly <= 2 direct buttons) + MoreVertical */}
                    <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-[var(--line)]/50 justify-between">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {/* Button 1 (Main): 1-Click Booking */}
                        {targetMatchSlot ? (
                          <button
                            type="button"
                            disabled={loadingId === item.id}
                            onClick={() => handleOneClickBookSlot(item)}
                            className={`h-8 px-3 rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 ${
                              isBooked
                                ? "bg-emerald-600 text-white"
                                : "bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)]"
                            }`}
                            title="Записать пациента в освободившийся слот в 1 клик с генерацией шаблона 152-ФЗ"
                            data-testid={`waitlist-book-slot-btn-${item.id}`}
                          >
                            <Zap
                              size={13}
                              className="shrink-0 text-amber-300 fill-current"
                            />
                            <span>
                              {loadingId === item.id
                                ? "Записываем..."
                                : isBooked
                                  ? "Записан в слот"
                                  : "В окно в 1 клик"}
                            </span>
                          </button>
                        ) : fallbackSlot ? (
                          <button
                            type="button"
                            disabled={loadingId === item.id}
                            onClick={() =>
                              handleOneClickBookSlot({
                                ...item,
                                notes: `Посадка на ${fallbackSlot.dateFormatted} ${fallbackSlot.startTime}`,
                              })
                            }
                            className="h-8 px-2.5 rounded-lg bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)] text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                            title={`Записать на ${fallbackSlot.dateFormatted} в ${fallbackSlot.startTime}`}
                          >
                            <Zap
                              size={13}
                              className="shrink-0 text-amber-300"
                            />
                            <span>
                              {fallbackSlot.dateFormatted}{" "}
                              {fallbackSlot.startTime}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              updateNewAppointmentDraft?.(
                                "patientId",
                                item.patientId,
                              );
                              onClose();
                              focusNewAppointmentEditor?.();
                            }}
                            className="h-8 px-3 rounded-lg bg-[var(--teal-surface)] hover:bg-[var(--teal-soft)] text-[var(--teal-dark)] font-semibold text-xs transition-colors cursor-pointer"
                          >
                            Записать на прием
                          </button>
                        )}

                        {/* Button 2: WhatsApp direct */}
                        {item.patientPhone && (
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(item)}
                            className={`h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer border shrink-0 ${
                              isContacted
                                ? "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30"
                                : "bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
                            }`}
                            title="Предложить окно через WhatsApp (шаблон 152-ФЗ)"
                            data-testid={`waitlist-whatsapp-btn-${item.id}`}
                          >
                            {isContacted ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span>Предложено</span>
                              </>
                            ) : (
                              <>
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span>WhatsApp</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Secondary Actions Context Menu (...) */}
                      <div className="relative shrink-0 waitlist-item-menu-container">
                        <button
                          type="button"
                          disabled={loadingId === item.id}
                          onClick={() =>
                            setOpenMenuId(
                              openMenuId === item.id ? null : item.id,
                            )
                          }
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                          title="Дополнительные действия"
                          aria-label="Опции"
                          data-testid={`waitlist-more-btn-${item.id}`}
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {openMenuId === item.id && (
                          <div
                            className="absolute right-0 bottom-full mb-1 z-50 flex flex-col gap-0.5 p-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl min-w-[210px] text-xs animate-in fade-in zoom-in-95 duration-100"
                            role="menu"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                handleCopySms(item);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors flex items-center gap-2 cursor-pointer"
                              role="menuitem"
                              data-testid={`waitlist-copy-sms-${item.id}`}
                            >
                              <Copy className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                              <span>Скопировать SMS (152-ФЗ)</span>
                            </button>

                            {item.patientPhone && (
                              <a
                                href={`tel:${item.patientPhone.replace(/[^\d+]/g, "")}`}
                                onClick={() => setOpenMenuId(null)}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--teal)] hover:bg-[var(--paper-soft)] transition-colors flex items-center gap-2 cursor-pointer"
                                role="menuitem"
                              >
                                <Phone className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
                                <span>Позвонить</span>
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                handleFulfill(item);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-2 cursor-pointer"
                              role="menuitem"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>Отметить: принят</span>
                            </button>

                            <div className="my-0.5 border-t border-[var(--line)]" />

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                handleDelete(item.id);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2 cursor-pointer"
                              role="menuitem"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span>Удалить из листа</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(drawerContent, document.body)
    : drawerContent;
}

export default WaitlistDrawer;
