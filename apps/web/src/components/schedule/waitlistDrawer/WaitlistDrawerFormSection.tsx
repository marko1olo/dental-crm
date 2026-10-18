import React from "react";
import { WaitlistQuickAddForm } from "../WaitlistQuickAddForm";
import type { useWaitlistDrawerOperations } from "../useWaitlistDrawerOperations";
import type { useWaitlistDrawerController } from "./useWaitlistDrawerController";

export interface WaitlistDrawerFormSectionProps {
  ops: ReturnType<typeof useWaitlistDrawerOperations>;
  ctrl: ReturnType<typeof useWaitlistDrawerController>;
}

export function WaitlistDrawerFormSection({ ops, ctrl }: WaitlistDrawerFormSectionProps) {
  return (
    <WaitlistQuickAddForm
      isOpen={ops.isAddFormOpen}
      onClose={() => ops.setIsAddFormOpen(false)}
      isSubmitting={ops.isSubmitting}
      selectedPatientId={ops.selectedPatientId}
      onSelectPatientId={ops.setSelectedPatientId}
      quickNewPatientMode={ops.quickNewPatientMode}
      onToggleQuickNewPatientMode={ops.setQuickNewPatientMode}
      quickFullName={ops.quickFullName}
      onChangeQuickFullName={ops.setQuickFullName}
      quickPhone={ops.quickPhone}
      onChangeQuickPhone={ops.setQuickPhone}
      preferredDoctorId={ops.preferredDoctorId}
      onChangePreferredDoctorId={ops.setPreferredDoctorId}
      addUrgency={ops.addUrgency}
      onChangeAddUrgency={ops.setAddUrgency}
      addPreferredTime={ops.addPreferredTime}
      onChangeAddPreferredTime={ops.setAddPreferredTime}
      onSubmit={ops.handleQuickAdd}
      patientsList={ctrl.patientsList}
      doctors={ctrl.doctors}
    />
  );
}
