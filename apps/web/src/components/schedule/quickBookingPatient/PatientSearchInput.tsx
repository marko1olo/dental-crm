import { Search, X } from "lucide-react";
import React from "react";
import type { Patient } from "@dental/shared";

export interface PatientSearchInputProps {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isTypeaheadOpen: boolean;
  setIsTypeaheadOpen: (open: boolean) => void;
  highlightedIndex: number;
  setHighlightedIndex: React.Dispatch<React.SetStateAction<number>>;
  searchResults: Array<{ patient: Patient; isFuzzy?: boolean | undefined; suggestedName?: string | undefined }>;
  selectPatient: (p: Patient) => void;
}

export function PatientSearchInput({
  searchInputRef,
  searchQuery,
  setSearchQuery,
  isTypeaheadOpen,
  setIsTypeaheadOpen,
  highlightedIndex,
  setHighlightedIndex,
  searchResults,
  selectPatient,
}: PatientSearchInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === "Enter" && searchResults[highlightedIndex]) {
      e.preventDefault();
      const picked = searchResults[highlightedIndex]?.patient;
      if (picked) selectPatient(picked);
    } else if (e.key === "Escape") {
      setIsTypeaheadOpen(false);
    }
  };

  return (
    <div className="dente-search-wrap">
      <Search className="dente-search-icon" />
      <input
        ref={searchInputRef}
        type="text"
        data-testid="quick-booking-patient-search-input"
        value={searchQuery}
        placeholder="Поиск по ФИО, телефону или дате рождения…"
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setIsTypeaheadOpen(true);
          setHighlightedIndex(0);
        }}
        onFocus={() => setIsTypeaheadOpen(true)}
        onKeyDown={handleKeyDown}
        className="dente-search-input"
        aria-autocomplete="list"
        aria-expanded={isTypeaheadOpen}
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            setIsTypeaheadOpen(false);
          }}
          className="dente-search-clear"
          title="Очистить поиск"
          aria-label="Очистить поиск"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
