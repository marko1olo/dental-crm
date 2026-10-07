import {
  Calendar,
  Clock,
  Minus,
  Plus,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { EmptyState } from "../EmptyState";
import { PanelLoadFailure } from "../PanelLoadFailure";
import {
  type TargetSlotInfo,
  type WaitlistCandidateItem,
  type WaitlistUrgency,
  detectWaitlistUrgency,
  extractPatientPoliteName,
  filterWaitlistCandidates,
  generate152FzWaitlistOfferMessage,
  openWhatsAppChat,
  openTelegramChat,
} from "./waitlistCancellationEngine";
import { WaitlistQuickAddForm } from "./WaitlistQuickAddForm";
import { WaitlistToolbar } from "./WaitlistToolbar";
import { WaitlistCandidateCard } from "./WaitlistCandidateCard";
import {
  useWaitlistDrawerOperations,
  WAITLIST_SUBJECT,
  waitlistWriteHeaders,
  writeFailureText,
} from "./useWaitlistDrawerOperations";

export type { TargetSlotInfo, WaitlistCandidateItem, WaitlistUrgency };
export {
  generate152FzWaitlistOfferMessage,
  detectWaitlistUrgency,
  extractPatientPoliteName,
  openWhatsAppChat,
  openTelegramChat,
  WaitlistQuickAddForm,
  WaitlistToolbar,
  WaitlistCandidateCard,
  useWaitlistDrawerOperations,
  waitlistWriteHeaders,
  writeFailureText,
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

  const ctx = useOptionalAppLogicContext();
  const dashboard = propDashboard || ctx?.dashboard;
  const auth = propAuth || ctx?.auth;

  const ops = useWaitlistDrawerOperations({
    isOpen,
    targetSlot,
    onBookSlot,
    updateNewAppointmentDraft,
    focusNewAppointmentEditor,
    onAppointmentCreated,
    onClose,
    dashboard,
    auth,
  });

  const [isMinimized, setIsMinimized] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
        if (ops.isAddFormOpen) {
          ops.setIsAddFormOpen(false);
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, openMenuId, ops.isAddFormOpen, ops.setIsAddFormOpen, onClose]);

  // Sync doctor preference if targetSlot changes
  useEffect(() => {
    if (targetSlot?.doctorUserId) {
      ops.setPreferredDoctorId(targetSlot.doctorUserId);
      setOnlySameDoctor(true);
    }
  }, [targetSlot?.doctorUserId, ops.setPreferredDoctorId]);

  // Filtered & scored candidates
  const filteredCandidates = useMemo(() => {
    return filterWaitlistCandidates(ops.items, {
      searchQuery,
      urgencyFilter: selectedUrgency,
      doctorFilter: selectedDoctorFilter,
      onlySameDoctor: Boolean(onlySameDoctor && targetSlot?.doctorUserId),
      targetSlot: targetSlot ?? null,
    });
  }, [
    ops.items,
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
          <span>Лист ожидания ({ops.items.length})</span>
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
                  : `В очереди: ${ops.items.length} пациентов`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => ops.setIsAddFormOpen((prev) => !prev)}
              className={`h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                ops.isAddFormOpen
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
              <Minus className="w-4 h-4" />
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
        <WaitlistQuickAddForm
          isOpen={ops.isAddFormOpen}
          onClose={() => ops.setIsAddFormOpen(false)}
          isSubmitting={ops.isSubmitting}
          selectedPatientId={ops.selectedPatientId}
          onSelectPatientId={ops.setSelectedPatientId}
          quickNewPatientMode={ops.quickNewPatientMode}
          onToggleQuickNewPatientMode={ops.setQuickNewPatientMode}
          quickFullName={ops.quickFullName}
          onChangeQuickFullName={ops.setQuickFullName}
          quickPhone={ops.quickPhone}
          onChangeQuickPhone={ops.setQuickPhone}
          preferredDoctorId={ops.preferredDoctorId}
          onChangePreferredDoctorId={ops.setPreferredDoctorId}
          addUrgency={ops.addUrgency}
          onChangeAddUrgency={ops.setAddUrgency}
          addPreferredTime={ops.addPreferredTime}
          onChangeAddPreferredTime={ops.setAddPreferredTime}
          onSubmit={ops.handleQuickAdd}
          patientsList={patientsList}
          doctors={doctors}
        />

        {/* 1-Row Clinical Filter Bar */}
        <WaitlistToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedUrgency={selectedUrgency}
          onSelectUrgency={setSelectedUrgency}
          onlySameDoctor={onlySameDoctor}
          onToggleOnlySameDoctor={() => setOnlySameDoctor((prev) => !prev)}
          hasTargetDoctor={Boolean(targetSlot?.doctorUserId)}
          items={ops.items}
        />

        {/* Candidates List / Queue */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5">
          {ops.loadFailureStatus !== undefined ? (
            <PanelLoadFailure
              subject={WAITLIST_SUBJECT}
              status={ops.loadFailureStatus}
              onRetry={ops.fetchWaitlist}
            />
          ) : ops.isLoading && ops.items.length === 0 ? (
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
                      ops.setIsAddFormOpen(true);
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
                const isContacted = ops.contactedPatients.has(item.id);
                const isBooked = ops.bookedItemIds.has(item.id);
                const targetMatchSlot = targetSlot;

                // Fallback matched slot if no explicit targetSlot provided
                const fallbackSlot = !targetMatchSlot
                  ? (item.preferredDoctorId
                      ? ops.fallbackFreeSlots.find(
                          (s) => s.doctorId === item.preferredDoctorId,
                        )
                      : null) ||
                    ops.fallbackFreeSlots[0] ||
                    null
                  : null;

                return (
                  <WaitlistCandidateCard
                    key={item.id}
                    item={item}
                    scoring={scoring}
                    idx={idx}
                    targetSlot={targetSlot}
                    fallbackSlot={fallbackSlot}
                    isContacted={isContacted}
                    isBooked={isBooked}
                    loadingId={ops.loadingId}
                    openMenuId={openMenuId}
                    onToggleMenu={setOpenMenuId}
                    onOneClickBookSlot={ops.handleOneClickBookSlot}
                    onSendWhatsApp={ops.handleSendWhatsApp}
                    onCopySms={ops.handleCopySms}
                    onFulfill={ops.handleFulfill}
                    onDelete={ops.handleDelete}
                    onSelectForDraft={(it) => {
                      updateNewAppointmentDraft?.("patientId", it.patientId);
                      onClose();
                      focusNewAppointmentEditor?.();
                    }}
                  />
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
