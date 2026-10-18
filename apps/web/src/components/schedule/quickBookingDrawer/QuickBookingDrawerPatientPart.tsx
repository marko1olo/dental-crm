import React from "react";
import { QuickBookingPatientSection } from "../QuickBookingPatientSection";
import type { QuickBookingDrawerState } from "../useQuickBookingDrawerState";
import type { QuickBookingDrawerProps } from "../QuickBookingDrawerTypes";

export function QuickBookingDrawerPatientPart({
  state,
  props,
}: {
  state: QuickBookingDrawerState;
  props: QuickBookingDrawerProps;
}) {
  return (
    <QuickBookingPatientSection
      dashboard={props.dashboard}
      selectedPatient={state.selectedPatient}
      setSelectedPatient={state.setSelectedPatient}
      setPatientId={state.setPatientId}
      searchQuery={state.searchQuery}
      setSearchQuery={state.setSearchQuery}
      isTypeaheadOpen={state.isTypeaheadOpen}
      setIsTypeaheadOpen={state.setIsTypeaheadOpen}
      searchResults={state.searchResults}
      highlightedIndex={state.highlightedIndex}
      setHighlightedIndex={state.setHighlightedIndex}
      selectPatient={state.selectPatient}
      searchInputRef={state.searchInputRef}
      focusTimerRef={state.focusTimerRef}
      showInlineNewPatient={state.showInlineNewPatient}
      setShowInlineNewPatient={state.setShowInlineNewPatient}
      newPatientFullName={state.newPatientFullName}
      setNewPatientFullName={state.setNewPatientFullName}
      newPatientPhone={state.newPatientPhone}
      setNewPatientPhone={state.setNewPatientPhone}
      newPatientBirthDate={state.newPatientBirthDate}
      setNewPatientBirthDate={state.setNewPatientBirthDate}
      isCreatingPatient={state.isCreatingPatient}
      handleCreateInlinePatient={state.handleCreateInlinePatient}
      newPatientFullNameInputRef={state.newPatientFullNameInputRef}
      potentialDuplicates={state.potentialDuplicates}
      patientReliability={state.patientReliability}
      hasActivePatientVisit={state.hasActivePatientVisit}
      doctorUserId={state.doctorUserId}
      doctors={state.doctors}
      setAppointmentType={state.handleSelectAppointmentType}
      setReason={state.setReason}
      setComment={state.setComment}
      setDurationMinutes={state.handleSelectDuration}
    />
  );
}
