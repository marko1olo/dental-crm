/**
 * WaitlistDrawer.tsx — Канонический интерфейс листа ожидания и умного заполнения окон DENTE
 * (Мандат 8b: Sweet Spot ~150-250 строк; Мандат 8am: 1 Primary CTA; Apple HIG: Bottom Sheet & Grouped Cards).
 */

import React, { useId } from "react";
import { createPortal } from "react-dom";
import { Inbox, X } from "lucide-react";
import type { Dashboard } from "@dental/shared";
import { useOptionalAppLogicContext, type AppLogicContextType } from "../../../contexts/AppLogicContext";
import { showToast } from "../../GlobalToast";
import type { TargetSlotInfo, WaitlistCandidateItem } from "./waitlistTypes";
export type { TargetSlotInfo, WaitlistCandidateItem } from "./waitlistTypes";
import { useWaitlistState } from "./useWaitlistState";
import type { AppointmentScheduleDraft } from "../view/scheduleViewTypes";
import { handleBookWaitlistSlot } from "../view/scheduleModalsModules/waitlistSlotBookingHandler";

// Decomposed Waitlist Modules (Mandate 8b Sweet Spot)
import { WaitlistSlotBanner } from "./modules/WaitlistSlotBanner";
import { WaitlistFilterBar } from "./modules/WaitlistFilterBar";
import { WaitlistCandidateCard } from "./modules/WaitlistCandidateCard";
import { WaitlistAddPatientForm } from "./modules/WaitlistAddPatientForm";

export interface WaitlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  targetSlot?: TargetSlotInfo | null;
  onBookSlot?: (patient: WaitlistCandidateItem, slot: TargetSlotInfo) => Promise<void> | void;
  updateNewAppointmentDraft?: (<K extends keyof AppointmentScheduleDraft>(key: K, value: AppointmentScheduleDraft[K]) => void) | undefined;
  focusNewAppointmentEditor?: (() => void) | undefined;
  onAppointmentCreated?: (() => void) | undefined;
  dashboard?: Dashboard | Partial<Dashboard> | Record<string, unknown> | null | undefined;
  auth?: AppLogicContextType["auth"];
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

  // [SCH-02]: Канонический обработчик бронирования слота из листа ожидания (SSOT: handleBookWaitlistSlot)
  const handleSlotBooking = async (candidate: WaitlistCandidateItem, slot: TargetSlotInfo) => {
    if (onBookSlot) {
      await onBookSlot(candidate, slot);
    } else {
      await handleBookWaitlistSlot({
        candidate,
        slot,
        dashboard,
        auth,
        loadDashboard: ctx?.loadDashboard,
        showToast,
        onSuccess: () => {
          if (updateNewAppointmentDraft) {
            updateNewAppointmentDraft("patientId", candidate.patientId);
            if (candidate.treatmentCategory) {
              updateNewAppointmentDraft("reason", candidate.treatmentCategory);
            }
            if (slot.doctorUserId) {
              updateNewAppointmentDraft("doctorUserId", slot.doctorUserId);
            }
            if (slot.startsAt) {
              updateNewAppointmentDraft("startsAt", slot.startsAt);
            }
            if (slot.endsAt) {
              updateNewAppointmentDraft("endsAt", slot.endsAt);
            }
            if (focusNewAppointmentEditor) {
              focusNewAppointmentEditor();
            }
          }
          onClose();
        },
      });
    }

    if (onAppointmentCreated) {
      onAppointmentCreated();
    }
  };

  const state = useWaitlistState({
    isOpen,
    targetSlot,
    onBookSlot: handleSlotBooking,
    onClose,
    dashboard,
    auth,
  });

  const titleId = useId();
  if (!isOpen) return null;

  const clinicName = dashboard?.clinicSettings?.name || "Стоматология DENTE";
  const staffDoctors = (dashboard?.clinicSettings?.staff || []).filter(
    (s: { role?: string }) => s.role === "doctor" || s.role === "dentist",
  );
  const clinicPatients = dashboard?.patients || [];

  const handleAssignDraft = (candidate: WaitlistCandidateItem) => {
    if (updateNewAppointmentDraft) {
      updateNewAppointmentDraft("patientId", candidate.patientId);
      if (focusNewAppointmentEditor) focusNewAppointmentEditor();
      onClose();
    }
  };

  const drawerContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="waitlist-drawer"
      className="fixed inset-0 z-[1200] flex items-end justify-center sm:items-stretch sm:justify-end bg-black/40 backdrop-blur-sm transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ overflowX: "hidden" }}
    >
      <div
        className="w-full max-w-full sm:max-w-[540px] max-h-[92dvh] sm:max-h-full h-auto sm:h-full flex flex-col bg-[var(--paper,#ffffff)] text-[var(--text,#0f172a)] shadow-2xl border-t sm:border-t-0 sm:border-l border-[var(--line,#e2e8f0)] transition-transform duration-300 ease-out rounded-t-[24px] sm:rounded-t-none sm:rounded-l-2xl pb-[max(12px,env(safe-area-inset-bottom))] sm:pb-0"
        style={{
          backgroundColor: "var(--paper, #ffffff)",
          color: "var(--text, #0f172a)",
        }}
      >
        {/* Мобильный Drag Handle по Apple HIG */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 cursor-grab">
          <div className="w-9 h-1.5 rounded-full bg-[var(--line-strong,var(--line,#cbd5e1))] opacity-70" />
        </div>

        {/* ШАПКА */}
        <header className="px-5 py-4 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between shrink-0">
          <div>
            <h2 id={titleId} className="text-lg font-bold tracking-tight text-[var(--text,#0f172a)]">
              Лист ожидания и быстрая запись
            </h2>
            <p className="text-xs text-[var(--text-muted,#64748b)] mt-0.5">
              {targetSlot
                ? `Подбор пациентов под освободившееся окно (${state.rankedCandidates.length})`
                : `Пациенты в очереди клиники (${state.items.length})`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-[var(--paper-subtle,#f1f5f9)] active:scale-95 text-[var(--text-muted,#64748b)] hover:text-[var(--text,#0f172a)] transition-all cursor-pointer"
            style={{ border: "none", background: "transparent" }}
            aria-label="Закрыть лист ожидания"
          >
            <X size={20} className="shrink-0" />
          </button>
        </header>

        {/* ПЛАШКА ЦЕЛЕВОГО СЛОТА (ЕСЛИ ОТКРЫТО ДЛЯ ЗАПОЛНЕНИЯ ОКНА) */}
        {targetSlot && (
          <WaitlistSlotBanner
            targetSlot={targetSlot}
            matchedCount={state.matchedCount}
          />
        )}

        {/* НАВИГАЦИОННЫЕ ВКЛАДКИ (Apple Segmented Control по Дизайн-Библии) */}
        <div className="px-3 sm:px-5 pt-3 pb-2 flex items-center justify-between gap-1.5 sm:gap-2 border-b border-[var(--line,#e2e8f0)] shrink-0">
          <div className="inline-flex p-1 bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-strong,#1e293b)] rounded-xl gap-1 shrink-0">
            {targetSlot && (
              <button
                type="button"
                onClick={() => state.setActiveTab("smart_match")}
                className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[44px] sm:min-h-[32px] flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  state.activeTab === "smart_match"
                    ? "bg-[var(--paper)] text-[var(--primary)] shadow-sm font-semibold"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
              >
                <span className="max-sm:hidden">Подбор на окно</span>
                <span className="sm:hidden">Подбор</span>
                <span className="opacity-80 text-[10px]">({state.rankedCandidates.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => state.setActiveTab("all_patients")}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[44px] sm:min-h-[32px] flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                state.activeTab === "all_patients"
                  ? "bg-[var(--paper)] text-[var(--primary)] shadow-sm font-semibold"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              <span className="max-sm:hidden">Все в очереди</span>
              <span className="sm:hidden">Все</span>
              <span className="opacity-80 text-[10px]">({state.items.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => state.setActiveTab("add_new")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all min-h-[44px] sm:min-h-[34px] flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
              state.activeTab === "add_new"
                ? "bg-[var(--primary)] text-white border-[var(--primary)] hover:bg-[var(--primary-hover)] shadow-sm"
                : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
            }`}
          >
            <span className="max-sm:hidden">+ Добавить пациента</span>
            <span className="sm:hidden">+ Добавить</span>
          </button>
        </div>

        {/* ТЕЛО: СПИСКИ ИЛИ ФОРМА */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {state.error && (
            <div className="p-3 rounded-xl bg-[var(--danger-soft,rgba(239,68,68,0.1))] text-[var(--danger,#ef4444)] text-xs flex justify-between items-center border border-[var(--danger-border,rgba(239,68,68,0.2))]">
              <span>{state.error}</span>
              <button type="button" onClick={() => state.setError(null)} className="text-[var(--danger,#ef4444)] ml-2 cursor-pointer hover:opacity-80 p-1 rounded">
                <X size={16} className="shrink-0" />
              </button>
            </div>
          )}

          {/* ВКЛАДКА ПОДБОРА ИЛИ ВСЕХ КАНДИДАТОВ */}
          {state.activeTab !== "add_new" ? (
            <>
              {/* ПАНЕЛЬ ФИЛЬТРОВ */}
              <WaitlistFilterBar
                searchQuery={state.searchQuery}
                onSearchChange={state.setSearchQuery}
                targetSlot={targetSlot}
                isSmartMatch={state.activeTab === "smart_match"}
                sameDoctorOnly={state.sameDoctorOnly}
                onSameDoctorOnlyChange={state.setSameDoctorOnly}
                urgencyFilter={state.urgencyFilter}
                onUrgencyFilterChange={state.setUrgencyFilter}
              />

              {/* СПИСОК КАНДИДАТОВ ПО APPLE HIG GROUPED CARDS */}
              {state.rankedCandidates.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-muted,#64748b)]">
                  <div className="flex justify-center mb-2">
                    <Inbox className="w-9 h-9 text-[var(--text-muted,#64748b)] stroke-[1.5]" />
                  </div>
                  <p className="text-sm font-medium">Кандидаты не найдены</p>
                  <p className="text-xs mt-1">Добавьте пациента в лист ожидания через кнопку «+ Добавить»</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {state.rankedCandidates.map(({ candidate, scoring }) => (
                    <WaitlistCandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      scoring={scoring}
                      targetSlot={targetSlot}
                      clinicName={clinicName}
                      copiedId={state.copiedId}
                      onCopyOfferMessage={state.handleCopyOfferMessage}
                      onBookCandidate={state.handleBookCandidate}
                      onAssignCandidate={handleAssignDraft}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            /* ФОРМА БЫСТРОГО ДОБАВЛЕНИЯ ПАЦИЕНТА В ЛИСТ ОЖИДАНИЯ */
            <WaitlistAddPatientForm
              onSubmit={state.handleCreateEntry}
              isSubmitting={state.isSubmitting}
              clinicPatients={clinicPatients}
              staffDoctors={staffDoctors}
              newPatientId={state.newPatientId}
              onSelectPatientId={(pId) => {
                state.setNewPatientId(pId);
                const pat = clinicPatients.find((p: Dashboard["patients"][number]) => p.id === pId);
                if (pat) {
                  state.setNewPatientName(pat.fullName);
                  state.setNewPatientPhone(pat.phone || "");
                }
              }}
              newPatientName={state.newPatientName}
              onPatientNameChange={state.setNewPatientName}
              newPatientPhone={state.newPatientPhone}
              onPatientPhoneChange={state.setNewPatientPhone}
              newDoctorId={state.newDoctorId}
              onDoctorIdChange={state.setNewDoctorId}
              newUrgency={state.newUrgency}
              onUrgencyChange={state.setNewUrgency}
              newCategory={state.newCategory}
              onCategoryChange={state.setNewCategory}
              newTimeOfDay={state.newTimeOfDay}
              onTimeOfDayChange={state.setNewTimeOfDay}
              newNotes={state.newNotes}
              onNotesChange={state.setNewNotes}
              onCancel={() => state.setActiveTab(targetSlot ? "smart_match" : "all_patients")}
            />
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(drawerContent, document.body) : drawerContent;
}

export default WaitlistDrawer;
