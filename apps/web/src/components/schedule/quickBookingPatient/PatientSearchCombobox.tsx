import React from "react";
import type { Dashboard, Patient } from "@dental/shared";
import { PatientSearchInput } from "./PatientSearchInput";
import { PatientSearchResultsDropdown } from "./PatientSearchResultsDropdown";

export interface PatientSearchComboboxProps {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isTypeaheadOpen: boolean;
  setIsTypeaheadOpen: (open: boolean) => void;
  highlightedIndex: number;
  setHighlightedIndex: React.Dispatch<React.SetStateAction<number>>;
  searchResults: Array<{ patient: Patient; isFuzzy?: boolean | undefined; suggestedName?: string | undefined }>;
  selectPatient: (p: Patient) => void;
  dashboard?: Dashboard | undefined;
  setShowInlineNewPatient: (show: boolean) => void;
  setNewPatientFullName: (name: string) => void;
  setNewPatientPhone: (phone: string) => void;
}

export function PatientSearchCombobox({
  searchInputRef,
  searchQuery,
  setSearchQuery,
  isTypeaheadOpen,
  setIsTypeaheadOpen,
  highlightedIndex,
  setHighlightedIndex,
  searchResults,
  selectPatient,
  dashboard,
  setShowInlineNewPatient,
  setNewPatientFullName,
  setNewPatientPhone,
}: PatientSearchComboboxProps) {
  return (
    <div className="relative z-30">
      <PatientSearchInput
        searchInputRef={searchInputRef}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isTypeaheadOpen={isTypeaheadOpen}
        setIsTypeaheadOpen={setIsTypeaheadOpen}
        highlightedIndex={highlightedIndex}
        setHighlightedIndex={setHighlightedIndex}
        searchResults={searchResults}
        selectPatient={selectPatient}
      />
      {isTypeaheadOpen && (
        <PatientSearchResultsDropdown
          searchResults={searchResults}
          highlightedIndex={highlightedIndex}
          selectPatient={selectPatient}
          dashboard={dashboard}
          searchQuery={searchQuery}
          setShowInlineNewPatient={setShowInlineNewPatient}
          setIsTypeaheadOpen={setIsTypeaheadOpen}
          setNewPatientFullName={setNewPatientFullName}
          setNewPatientPhone={setNewPatientPhone}
        />
      )}
    </div>
  );
}
