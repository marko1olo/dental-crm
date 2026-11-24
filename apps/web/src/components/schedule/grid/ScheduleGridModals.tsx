import React from "react";
import type { Dashboard } from "@dental/shared";
import { DoctorChairScheduleModal } from "../DoctorChairScheduleModal";
import { QuickAddChairModal, type QuickAddChairData } from "../QuickAddChairModal";
import { QuickAddDoctorModal, type QuickAddDoctorData } from "../QuickAddDoctorModal";
import type { TargetSlotInfo } from "../waitlist/WaitlistDrawer";
import type { ChairDoctorShiftAssignment } from "./gridTypes";
import type { ScheduleChairItem } from "./scheduleChairHeaderTypes";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";

export interface ScheduleGridModalsProps {
  assigningChairId: string | null;
  setAssigningChairId: (id: string | null) => void;
  effectiveChairs: Array<ScheduleChairItem | NonNullable<Dashboard["clinicSettings"]["chairs"]>[number]>;
  doctors: Array<{ id: string; fullName: string; role?: string; specialties?: string[]; [key: string]: unknown }>;
  dateKey: string;
  effectiveChairAssignments: Record<string, ChairDoctorShiftAssignment>;
  handleConfirmAssignDoctor: (
    chairId: string,
    docId: string,
    shiftPreset: string | unknown,
    eveningDocId?: string,
  ) => void;
  handleUnassignDoctor: (chairId: string) => void;
  onAddDoctor?: ((doctorData: QuickAddDoctorData) => Promise<unknown> | unknown) | undefined;
  isSoloDoctor: boolean;
  onOpenAddChair?: (() => void) | undefined;
  isInternalAddChairModalOpen: boolean;
  setIsInternalAddChairModalOpen: (open: boolean) => void;
  onAddChair?: ((chairData: QuickAddChairData) => Promise<unknown> | unknown) | undefined;
  dashboard: Dashboard;
  isQuickAddDoctorOpen: boolean;
  setIsQuickAddDoctorOpen: (open: boolean) => void;
  handleBindDoctorToChair: (chairId: string, doctorId: string) => void;
  waitlistDrawerSlot: TargetSlotInfo | null;
  setWaitlistDrawerSlot: (slot: TargetSlotInfo | null) => void;
}

export function ScheduleGridModals({
  assigningChairId,
  setAssigningChairId,
  effectiveChairs,
  doctors,
  dateKey,
  effectiveChairAssignments,
  handleConfirmAssignDoctor,
  handleUnassignDoctor,
  onAddDoctor,
  isSoloDoctor,
  onOpenAddChair,
  isInternalAddChairModalOpen,
  setIsInternalAddChairModalOpen,
  onAddChair,
  dashboard,
  isQuickAddDoctorOpen,
  setIsQuickAddDoctorOpen,
  handleBindDoctorToChair,
  waitlistDrawerSlot,
  setWaitlistDrawerSlot,
}: ScheduleGridModalsProps) {
  // Forward waitlistDrawerSlot to central ScheduleViewModals (SSOT)
  React.useEffect(() => {
    if (waitlistDrawerSlot) {
      window.dispatchEvent(
        new CustomEvent("dente:open-waitlist-for-slot", { detail: waitlistDrawerSlot })
      );
      setWaitlistDrawerSlot(null);
    }
  }, [waitlistDrawerSlot, setWaitlistDrawerSlot]);

  return (
    <>
      {/* 1-Click Chair-to-Doctor Shift Allocation Modal */}
      {assigningChairId && (
        <DoctorChairScheduleModal
          isOpen={Boolean(assigningChairId)}
          onClose={() => setAssigningChairId(null)}
          chair={
            effectiveChairs.find((c) => c.id === assigningChairId) || {
              id: assigningChairId,
              name: "Кресло",
            }
          }
          chairs={effectiveChairs}
          doctors={doctors}
          dateKey={dateKey}
          currentAssignment={effectiveChairAssignments[assigningChairId]}
          onAssign={(chairId, assignment) => {
            if (assignment) {
              handleConfirmAssignDoctor(
                chairId,
                assignment.doctorId,
                assignment.shiftPreset || "morning",
                assignment.subShifts?.[1]?.doctorId,
              );
            } else {
              handleUnassignDoctor(chairId);
            }
            setAssigningChairId(null);
          }}
          onAddDoctor={
            onAddDoctor
              ? async (docData) => {
                  await onAddDoctor(docData);
                }
              : undefined
          }
          isSoloDoctor={isSoloDoctor}
        />
      )}

      {/* Quick Add Chair Modal for inline grid additions */}
      {!onOpenAddChair && isInternalAddChairModalOpen && (
        <QuickAddChairModal
          isOpen={isInternalAddChairModalOpen}
          onClose={() => setIsInternalAddChairModalOpen(false)}
          existingChairsCount={effectiveChairs.length}
          doctors={doctors}
          onAddChair={
            onAddChair
              ? async (chairData) => {
                  await onAddChair(chairData);
                }
              : async (chairData) => {
                  const newChair = {
                    id: chairData.id || `chair-${Date.now()}`,
                    name: chairData.name,
                    room: chairData.room || chairData.roomNumber || "",
                    color: chairData.color || "#0d9488",
                    specialization: chairData.specialization,
                    active: chairData.isActive ?? true,
                    branchId: chairData.branchId,
                  };
                  if (chairData.defaultDoctorId) {
                    handleConfirmAssignDoctor(
                      newChair.id,
                      chairData.defaultDoctorId,
                      "full",
                    );
                  }
                  setIsInternalAddChairModalOpen(false);
                }
          }
        />
      )}

      {/* Quick Add Doctor Modal for inline grid additions */}
      {isQuickAddDoctorOpen && (
        <QuickAddDoctorModal
          isOpen={isQuickAddDoctorOpen}
          onClose={() => setIsQuickAddDoctorOpen(false)}
          chairs={effectiveChairs}
          existingDoctorsCount={doctors.length}
          onAddDoctor={async (docData) => {
            let createdDoctorId = docData.id;
            if (onAddDoctor) {
              const createdResult = await onAddDoctor(docData);
              if (createdResult && typeof createdResult === "object" && "id" in createdResult && typeof createdResult.id === "string") {
                createdDoctorId = createdResult.id;
              }
            } else {
              const newStaffMember = {
                id: docData.id || `doc-quick-${Date.now()}`,
                organizationId:
                  (dashboard as { organizationId?: string })?.organizationId ||
                  dashboard?.clinicSettings?.profile?.organizationId ||
                  undefined,
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
                preferredChairId: docData.preferredChairId || effectiveChairs[0]?.id || null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              createdDoctorId = newStaffMember.id;
            }
            if (docData.preferredChairId && createdDoctorId) {
              handleBindDoctorToChair(
                docData.preferredChairId,
                createdDoctorId,
              );
            }
            setIsQuickAddDoctorOpen(false);
          }}
        />
      )}
    </>
  );
}
