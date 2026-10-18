import React from "react";
import type { Dashboard } from "@dental/shared";
import { QuickAddChairModal } from "../QuickAddChairModal";
import { QuickAddDoctorModal } from "../QuickAddDoctorModal";
import type { useChairScheduleState } from "../useChairScheduleState";

export interface ChairScheduleQuickModalsProps {
  state: ReturnType<typeof useChairScheduleState>;
  dashboard?: Dashboard | null | undefined;
  onAssignChairDoctor?: ((chairId: string, shift: any) => void) | undefined;
  onAddDoctor?: ((docData: any) => Promise<void> | void) | undefined;
}

export function ChairScheduleQuickModals({
  state,
  dashboard,
  onAssignChairDoctor,
  onAddDoctor,
}: ChairScheduleQuickModalsProps) {
  return (
    <>
      <QuickAddChairModal
        isOpen={state.isAddChairOpen}
        onClose={() => {
          state.setIsAddChairOpen(false);
          state.setEditingChair(null);
        }}
        onAddChair={state.handleSaveChair}
        initialData={state.editingChair}
        onUpdateChair={state.handleSaveChair}
        existingChairsCount={state.chairs.length}
        branches={(dashboard?.clinicSettings as any)?.branches ?? []}
        doctors={(dashboard?.clinicSettings?.staff ?? []).filter(
          (s) => s.active && (s.role === "doctor" || s.role === "owner"),
        )}
      />

      <QuickAddDoctorModal
        isOpen={state.isAddDoctorOpen}
        onClose={() => state.setIsAddDoctorOpen(false)}
        chairs={state.chairs}
        existingDoctorsCount={state.doctors.length}
        onAddDoctor={async (docData) => {
          if (onAddDoctor) {
            await onAddDoctor(docData);
          } else {
            const newStaffMember: any = {
              id: docData.id || `doc-quick-${Date.now()}`,
              organizationId:
                dashboard?.clinicSettings?.profile?.organizationId ||
                "00000000-0000-4000-8000-000000000001",
              fullName: docData.fullName,
              role: "doctor",
              specialties: [docData.specialty],
              phone: docData.phone || null,
              email: null,
              active: true,
              canSignMedicalRecords: true,
              canManageMoney: false,
              canManageImports: false,
              color: docData.color,
              preferredChairId: docData.preferredChairId || null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            if (dashboard?.clinicSettings?.staff) {
              dashboard.clinicSettings.staff = [...dashboard.clinicSettings.staff, newStaffMember];
            }
            if (docData.preferredChairId && onAssignChairDoctor) {
              const targetCh = state.chairs.find((c) => c.id === docData.preferredChairId);
              onAssignChairDoctor(docData.preferredChairId, {
                chairId: docData.preferredChairId,
                chairName: targetCh?.name || docData.preferredChairId,
                doctorId: newStaffMember.id,
                doctorName: newStaffMember.fullName,
                doctorSpecialty: docData.specialtyLabel,
                shiftPreset: "full",
                shiftLabel: "Весь день",
                shiftHours: "08:00–20:00",
                startHour: 8,
                endHour: 20,
              });
            }
          }
          state.setIsAddDoctorOpen(false);
        }}
      />
    </>
  );
}
