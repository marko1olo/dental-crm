import React from "react";
import { createPortal } from "react-dom";
import {
  Copy,
  Flame,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { resolveChairDutyDoctor } from "./chairRosterMath";
import type {
  QuickBookingDrawerProps,
  QuickBookingSlotInfo,
} from "./QuickBookingDrawerTypes";
import {
  useQuickBookingDrawerState,
  type QuickBookingDrawerState,
} from "./useQuickBookingDrawerState";
import { useUiSurfaceStore } from "../../store/uiSurfaceStore";
import { useIsMobile } from "../../hooks/useIsMobile";
import { QuickBookingDrawerPatientPart } from "./quickBookingDrawer/QuickBookingDrawerPatientPart";
import { QuickBookingServiceSection } from "./QuickBookingServiceSection";

// Anti-Matryoshka Law (Mandate 8d): <SlotConflictModal inline={true} /> renders non-blocking conflict options inside QuickBookingServiceSection.

export { resolveChairDutyDoctor };
export type { QuickBookingDrawerProps, QuickBookingSlotInfo };

// --- 1. HEADER COMPONENT & HELPERS (Mandate 8b / 8zi Sweet Spot) ---

export interface QuickBookingDrawerHeaderProps {
  isEmergencyMode: boolean;
  isEditing?: boolean | undefined;
  startsAtLocal: string;
  durationMinutes: number;
  chairName?: string | null | undefined;
  onClose: () => void;
}

export function formatSlotRange(startsAtLocal: string, durationMinutes: number) {
  if (!startsAtLocal) return "Быстрая запись";
  const [datePart, timePart] = startsAtLocal.split("T");
  if (!timePart) return startsAtLocal;
  const timeSub = timePart.slice(0, 5);
  const colonIdx = timeSub.indexOf(":");
  const hh = colonIdx > -1 ? Number(timeSub.slice(0, colonIdx)) : 0;
  const mm = colonIdx > -1 ? Number(timeSub.slice(colonIdx + 1)) : 0;
  const startTotal = (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
  const endTotal = startTotal + (durationMinutes || 30);
  const endH = Math.floor(endTotal / 60) % 24;
  const endM = endTotal % 60;
  const endTimeStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  return `${datePart ?? ""} · ${timeSub} – ${endTimeStr} (${durationMinutes} мин)`;
}

export function QuickBookingDrawerHeader({
  isEmergencyMode,
  isEditing,
  startsAtLocal,
  durationMinutes,
  chairName,
  onClose,
}: QuickBookingDrawerHeaderProps) {
  return (
    <div
      className={`p-5 border-b flex items-center justify-between transition-colors ${
        isEmergencyMode
          ? "bg-rose-500/15 dark:bg-rose-950/50 border-rose-500/40 text-rose-900 dark:text-rose-100"
          : "bg-[var(--paper-soft)] border-[var(--line)]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-2.5 rounded-xl border transition-all ${
            isEmergencyMode
              ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50 ring-2 ring-rose-500/40 animate-pulse"
              : "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] border-[var(--teal,var(--brand-primary))]/20"
          }`}
        >
          {isEmergencyMode ? (
            <Flame size={22} className="text-rose-600 dark:text-rose-400" />
          ) : (
            <Sparkles size={20} />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold tracking-tight text-[var(--ink)] m-0">
              {isEmergencyMode
                ? "Срочная запись: острая боль"
                : isEditing
                  ? "Редактирование приёма"
                  : "Быстрая запись на прием"}
            </h3>
            {isEmergencyMode && (
              <span
                className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider animate-pulse shadow-xs"
                data-testid="cito-header-badge"
              >
                Острая боль
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--muted)] m-0 mt-0.5" data-testid="quick-booking-time-range">
            {formatSlotRange(startsAtLocal, durationMinutes)}
            {chairName ? ` · ${chairName}` : ""}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
        aria-label="Закрыть"
        data-testid="quick-booking-close-btn"
      >
        <X size={20} />
      </button>
    </div>
  );
}

// --- 2. FOOTER COMPONENT (Strictly 1 Primary CTA + Canonical Secondary Buttons) ---

export interface QuickBookingDrawerFooterProps {
  isSubmitting: boolean;
  hasCollision: boolean;
  isDirty: boolean;
  onSubmit: () => void;
  onRequestClose: () => void;
  onDiscardDraft: () => void;
  onCopyConfirmation: () => void;
}

export function QuickBookingDrawerFooter({
  isSubmitting,
  hasCollision,
  isDirty,
  onSubmit,
  onRequestClose,
  onDiscardDraft,
  onCopyConfirmation,
}: QuickBookingDrawerFooterProps) {
  return (
    <div className="sticky bottom-0 z-20 p-4 sm:p-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] border-t border-[var(--line)] bg-[var(--paper-soft)]/95 backdrop-blur-md flex flex-col gap-2 shrink-0 shadow-lg">
      <button
        type="button"
        disabled={false}
        onClick={onSubmit}
        aria-busy={isSubmitting}
        data-testid="quick-drawer-save-btn"
        className="primary-button dente-btn dente-btn-primary w-full min-h-[44px] h-[52px] sm:h-[44px] font-semibold text-sm transition-all cursor-pointer select-none active:scale-[0.99] inline-flex items-center justify-center gap-2 bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white shadow-xs"
      >
        <Plus size={16} className="shrink-0 stroke-[2.5]" />
        <span className="whitespace-nowrap font-bold">
          {isSubmitting ? (
            "Сохраняю запись…"
          ) : hasCollision ? (
            "✓ Записать на это время"
          ) : (
            <>
              ✓ Записать пациента
              <span className="hidden sm:inline font-normal opacity-90"> (Ctrl+Enter)</span>
            </>
          )}
        </span>
      </button>

      <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full">
        <button
          type="button"
          onClick={onRequestClose}
          aria-busy={isSubmitting}
          data-testid="quick-booking-cancel-btn"
          className="secondary-button min-h-[44px] px-2.5 sm:px-3 border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm shrink-0"
        >
          Отмена (Esc)
        </button>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isDirty && (
            <button
              type="button"
              onClick={onDiscardDraft}
              aria-busy={isSubmitting}
              className="danger-button min-h-[44px] px-2.5 sm:px-3 text-xs shrink-0"
              title="Сбросить все введенные данные без сохранения черновика"
              data-testid="quick-booking-discard-draft-btn"
            >
              Сбросить
            </button>
          )}
          <button
            type="button"
            onClick={onCopyConfirmation}
            data-testid="quick-booking-copy-confirmation-btn"
            className="secondary-button min-h-[44px] px-2.5 sm:px-3 inline-flex items-center gap-1.5 text-xs shrink-0 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
            title="Скопировать детали записи для отправки пациенту в WhatsApp/Telegram"
          >
            <Copy size={14} className="text-[var(--teal)] shrink-0" />
            <span>Скопировать<span className="hidden sm:inline"> для пациента</span></span>
          </button>
        </div>
      </div>
    </div>
  );
}

// --- 3. BODY COMPONENT (Patient Search/Create + Service & Resource Matrix) ---

export interface QuickBookingDrawerBodyProps {
  state: QuickBookingDrawerState;
  props: QuickBookingDrawerProps;
}

export function QuickBookingDrawerBody({ state, props }: QuickBookingDrawerBodyProps) {
  const { dashboard, initialSlot, chairDoctorAssignments } = props;
  const {
    appointmentType,
    handleSelectAppointmentType,
    selectedPatient,
    doctors,
    assistants,
    chairs,
    isSoloClinic,
    currentChair,
    doctorUserId,
    setDoctorUserId,
    assistantUserId,
    setAssistantUserId,
    chairId,
    setChairId,
    startsAtLocal,
    setStartsAtLocal,
    durationMinutes,
    handleSelectDuration,
    status,
    setStatus,
    reason,
    setReason,
    comment,
    setComment,
    submitError,
    slotConflict,
    setSlotConflict,
    dutyDoc,
    dutyDoctorHours,
    handleSubmitBooking,
  } = state;

  return (
    <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-4" data-testid="quick-booking-scroll-body">
      <QuickBookingDrawerPatientPart state={state} props={props} />

      <QuickBookingServiceSection
        appointmentType={appointmentType}
        handleSelectAppointmentType={handleSelectAppointmentType}
        startsAtLocal={startsAtLocal}
        setStartsAtLocal={setStartsAtLocal}
        durationMinutes={durationMinutes}
        handleSelectDuration={handleSelectDuration}
        doctorUserId={doctorUserId}
        setDoctorUserId={setDoctorUserId}
        assistantUserId={assistantUserId}
        setAssistantUserId={setAssistantUserId}
        chairId={chairId}
        setChairId={setChairId}
        status={status}
        setStatus={setStatus}
        reason={reason}
        setReason={setReason}
        comment={comment}
        setComment={setComment}
        submitError={submitError}
        slotConflict={slotConflict}
        setSlotConflict={setSlotConflict}
        handleSubmitBooking={handleSubmitBooking}
        doctors={doctors}
        assistants={assistants}
        chairs={chairs}
        currentChair={currentChair}
        dutyDoc={dutyDoc}
        dutyDoctorHours={dutyDoctorHours}
        isSoloClinic={isSoloClinic}
        selectedPatientName={selectedPatient?.fullName}
        chairDoctorAssignments={chairDoctorAssignments}
        dashboard={dashboard}
        initialSlot={initialSlot}
      />
    </div>
  );
}

// --- 4. MAIN CANONICAL COMPONENT (Unified Fast Booking Drawer / Modal) ---

export function QuickBookingDrawer(props: QuickBookingDrawerProps) {
  const { isOpen, initialSlot } = props;
  const isMobile = useIsMobile();
  const state = useQuickBookingDrawerState(props);

  const isEmergencyMode =
    state.appointmentType === "emergency" ||
    Boolean(
      initialSlot?.isCitoEmergency ||
        initialSlot?.reason?.includes("CITO") ||
        initialSlot?.reason?.includes("Острая боль"),
    );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      state.handleRequestClose();
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void state.handleSubmitBooking(
        undefined,
        state.collision.hasCollision ? { overbookOverride: true } : undefined,
      );
    }
  };

  const isFullScreenStudioActive = useUiSurfaceStore(
    (s) => s.isFullScreenStudioActive,
  );
  if (!isOpen || isFullScreenStudioActive) return null;

  const drawerElement = (
    <div
      className={`fixed inset-0 z-[10005] flex ${isMobile ? "flex-col justify-end" : "justify-end"} bg-black/25 transition-opacity quick-booking-drawer-overlay`}
      data-testid="quick-booking-drawer"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.25)" }}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Быстрая запись на прием"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={state.handleRequestClose}
        aria-label="Закрыть быструю запись"
      />

      <div
        className={`relative w-full bg-[var(--paper)] flex flex-col z-10 text-[var(--ink)] overflow-hidden ${
          isMobile
            ? "max-h-[92dvh] rounded-t-[24px] border-t border-[var(--line)] shadow-[0_-12px_40px_rgba(0,0,0,0.25)] animate-slide-up"
            : "sm:w-[480px] sm:max-w-[480px] h-full border-l border-[var(--line)] shadow-2xl animate-slide-in"
        }`}
      >
        {isMobile && (
          <div
            className="w-full flex items-center justify-center pt-3 pb-1 shrink-0 bg-[var(--paper-soft)] cursor-grab active:cursor-grabbing border-b border-[var(--line-subtle,#e2e8f0)]/30"
            aria-hidden="true"
          >
            <div className="w-[36px] h-[5px] rounded-full bg-[var(--line-strong,var(--line))] hover:bg-[var(--muted)]/60 transition-colors" />
          </div>
        )}

        <QuickBookingDrawerHeader
          isEmergencyMode={isEmergencyMode}
          isEditing={state.isEditing}
          startsAtLocal={state.startsAtLocal}
          durationMinutes={state.durationMinutes}
          chairName={state.currentChair?.name || initialSlot?.chairName}
          onClose={state.handleRequestClose}
        />

        <QuickBookingDrawerBody state={state} props={props} />

        <QuickBookingDrawerFooter
          isSubmitting={state.isSubmitting}
          hasCollision={state.collision.hasCollision}
          isDirty={state.isDirty}
          onSubmit={() =>
            void state.handleSubmitBooking(
              undefined,
              state.collision.hasCollision ? { overbookOverride: true } : undefined,
            )
          }
          onRequestClose={state.handleRequestClose}
          onDiscardDraft={state.handleDiscardDraftAndClose}
          onCopyConfirmation={state.handleCopyBookingConfirmation}
        />
      </div>
    </div>
  );

  return typeof document !== "undefined" && document.body
    ? createPortal(drawerElement, document.body)
    : drawerElement;
}

export const AppointmentBookingModal = QuickBookingDrawer;
export default QuickBookingDrawer;
