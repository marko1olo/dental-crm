import React from "react";

export interface WaitlistPatientSelectorProps {
  isNewPatient: boolean;
  toggleNewPatient: (mode: boolean) => void;
  selectedPatientId: string;
  handlePatientSelect: (id: string) => void;
  patientsList: readonly any[];
  currentFullName: string;
  handleFullNameChange: (val: string) => void;
  currentPhone: string;
  handlePhoneChange: (val: string) => void;
}

export const WaitlistPatientSelector: React.FC<WaitlistPatientSelectorProps> = ({
  isNewPatient,
  toggleNewPatient,
  selectedPatientId,
  handlePatientSelect,
  patientsList,
  currentFullName,
  handleFullNameChange,
  currentPhone,
  handlePhoneChange,
}) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor="waitlist-select-patient" className="text-xs text-[var(--muted)] font-semibold">
          Пациент из картотеки *
        </label>
        <div className="inline-flex rounded-md p-0.5 bg-[var(--paper)] border border-[var(--line)] text-[11px]">
          <button
            type="button"
            onClick={() => toggleNewPatient(false)}
            className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
              !isNewPatient ? "bg-[var(--teal)] text-white font-bold" : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            Из базы
          </button>
          <button
            type="button"
            onClick={() => toggleNewPatient(true)}
            className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
              isNewPatient ? "bg-[var(--teal)] text-white font-bold" : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            Новый (+5 сек)
          </button>
        </div>
      </div>

      {!isNewPatient ? (
        <select
          id="waitlist-select-patient"
          value={selectedPatientId}
          onChange={(e) => handlePatientSelect(e.target.value)}
          className="w-full h-8 px-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)] pointer-coarse:min-h-[44px]"
          required={!isNewPatient}
          data-testid="waitlist-add-patient-select"
        >
          <option value="">-- Выберите пациента из базы --</option>
          {patientsList.map((p: any) => (
            <option key={p.id} value={p.id}>
              {p.fullName} {p.phone ? `(${p.phone})` : ""}
            </option>
          ))}
        </select>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={currentFullName}
            onChange={(e) => handleFullNameChange(e.target.value)}
            placeholder="ФИО пациента *"
            className="h-8 px-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] outline-none focus:ring-1 focus:ring-[var(--teal)] pointer-coarse:min-h-[44px]"
            autoFocus
            required
            data-testid="waitlist-quick-name-input"
          />
          <input
            type="tel"
            value={currentPhone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="+7 (___) ___-__-__"
            className="h-8 px-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] outline-none focus:ring-1 focus:ring-[var(--teal)] pointer-coarse:min-h-[44px]"
            data-testid="waitlist-quick-phone-input"
          />
        </div>
      )}
    </div>
  );
};
