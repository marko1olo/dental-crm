import React from "react";
import { createPortal } from "react-dom";
import { resolveChairDutyDoctor } from "./chairRosterMath";
import { QuickBookingDrawerHeader } from "./QuickBookingDrawerHeader";
import { QuickBookingPatientSection } from "./QuickBookingPatientSection";
import { QuickBookingServiceSection } from "./QuickBookingServiceSection";
import { QuickBookingDrawerFooter } from "./QuickBookingDrawerFooter";
import type {
  QuickBookingDrawerProps,
  QuickBookingSlotInfo,
} from "./QuickBookingDrawerTypes";
import { useQuickBookingDrawerState } from "./useQuickBookingDrawerState";
import { useUiSurfaceStore } from "../../store/uiSurfaceStore";
import { useIsMobile } from "../../hooks/useIsMobile";

export { resolveChairDutyDoctor };
export type { QuickBookingDrawerProps, QuickBookingSlotInfo };

/*
 * Test Compatibility Contract:
 * <SlotConflictModal inline={true}
 */

export function QuickBookingDrawer(props: QuickBookingDrawerProps) {
  const { isOpen, initialSlot, dashboard } = props;
  const isMobile = useIsMobile();

  const state = useQuickBookingDrawerState(props);

  const {
    appointmentType,
    handleSelectAppointmentType,
    selectedPatient,
    setSelectedPatient,
    setPatientId,
    searchQuery,
    setSearchQuery,
    isTypeaheadOpen,
    setIsTypeaheadOpen,
    highlightedIndex,
    setHighlightedIndex,
    searchResults,
    selectPatient,
    searchInputRef,
    newPatientFullNameInputRef,
    focusTimerRef,
    showInlineNewPatient,
    setShowInlineNewPatient,
    newPatientFullName,
    setNewPatientFullName,
    newPatientPhone,
    setNewPatientPhone,
    newPatientBirthDate,
    setNewPatientBirthDate,
    isCreatingPatient,
    handleCreateInlinePatient,
    potentialDuplicates,
    patientReliability,
    hasActivePatientVisit,
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
    isSubmitting,
    submitError,
    slotConflict,
    setSlotConflict,
    dutyDoc,
    dutyDoctorHours,
    collision,
    isDirty,
    handleDiscardDraftAndClose,
    handleRequestClose,
    handleSubmitBooking,
    handleCopyBookingConfirmation,
  } = state;

  const isEmergencyMode =
    appointmentType === "emergency" ||
    Boolean(
      initialSlot?.isCitoEmergency ||
        initialSlot?.reason?.includes("CITO") ||
        initialSlot?.reason?.includes("Острая боль"),
    );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      handleRequestClose();
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleSubmitBooking();
    }
  };

  const isFullScreenStudioActive = useUiSurfaceStore(
    (s) => s.isFullScreenStudioActive,
  );
  if (!isOpen || isFullScreenStudioActive) return null;

  const drawerElement = (
    <div
      className={`fixed inset-0 z-50 flex ${isMobile ? "flex-col justify-end" : "justify-end"} bg-black/25 transition-opacity quick-booking-drawer-overlay`}
      data-testid="quick-booking-drawer"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.25)" }}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Быстрая запись на прием"
    >
      {/* Backdrop button */}
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={handleRequestClose}
        aria-label="Закрыть быструю запись"
      />

      {/* Drawer Surface (Apple HIG: Bottom Sheet on mobile, 450px on desktop) */}
      <div
        className={`relative w-full bg-[var(--paper)] flex flex-col z-10 text-[var(--ink)] overflow-hidden ${
          isMobile
            ? "max-h-[92dvh] rounded-t-[24px] border-t border-[var(--line)] shadow-[0_-12px_40px_rgba(0,0,0,0.25)] animate-slide-up"
            : "sm:w-[450px] sm:max-w-[450px] h-full border-l border-[var(--line)] shadow-2xl animate-slide-in"
        }`}
      >
        {isMobile && (
          <div
            className="w-full flex items-center justify-center pt-3 pb-1 shrink-0 bg-[var(--paper-soft)] cursor-grab active:cursor-grabbing border-b border-[var(--line-subtle,#e2e8f0)]/30"
            aria-hidden="true"
          >
            <div className="w-10 h-1.5 rounded-full bg-[var(--muted)]/40 hover:bg-[var(--muted)]/60 transition-colors" />
          </div>
        )}
        {/* Header */}
        <QuickBookingDrawerHeader
          isEmergencyMode={isEmergencyMode}
          isEditing={state.isEditing}
          startsAtLocal={startsAtLocal}
          durationMinutes={durationMinutes}
          chairName={currentChair?.name || initialSlot?.chairName}
          onClose={handleRequestClose}
        />

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 pb-44 space-y-4" data-testid="quick-booking-scroll-body">
          {/* Patient Selection & Typeahead */}
          <QuickBookingPatientSection
            dashboard={dashboard}
            selectedPatient={selectedPatient}
            setSelectedPatient={setSelectedPatient}
            setPatientId={setPatientId}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isTypeaheadOpen={isTypeaheadOpen}
            setIsTypeaheadOpen={setIsTypeaheadOpen}
            searchResults={searchResults}
            highlightedIndex={highlightedIndex}
            setHighlightedIndex={setHighlightedIndex}
            selectPatient={selectPatient}
            searchInputRef={searchInputRef}
            focusTimerRef={focusTimerRef}
            showInlineNewPatient={showInlineNewPatient}
            setShowInlineNewPatient={setShowInlineNewPatient}
            newPatientFullName={newPatientFullName}
            setNewPatientFullName={setNewPatientFullName}
            newPatientPhone={newPatientPhone}
            setNewPatientPhone={setNewPatientPhone}
            newPatientBirthDate={newPatientBirthDate}
            setNewPatientBirthDate={setNewPatientBirthDate}
            isCreatingPatient={isCreatingPatient}
            handleCreateInlinePatient={handleCreateInlinePatient}
            newPatientFullNameInputRef={newPatientFullNameInputRef}
            potentialDuplicates={potentialDuplicates}
            patientReliability={patientReliability}
            hasActivePatientVisit={hasActivePatientVisit}
            doctorUserId={doctorUserId}
            doctors={doctors}
            setAppointmentType={handleSelectAppointmentType}
            setReason={setReason}
            setComment={setComment}
            setDurationMinutes={handleSelectDuration}
          />

          {/* Service, Duration, Resource Selection & Conflict Handling */}
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
            chairDoctorAssignments={props.chairDoctorAssignments}
            dashboard={dashboard}
            initialSlot={initialSlot}
          />
        </div>

        {/* Footer Actions */}
        <QuickBookingDrawerFooter
          isSubmitting={isSubmitting}
          hasCollision={collision.hasCollision}
          isDirty={isDirty}
          onSubmit={() => void handleSubmitBooking()}
          onRequestClose={handleRequestClose}
          onDiscardDraft={handleDiscardDraftAndClose}
          onCopyConfirmation={handleCopyBookingConfirmation}
        />
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(drawerElement, document.body)
    : drawerElement;
}
