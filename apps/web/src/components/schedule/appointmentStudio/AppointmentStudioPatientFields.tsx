import React from "react";
import { User, Phone } from "lucide-react";

export interface PatientSuggestionItem {
  id: string;
  name: string;
  phone: string;
}

export interface AppointmentStudioPatientFieldsProps {
  patientName: string;
  patientPhone: string;
  showSuggestions: boolean;
  patientSuggestions: PatientSuggestionItem[];
  onNameChange: (val: string) => void;
  onPhoneChange: (val: string) => void;
  onSelectPatient: (patient: PatientSuggestionItem) => void;
}

export const AppointmentStudioPatientFields: React.FC<AppointmentStudioPatientFieldsProps> = ({
  patientName,
  patientPhone,
  showSuggestions,
  patientSuggestions,
  onNameChange,
  onPhoneChange,
  onSelectPatient,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
      <div className="flex flex-col gap-1 relative">
        <label
          htmlFor="patient-name-input"
          className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1"
        >
          <User size={13} />
          <span>Пациент (ФИО)</span>
        </label>
        <input
          id="patient-name-input"
          type="text"
          value={patientName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Иван Иванов"
          className="studio-input-field"
          data-testid="patient-name-input"
          autoComplete="off"
        />
        {showSuggestions && (
          <div
            className="absolute left-0 right-0 top-[68px] z-30 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-xl shadow-xl overflow-hidden py-1"
            data-testid="patient-suggestions-popup"
          >
            {patientSuggestions.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPatient(p)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--paper-soft,#f1f5f9)] flex items-center justify-between cursor-pointer border-none bg-transparent"
              >
                <span className="font-semibold text-[var(--ink,#0f172a)]">{p.name}</span>
                <span className="text-[var(--muted,#64748b)]">{p.phone}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="patient-phone-input"
          className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1"
        >
          <Phone size={13} />
          <span>Номер телефона</span>
        </label>
        <input
          id="patient-phone-input"
          type="tel"
          value={patientPhone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="+7 (999) 000-00-00"
          className="studio-input-field"
          data-testid="patient-phone-input"
        />
      </div>
    </div>
  );
};
