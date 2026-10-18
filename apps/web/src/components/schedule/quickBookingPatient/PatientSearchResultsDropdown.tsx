import type { Dashboard, Patient } from "@dental/shared";
import { AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import React from "react";
import { calculatePatientReliability } from "../patientReliabilityScore";

export interface PatientSearchResultsDropdownProps {
  searchResults: Array<{ patient: Patient; isFuzzy?: boolean | undefined; suggestedName?: string | undefined }>;
  highlightedIndex: number;
  selectPatient: (p: Patient) => void;
  dashboard?: Dashboard | undefined;
  searchQuery: string;
  setShowInlineNewPatient: (show: boolean) => void;
  setIsTypeaheadOpen: (open: boolean) => void;
  setNewPatientFullName: (name: string) => void;
  setNewPatientPhone: (phone: string) => void;
}

export function PatientSearchResultsDropdown({
  searchResults,
  highlightedIndex,
  selectPatient,
  dashboard,
  searchQuery,
  setShowInlineNewPatient,
  setIsTypeaheadOpen,
  setNewPatientFullName,
  setNewPatientPhone,
}: PatientSearchResultsDropdownProps) {
  const handleCreateNewFromSearch = () => {
    setShowInlineNewPatient(true);
    setIsTypeaheadOpen(false);
    const trimmedQ = searchQuery.trim();
    const hasLetters = /[а-яёa-z]/i.test(trimmedQ);
    const hasDigits = /\d/.test(trimmedQ);
    if (hasLetters && !hasDigits) {
      setNewPatientFullName(trimmedQ);
      setNewPatientPhone("");
    } else if (hasDigits && !hasLetters) {
      setNewPatientFullName("");
      setNewPatientPhone(trimmedQ);
    } else {
      setNewPatientFullName(trimmedQ);
      setNewPatientPhone("");
    }
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-xl bg-[var(--paper)] border border-[var(--line-strong)] shadow-2xl z-50 divide-y divide-[var(--line)]" role="listbox">
      {searchResults.length > 0 ? (
        searchResults.map((item, idx) => {
          const p = item.patient;
          const itemReliability = calculatePatientReliability(p, dashboard?.appointments);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => selectPatient(p)}
              className={`w-full p-3 text-left flex items-center justify-between transition-colors min-h-[44px] cursor-pointer ${
                idx === highlightedIndex ? "bg-[var(--teal-surface)] text-[var(--ink)]" : "bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)]"
              }`}
              role="option"
              aria-selected={idx === highlightedIndex}
              data-testid={`quick-booking-patient-option-${p.id}`}
            >
              <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-[var(--ink)] truncate">{p.fullName}</span>
                  {item.isFuzzy && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0" title="Нечеткое совпадение по опечатке" data-testid="quick-booking-fuzzy-badge">
                      <Sparkles size={10} className="text-amber-500" />
                      <span>Возможно: {item.suggestedName || p.fullName}</span>
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--muted)] flex gap-2 mt-0.5">
                  {p.phone && <span>{p.phone}</span>}
                  {p.birthDate && <span>д.р. {p.birthDate}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${itemReliability.reliabilityBadge.badgeClass}`} title={itemReliability.reliabilityBadge.summary}>
                  {itemReliability.reliabilityBadge.status === "reliable" && <ShieldCheck size={11} className="text-emerald-700 dark:text-emerald-300 shrink-0" />}
                  {itemReliability.reliabilityBadge.status === "new" && <Sparkles size={11} className="text-sky-700 dark:text-sky-300 shrink-0" />}
                  {itemReliability.reliabilityBadge.status === "high_risk" && <AlertTriangle size={11} className="text-rose-700 dark:text-rose-300 shrink-0" />}
                  {itemReliability.reliabilityBadge.status === "attention" && <AlertTriangle size={11} className="text-amber-700 dark:text-amber-300 shrink-0" />}
                  <span>{itemReliability.reliabilityBadge.shortLabel}</span>
                </span>
                {itemReliability.financialBadge.isDebt && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-200 border border-rose-500/30 font-mono" title={`Долг: ${itemReliability.financialBadge.formattedAmount}`}>
                    -{itemReliability.financialBadge.formattedAmount}
                  </span>
                )}
                {itemReliability.financialBadge.isDeposit && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 border border-emerald-500/30 font-mono" title={`Депозит: ${itemReliability.financialBadge.formattedAmount}`}>
                    +{itemReliability.financialBadge.formattedAmount}
                  </span>
                )}
              </div>
            </button>
          );
        })
      ) : (
        <div className="p-4 text-center text-xs text-[var(--muted)]">
          <span>Пациент не найден в базе.</span>
          <button
            type="button"
            onClick={handleCreateNewFromSearch}
            className="block mx-auto mt-2 text-xs font-bold text-[var(--teal)] hover:underline min-h-[44px] px-3 py-2 rounded-lg cursor-pointer"
          >
            + Создать «{searchQuery || "Нового пациента"}»
          </button>
        </div>
      )}
    </div>
  );
}
