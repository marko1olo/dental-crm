import { Calendar, Sparkles, UserPlus, X, Zap } from "lucide-react";
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { WaitlistSlotSelectorBanner } from "./WaitlistSlotSelectorBanner";
import { WaitlistAddPatientForm } from "./WaitlistAddPatientForm";
import { WaitlistMatchTab } from "./WaitlistMatchTab";
import { WaitlistListTab } from "./WaitlistListTab";
import type { TargetSlotInfo } from "./waitlistCancellationEngine";
import { useWaitlistQuickFillState } from "./useWaitlistQuickFillState";
import type {
  MatchScoringResult,
  PreferredDaysType,
  PreferredTimeOfDay,
  WaitlistPatientEntry,
  WaitlistPriority,
} from "./waitlistMatchScoring";

export type { TargetSlotInfo, WaitlistPriority, PreferredTimeOfDay, PreferredDaysType, WaitlistPatientEntry, MatchScoringResult };
export {
  PRIORITY_CONFIG,
  DEFAULT_PRIORITY_CFG,
  renderPriorityIcon,
  TREATMENT_CATEGORIES,
  calculateMatchScore,
  generateWhatsAppOfferMessage,
  openWhatsAppChat,
  openTelegramChat,
  DEMO_SHOWCASE_WAITLIST_ENTRIES,
} from "./waitlistMatchScoring";

export interface WaitlistQuickFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSlot?: TargetSlotInfo | null | undefined;
  updateNewAppointmentDraft?: ((key: any, value: any) => void) | undefined;
  focusNewAppointmentEditor?: (() => void) | undefined;
  onBookSlot?: ((slot: TargetSlotInfo, patient: WaitlistPatientEntry) => Promise<void> | void) | undefined;
  onAppointmentCreated?: (() => void) | undefined;
  dashboard?: any;
  auth?: any;
}

export function WaitlistQuickFillModal(props: WaitlistQuickFillModalProps) {
  const { isOpen, onClose } = props;
  const s = useWaitlistQuickFillState(props);

  useEffect(() => {
    if (!s.activeMenuPatientId) return;
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement | null)?.closest(`[data-menu-container="${s.activeMenuPatientId}"]`)) {
        s.setActiveMenuPatientId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [s.activeMenuPatientId, s.setActiveMenuPatientId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" data-testid="waitlist-quickfill-modal" role="dialog" aria-modal="true" aria-labelledby="waitlist-modal-title">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[var(--paper)] border border-[var(--line)] rounded-2xl shadow-2xl flex flex-col z-10 text-[var(--ink)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-[var(--line)] flex items-center justify-between bg-[var(--paper-soft)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--teal,#0d9488)]/15 flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0"><Zap className="w-5 h-5" /></div>
            <div>
              <h2 id="waitlist-modal-title" className="text-lg font-bold tracking-tight text-[var(--ink)]">Лист ожидания и быстрая запись</h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">Интеллектуальный подбор пациентов на освободившиеся окна</p>
            </div>
          </div>
          <button type="button" onClick={onClose} data-testid="waitlist-quickfill-close-btn" className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors cursor-pointer pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px]" aria-label="Закрыть модальное окно">
            <X className="w-4 h-4" />
          </button>
        </div>

        <WaitlistSlotSelectorBanner activeTargetSlot={s.activeTargetSlot} discoveredFreeSlots={s.combinedDiscoveredSlots} selectedSlotIndex={s.selectedSlotIndex} onSelectSlotIndex={s.setSelectedSlotIndex} scoredPatientsCount={s.scoredPatients.length} />

        <div className="px-5 py-2 border-b border-[var(--line)] flex items-center shrink-0 overflow-x-auto whitespace-nowrap bg-[var(--paper)]">
          <div className="dente-segmented-bar">
            {s.activeTargetSlot && (
              <button type="button" onClick={() => s.setActiveTab("match")} className={`dente-segmented-item ${s.activeTab === "match" ? "active" : ""}`} data-testid="tab-match">
                <Sparkles className="w-3.5 h-3.5 shrink-0" /><span>Подбор на окно ({s.scoredPatients.length})</span>
              </button>
            )}
            <button type="button" onClick={() => s.setActiveTab("list")} className={`dente-segmented-item ${s.activeTab === "list" ? "active" : ""}`} data-testid="tab-list">
              <Calendar className="w-3.5 h-3.5 shrink-0" /><span>Все в очереди ({s.items.length})</span>
            </button>
            <button type="button" onClick={() => s.setActiveTab("add")} className={`dente-segmented-item ${s.activeTab === "add" ? "active" : ""}`} data-testid="tab-add">
              <UserPlus className="w-3.5 h-3.5 shrink-0" /><span>Добавить пациента</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {s.activeTab === "match" && (
            <WaitlistMatchTab scoredPatients={s.scoredPatients} contactedPatients={s.contactedPatients} bookingPatientId={s.bookingPatientId} activeTargetSlot={s.activeTargetSlot} activeMenuPatientId={s.activeMenuPatientId} onToggleMenu={s.setActiveMenuPatientId} onBookPatient={s.handleBookPatient} onSendWhatsApp={s.handleSendWhatsApp} onCopySms={s.handleCopySms} onSendTelegram={s.handleSendTelegram} onDelete={s.handleDelete} onOpenAddTab={() => s.setActiveTab("add")} />
          )}
          {s.activeTab === "list" && (
            <WaitlistListTab filteredList={s.filteredList} searchQuery={s.searchQuery} onSearchChange={s.setSearchQuery} selectedPriorityFilter={s.selectedPriorityFilter} onPriorityFilterChange={s.setSelectedPriorityFilter} isLoading={s.isLoading} totalItemsCount={s.items.length} contactedPatients={s.contactedPatients} bookingPatientId={s.bookingPatientId} activeTargetSlot={s.activeTargetSlot} activeMenuPatientId={s.activeMenuPatientId} onToggleMenu={s.setActiveMenuPatientId} onBookPatient={s.handleBookPatient} onSendWhatsApp={s.handleSendWhatsApp} onCopySms={s.handleCopySms} onSendTelegram={s.handleSendTelegram} onDelete={s.handleDelete} onOpenAddTab={() => s.setActiveTab("add")} />
          )}
          {s.activeTab === "add" && (
            <WaitlistAddPatientForm patientsList={s.patientsList} doctors={s.doctors} selectedPatientId={s.selectedPatientId} setSelectedPatientId={s.setSelectedPatientId} priorityLevel={s.priorityLevel} setPriorityLevel={s.setPriorityLevel} preferredDoctorId={s.preferredDoctorId} setPreferredDoctorId={s.setPreferredDoctorId} treatmentCategory={s.treatmentCategory} setTreatmentCategory={s.setTreatmentCategory} preferredDays={s.preferredDays} setPreferredDays={s.setPreferredDays} preferredTimeOfDay={s.preferredTimeOfDay} setPreferredTimeOfDay={s.setPreferredTimeOfDay} expiryDays={s.expiryDays} setExpiryDays={s.setExpiryDays} customExpiryDate={s.customExpiryDate} setCustomExpiryDate={s.setCustomExpiryDate} notes={s.notes} setNotes={s.setNotes} isSubmitting={s.isSubmitting} onSubmit={s.handleAddPatient} />
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : modal;
}

export default WaitlistQuickFillModal;
