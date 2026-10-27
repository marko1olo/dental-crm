import React, { useState } from "react";
import { Check, UserPlus } from "lucide-react";
import { type WaitlistUrgency, URGENCY_CONFIG } from "./waitlistCancellationEngine";
import { TREATMENT_CATEGORIES, type PreferredTimeOfDay, type WaitlistPriority } from "./waitlistMatchScoring";
import type { WaitlistQuickAddFormProps } from "./waitlistForm/waitlistFormTypes";
import { WaitlistPatientSelector } from "./waitlistForm/WaitlistPatientSelector";
import { WaitlistUrgencySelector } from "./waitlistForm/WaitlistUrgencySelector";
import { WaitlistDoctorAndTime } from "./waitlistForm/WaitlistDoctorAndTime";
import { WaitlistAdvancedParams } from "./waitlistForm/WaitlistAdvancedParams";

export type { WaitlistUrgency, PreferredTimeOfDay, WaitlistPriority, WaitlistQuickAddFormProps };
export { URGENCY_CONFIG, TREATMENT_CATEGORIES };

export const WaitlistQuickAddForm: React.FC<WaitlistQuickAddFormProps> = (props) => {
  const {
    isOpen = true, onClose, isSubmitting, selectedPatientId, onSelectPatientId, setSelectedPatientId,
    quickNewPatientMode = false, onToggleQuickNewPatientMode, quickFullName = "", onChangeQuickFullName,
    quickPhone = "", onChangeQuickPhone, preferredDoctorId = "", onChangePreferredDoctorId,
    setPreferredDoctorId, addUrgency = "routine", onChangeAddUrgency, setPriorityLevel,
    addPreferredTime = "any", onChangeAddPreferredTime, treatmentCategory = "", setTreatmentCategory,
    preferredDays = ["weekdays"], setPreferredDays, setPreferredTimeOfDay, expiryDays = 7,
    setExpiryDays, customExpiryDate = "", setCustomExpiryDate, notes = "", setNotes,
    onSubmit, patientsList, doctors,
  } = props;

  const [localNewPatientMode, setLocalNewPatientMode] = useState(quickNewPatientMode);
  const [localFullName, setLocalFullName] = useState(quickFullName);
  const [localPhone, setLocalPhone] = useState(quickPhone);
  const [showAdvancedParams, setShowAdvancedParams] = useState(
    Boolean(treatmentCategory || notes || (preferredDays && preferredDays.length > 0 && !preferredDays.includes("weekdays"))),
  );

  if (!isOpen) return null;

  const isNewPatient = onToggleQuickNewPatientMode !== undefined ? quickNewPatientMode : localNewPatientMode;
  const toggleNewPatient = (m: boolean) => (onToggleQuickNewPatientMode ? onToggleQuickNewPatientMode(m) : setLocalNewPatientMode(m));
  const currentFullName = onChangeQuickFullName !== undefined ? quickFullName : localFullName;
  const handleFullNameChange = (v: string) => (onChangeQuickFullName ? onChangeQuickFullName(v) : setLocalFullName(v));
  const currentPhone = onChangeQuickPhone !== undefined ? quickPhone : localPhone;
  const handlePhoneChange = (v: string) => (onChangeQuickPhone ? onChangeQuickPhone(v) : setLocalPhone(v));
  const handlePatientSelect = (id: string) => { onSelectPatientId?.(id); setSelectedPatientId?.(id); };
  const handleDoctorSelect = (id: string) => { onChangePreferredDoctorId?.(id); setPreferredDoctorId?.(id); };
  const handleUrgencySelect = (u: WaitlistUrgency) => {
    onChangeAddUrgency?.(u);
    if (setPriorityLevel) {
      const map: Record<WaitlistUrgency, WaitlistPriority> = {
        acute_pain: "urgent", ortho_endo: "treatment_plan", hygiene: "medium", routine: "routine",
      };
      setPriorityLevel(map[u] || "medium");
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="p-3.5 mx-auto w-full max-w-2xl rounded-xl bg-[var(--paper-soft)] border border-[var(--teal)]/40 space-y-3 shrink-0 animate-in fade-in zoom-in-95 duration-100"
      data-testid="waitlist-quick-add-form" data-sub-testid="add-waitlist-form"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--teal-dark,var(--teal))] flex items-center gap-1.5 m-0">
          <UserPlus className="w-3.5 h-3.5 shrink-0" />
          <span>Добавить пациента в лист ожидания за 5 секунд</span>
        </h4>
        {onClose && (
          <button type="button" onClick={onClose} className="text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer">
            Свернуть
          </button>
        )}
      </div>

      <WaitlistPatientSelector
        isNewPatient={isNewPatient} toggleNewPatient={toggleNewPatient} selectedPatientId={selectedPatientId}
        handlePatientSelect={handlePatientSelect} patientsList={patientsList} currentFullName={currentFullName}
        handleFullNameChange={handleFullNameChange} currentPhone={currentPhone} handlePhoneChange={handlePhoneChange}
      />
      <WaitlistUrgencySelector addUrgency={addUrgency} handleUrgencySelect={handleUrgencySelect} />
      <WaitlistDoctorAndTime
        preferredDoctorId={preferredDoctorId} handleDoctorSelect={handleDoctorSelect}
        doctors={doctors} addPreferredTime={addPreferredTime}
        onChangeAddPreferredTime={onChangeAddPreferredTime} setPreferredTimeOfDay={setPreferredTimeOfDay}
      />
      <WaitlistAdvancedParams
        showAdvancedParams={showAdvancedParams} setShowAdvancedParams={setShowAdvancedParams}
        treatmentCategory={treatmentCategory} setTreatmentCategory={setTreatmentCategory}
        preferredDays={preferredDays} setPreferredDays={setPreferredDays}
        expiryDays={expiryDays} setExpiryDays={setExpiryDays}
        customExpiryDate={customExpiryDate} setCustomExpiryDate={setCustomExpiryDate}
        notes={notes} setNotes={setNotes}
      />

      <button
        type="submit" aria-busy={isSubmitting || undefined}
        className="w-full h-8 bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)] font-bold rounded-lg text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer pointer-coarse:min-h-[44px]"
        data-testid="waitlist-quick-submit-btn"
      >
        <Check className="w-3.5 h-3.5" />
        <span>{isSubmitting ? "Сохраняю..." : "Записать в лист ожидания (+5 сек)"}</span>
      </button>
    </form>
  );
};

export default WaitlistQuickAddForm;
