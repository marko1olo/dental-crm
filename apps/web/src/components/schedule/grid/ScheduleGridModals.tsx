import React from "react";
import type { Dashboard } from "@dental/shared";
import { DoctorChairScheduleModal } from "../DoctorChairScheduleModal";
import { QuickAddChairModal, type QuickAddChairData } from "../QuickAddChairModal";
import { QuickAddDoctorModal, type QuickAddDoctorData } from "../QuickAddDoctorModal";
import { WaitlistDrawer, type TargetSlotInfo } from "../WaitlistDrawer";
import type { ChairDoctorShiftAssignment } from "./gridTypes";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";

export interface ScheduleGridModalsProps {
  assigningChairId: string | null;
  setAssigningChairId: (id: string | null) => void;
  effectiveChairs: Array<any>;
  doctors: Array<any>;
  dateKey: string;
  effectiveChairAssignments: Record<string, ChairDoctorShiftAssignment>;
  handleConfirmAssignDoctor: (
    chairId: string,
    docId: string,
    shiftPreset: any,
    eveningDocId?: string,
  ) => void;
  handleUnassignDoctor: (chairId: string) => void;
  onAddDoctor?: ((doctorData: QuickAddDoctorData) => Promise<any> | any) | undefined;
  isSoloDoctor: boolean;
  onOpenAddChair?: (() => void) | undefined;
  isInternalAddChairModalOpen: boolean;
  setIsInternalAddChairModalOpen: (open: boolean) => void;
  onAddChair?: ((chairData: QuickAddChairData) => Promise<any> | any) | undefined;
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
  // Координация шторки листа ожидания сетки с uiSurfaceStore (Мандаты 8b, 8e)
  React.useEffect(() => {
    if (waitlistDrawerSlot) {
      useUiSurfaceStore.getState().openDrawer("waitlist");
    } else if (useUiSurfaceStore.getState().activeDrawer === "waitlist") {
      useUiSurfaceStore.getState().closeDrawer("waitlist");
    }
  }, [waitlistDrawerSlot]);

  // Подписка на внешние изменения: если открывается модалка или другая шторка, закрываем локальный waitlist
  React.useEffect(() => {
    const unsub = useUiSurfaceStore.subscribe((state) => {
      if (waitlistDrawerSlot) {
        if (state.hasPrimaryModal || (state.activeDrawer && state.activeDrawer !== "waitlist")) {
          setWaitlistDrawerSlot(null);
        }
      }
    });
    return unsub;
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
                (assignment.shiftPreset as any) || "morning",
                assignment.subShifts?.[1]?.doctorId,
              );
            } else {
              handleUnassignDoctor(chairId);
            }
            setAssigningChairId(null);
          }}
          onAddDoctor={onAddDoctor}
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
            onAddChair ||
            (async (chairData) => {
              const newChair = {
                id: chairData.id || `chair-${Date.now()}`,
                name: chairData.name,
                room: chairData.room || chairData.roomNumber || "",
                color: chairData.color || "#0d9488",
                specialization: chairData.specialization,
                active: chairData.isActive ?? true,
                branchId: chairData.branchId,
              };
              if (dashboard?.clinicSettings) {
                dashboard.clinicSettings.chairs = [
                  ...(dashboard.clinicSettings.chairs || []),
                  newChair as any,
                ];
              }
              if (chairData.defaultDoctorId) {
                handleConfirmAssignDoctor(
                  newChair.id,
                  chairData.defaultDoctorId,
                  "full",
                );
              }
              setIsInternalAddChairModalOpen(false);
            })
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
              const createdResult: any = await onAddDoctor(docData);
              if (createdResult && createdResult.id) {
                createdDoctorId = createdResult.id;
              }
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
              createdDoctorId = newStaffMember.id;
              if (dashboard?.clinicSettings) {
                dashboard.clinicSettings.staff = [
                  ...(dashboard.clinicSettings.staff || []),
                  newStaffMember,
                ];
              }
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

      {waitlistDrawerSlot && (
        <WaitlistDrawer
          isOpen={Boolean(waitlistDrawerSlot)}
          onClose={() => {
            setWaitlistDrawerSlot(null);
            useUiSurfaceStore.getState().closeDrawer("waitlist");
          }}
          targetSlot={waitlistDrawerSlot}
          dashboard={dashboard}
          onAppointmentCreated={() => {
            setWaitlistDrawerSlot(null);
            useUiSurfaceStore.getState().closeDrawer("waitlist");
          }}
        />
      )}
    </>
  );
}
