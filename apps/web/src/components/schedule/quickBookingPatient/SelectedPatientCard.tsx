import type { Patient } from "@dental/shared";
import { AlertCircle, AlertTriangle, Check, CreditCard, ShieldCheck, Sparkles, X } from "lucide-react";
import React from "react";
import type { PatientReliabilityAssessment } from "../patientReliabilityScore";

export interface SelectedPatientCardProps {
  selectedPatient: Patient;
  onClearPatient: () => void;
  patientReliability: PatientReliabilityAssessment | null;
  hasActivePatientVisit: boolean;
}

export function SelectedPatientCard({
  selectedPatient,
  onClearPatient,
  patientReliability,
  hasActivePatientVisit,
}: SelectedPatientCardProps) {
  return (
    <div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3" data-testid="selected-patient-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--teal-surface)] text-[var(--teal-dark)] font-bold text-sm flex items-center justify-center border border-[var(--teal)]/30 shrink-0">
            {selectedPatient.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-[var(--ink)] m-0 leading-snug truncate">{selectedPatient.fullName}</h4>
            <div className="text-xs text-[var(--muted)] flex gap-2 mt-0.5">
              {selectedPatient.phone && <span>{selectedPatient.phone}</span>}
              {selectedPatient.birthDate && <span>д.р. {selectedPatient.birthDate}</span>}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClearPatient}
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-xs text-[var(--muted)] hover:text-rose-600 rounded-lg hover:bg-[var(--paper)] transition-colors cursor-pointer"
          title="Выбрать другого пациента"
          aria-label="Сменить пациента"
        >
          <X size={16} />
        </button>
      </div>

      {patientReliability && (
        <div className="pt-2.5 border-t border-[var(--line)] space-y-2" data-testid="patient-reliability-section">
          {patientReliability.financialBadge && (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${patientReliability.financialBadge.badgeClass}`}
                data-testid="patient-financial-badge"
                title={`Баланс пациента: ${patientReliability.financialBadge.label}`}
              >
                <CreditCard size={14} className="shrink-0 opacity-80" />
                <span>{patientReliability.financialBadge.label}</span>
              </div>
            </div>
          )}

          {patientReliability.financialBadge?.isDebt && (
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-2" data-testid="patient-reliability-debt-alert">
              <span className="font-semibold">Финансовый долг: {patientReliability.financialBadge.formattedAmount}</span>
              <span className="text-[11px] text-rose-700 dark:text-rose-300">Напомнить об оплате</span>
            </div>
          )}

          {hasActivePatientVisit && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-100 text-xs flex items-start gap-2" data-testid="quick-booking-active-visit-warning">
              <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="m-0 font-bold">По пациенту сейчас идет активный приём в кресле</p>
                <p className="m-0 font-normal text-[11px] text-[var(--muted)]">(Запись на следующий приём не блокируется, врач или администратор может сразу забронировать слот)</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
