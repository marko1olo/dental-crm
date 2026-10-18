import React from "react";
import type { QuickBookingPatientSectionProps } from "./quickBookingPatient/quickBookingPatientTypes";
import { QuickBookingInlinePatientForm } from "./QuickBookingInlinePatientForm";
import { PatientSectionHeader } from "./quickBookingPatient/PatientSectionHeader";
import { SelectedPatientCard } from "./quickBookingPatient/SelectedPatientCard";
import { PatientSearchCombobox } from "./quickBookingPatient/PatientSearchCombobox";

export type { QuickBookingPatientSectionProps };

export function QuickBookingPatientSection(props: QuickBookingPatientSectionProps) {
  const {
    dashboard, selectedPatient, setSelectedPatient, setPatientId,
    searchQuery, setSearchQuery, isTypeaheadOpen, setIsTypeaheadOpen,
    searchResults, highlightedIndex, setHighlightedIndex, selectPatient,
    searchInputRef, focusTimerRef, showInlineNewPatient, setShowInlineNewPatient,
    newPatientFullName, setNewPatientFullName, newPatientPhone, setNewPatientPhone,
    newPatientBirthDate, setNewPatientBirthDate, isCreatingPatient,
    handleCreateInlinePatient, newPatientFullNameInputRef, potentialDuplicates,
    patientReliability, hasActivePatientVisit, doctorUserId, doctors,
    setAppointmentType, setReason, setComment, setDurationMinutes,
  } = props;

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setPatientId("");
    setSearchQuery("");
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    focusTimerRef.current = setTimeout(() => {
      searchInputRef.current?.focus();
      focusTimerRef.current = null;
    }, 50);
  };

  return (
    <div className="space-y-2">
      <PatientSectionHeader
        showInlineNewPatient={showInlineNewPatient}
        setShowInlineNewPatient={setShowInlineNewPatient}
        selectedPatient={selectedPatient}
        newPatientFullName={newPatientFullName}
        setNewPatientFullName={setNewPatientFullName}
        newPatientPhone={newPatientPhone}
        setNewPatientPhone={setNewPatientPhone}
        newPatientBirthDate={newPatientBirthDate}
        searchQuery={searchQuery}
        setAppointmentType={setAppointmentType}
        setReason={setReason}
        setComment={setComment}
        setDurationMinutes={setDurationMinutes}
        doctors={doctors}
        doctorUserId={doctorUserId}
        dashboard={dashboard}
      />

      {selectedPatient ? (
        <SelectedPatientCard
          selectedPatient={selectedPatient}
          onClearPatient={handleClearPatient}
          patientReliability={patientReliability}
          hasActivePatientVisit={hasActivePatientVisit}
        />
      ) : (
        <PatientSearchCombobox
          searchInputRef={searchInputRef}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isTypeaheadOpen={isTypeaheadOpen}
          setIsTypeaheadOpen={setIsTypeaheadOpen}
          highlightedIndex={highlightedIndex}
          setHighlightedIndex={setHighlightedIndex}
          searchResults={searchResults}
          selectPatient={selectPatient}
          dashboard={dashboard}
          setShowInlineNewPatient={setShowInlineNewPatient}
          setNewPatientFullName={setNewPatientFullName}
          setNewPatientPhone={setNewPatientPhone}
        />
      )}

      <QuickBookingInlinePatientForm
        dashboard={dashboard}
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
        selectPatient={selectPatient}
        doctorUserId={doctorUserId}
        doctors={doctors}
      />
    </div>
  );
}
