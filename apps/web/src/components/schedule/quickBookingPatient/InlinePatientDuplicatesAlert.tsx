import type { Patient } from "@dental/shared";
import { AlertTriangle, Check, Phone } from "lucide-react";
import React from "react";
import type { PotentialDuplicateItem } from "../patientSearchEngine";

export interface InlinePatientDuplicatesAlertProps {
  potentialDuplicates: PotentialDuplicateItem[];
  selectPatient: (p: Patient) => void;
}

export function InlinePatientDuplicatesAlert({
  potentialDuplicates,
  selectPatient,
}: InlinePatientDuplicatesAlertProps) {
  if (potentialDuplicates.length === 0) return null;

  return (
    <div
      className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-100 text-xs space-y-2"
      data-testid="inline-patient-duplicate-warning"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold m-0">Похожий пациент уже есть в базе:</p>
          <p className="m-0 text-[var(--muted)]">Во избежание дублирования карт выберите существующего пациента:</p>
        </div>
      </div>
      <div className="space-y-1.5 pl-6">
        {potentialDuplicates.map((item) => {
          const p = item.patient;
          const reasonLabel =
            item.duplicateReason === "both"
              ? "ФИО и Телефон"
              : item.duplicateReason === "phone"
                ? "Совпадение по телефону"
                : item.duplicateReason === "fuzzy_name"
                  ? `Похожее ФИО (${item.score}%)`
                  : "Совпадение по ФИО";

          return (
            <div
              key={p.id}
              className="w-full min-h-[44px] p-2.5 rounded-lg bg-[var(--paper)] border border-amber-500/30 hover:border-amber-500/60 transition-colors flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-[var(--ink)] truncate text-xs">
                    {item.fullNameHighlights.map((part, pIdx) =>
                      part.isMatch ? (
                        <mark key={pIdx} className="bg-amber-300/60 dark:bg-amber-800/80 text-amber-950 dark:text-amber-100 rounded px-0.5 font-extrabold">
                          {part.text}
                        </mark>
                      ) : (
                        <span key={pIdx}>{part.text}</span>
                      ),
                    )}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 shrink-0" data-testid="duplicate-reason-badge">
                    {reasonLabel}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--muted)] flex items-center gap-2 mt-0.5 flex-wrap">
                  {p.phone && (
                    <span className="font-mono flex items-center gap-1">
                      <Phone size={10} className="shrink-0 opacity-70" />
                      <span>
                        {item.phoneHighlights.map((part, pIdx) =>
                          part.isMatch ? (
                            <mark key={pIdx} className="bg-amber-300/60 dark:bg-amber-800/80 text-amber-950 dark:text-amber-100 rounded px-0.5 font-extrabold">
                              {part.text}
                            </mark>
                          ) : (
                            <span key={pIdx}>{part.text}</span>
                          ),
                        )}
                      </span>
                    </span>
                  )}
                  {p.birthDate && <span>д.р. {p.birthDate}</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => selectPatient(p)}
                className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                data-testid={`select-duplicate-patient-${p.id}`}
              >
                <Check size={13} className="stroke-[2.5]" />
                <span>Выбрать этого</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
