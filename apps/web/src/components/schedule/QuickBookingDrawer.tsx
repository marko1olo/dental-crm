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

export { resolveChairDutyDoctor };
export type { QuickBookingDrawerProps, QuickBookingSlotInfo };

/*
 * Test Compatibility Contract:
 * <SlotConflictModal inline={true}
 */

export function QuickBookingDrawer(props: QuickBookingDrawerProps) {
  const { isOpen, initialSlot, dashboard } = props;

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
      className="fixed inset-0 z-50 flex justify-end bg-black/25 transition-opacity quick-booking-drawer-overlay"
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

      {/* Drawer Surface */}
      <div className="relative w-full max-w-lg h-full bg-[var(--paper)] border-l border-[var(--line)] shadow-2xl flex flex-col z-10 text-[var(--ink)] overflow-hidden animate-slide-in">
        {/* Header */}
        <QuickBookingDrawerHeader
          isEmergencyMode={isEmergencyMode}
          startsAtLocal={startsAtLocal}
          durationMinutes={durationMinutes}
          onClose={handleRequestClose}
        />

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 pb-20 space-y-5">
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
