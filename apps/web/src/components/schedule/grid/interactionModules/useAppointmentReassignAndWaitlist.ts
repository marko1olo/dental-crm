/**
 * useAppointmentReassignAndWaitlist.ts — Hook managing doctor/chair reassignment and freeing slot to waitlist.
 */

import { useCallback, useState } from "react";
import type { Appointment, Dashboard } from "@dental/shared";
import { showToast } from "../../../GlobalToast";
import { formatDoctorShortName } from "../../GridAppointmentCard";
import { DEFAULT_SOLO_CHAIR } from "../gridConstants";
import type { TargetSlotInfo } from "../../WaitlistDrawer";

export function useAppointmentReassignAndWaitlist(
  dashboard: Dashboard,
  patientName: (patients: Dashboard["patients"], patientId: string | null) => string,
  // biome-ignore lint/suspicious/noExplicitAny: move payload
  onAppointmentMove?: ((appointmentId: string, updates: any) => Promise<any> | void) | undefined,
  onQuickStatusChange?: ((appointmentId: string, status: Appointment["status"]) => void) | undefined,
  onOpenWaitlistForSlot?: ((slot: TargetSlotInfo) => void) | undefined,
  setSelectedMobileAppt?: React.Dispatch<React.SetStateAction<Appointment | null>> | undefined,
  setActiveMenuApptId?: React.Dispatch<React.SetStateAction<string | null>> | undefined,
) {
  const [waitlistDrawerSlot, setWaitlistDrawerSlot] = useState<TargetSlotInfo | null>(null);

  const handleFreeSlotToWaitlist = useCallback(
    (appt: Appointment) => {
      if (typeof onQuickStatusChange === "function") {
        onQuickStatusChange(appt.id, "cancelled");
      } else if (typeof onAppointmentMove === "function") {
        void onAppointmentMove(appt.id, { status: "cancelled" });
      }

      const doc = dashboard?.clinicSettings?.staff?.find((s) => s.id === appt.doctorUserId);
      const chair = dashboard?.clinicSettings?.chairs?.find((c) => c.id === appt.chairId);
      const pName = patientName ? patientName(dashboard?.patients ?? [], appt.patientId) : null;

      const slotInfo: TargetSlotInfo = {
        appointmentId: appt.id,
        startsAt: appt.startsAt,
        endsAt: appt.endsAt,
        doctorUserId: appt.doctorUserId,
        // biome-ignore lint/suspicious/noExplicitAny: doctor name
        doctorName: doc?.fullName || (doc as any)?.name || null,
        chairId: appt.chairId,
        chairName: chair?.name || null,
        patientId: appt.patientId,
        patientName: pName,
        freedBecause: "Освобождено для листа ожидания",
        reason: appt.reason,
      };

      showToast("Слот освобожден. Открываю подбор кандидатов из листа ожидания…", "info", 3000);
      setActiveMenuApptId?.(null);
      setSelectedMobileAppt?.(null);

      if (onOpenWaitlistForSlot) {
        onOpenWaitlistForSlot(slotInfo);
      } else {
        setWaitlistDrawerSlot(slotInfo);
      }
    },
    [dashboard, onAppointmentMove, onQuickStatusChange, patientName, onOpenWaitlistForSlot, setActiveMenuApptId, setSelectedMobileAppt],
  );

  const handleReassignAppointmentChair = useCallback(
    (appt: Appointment, targetChairId: string | null) => {
      const pName = patientName ? patientName(dashboard?.patients ?? [], appt.patientId) : "Пациент";
      const chairName = targetChairId
        ? dashboard?.clinicSettings?.chairs?.find((c) => c.id === targetChairId)?.name ||
          (targetChairId === DEFAULT_SOLO_CHAIR.id ? DEFAULT_SOLO_CHAIR.name : "Кресло")
        : "Без кресла";

      if (typeof onAppointmentMove === "function") {
        void Promise.resolve(onAppointmentMove(appt.id, { chairId: targetChairId, allowOverbooking: true })).then((result) => {
          if (result !== false) {
            showToast(`Прием ${pName} перенесен на ${chairName}`, "success", 3000);
          }
        });
      } else {
        showToast(`Прием ${pName} перенесен на ${chairName}`, "success", 3000);
      }

      setSelectedMobileAppt?.((prev) => (prev && prev.id === appt.id ? { ...prev, chairId: targetChairId } : prev));
      setActiveMenuApptId?.(null);
    },
    [dashboard, onAppointmentMove, patientName, setActiveMenuApptId, setSelectedMobileAppt],
  );

  const handleReassignAppointmentDoctor = useCallback(
    (appt: Appointment, targetDoctorUserId: string) => {
      const pName = patientName ? patientName(dashboard?.patients ?? [], appt.patientId) : "Пациент";
      const docName = dashboard?.clinicSettings?.staff?.find((s) => s.id === targetDoctorUserId)?.fullName || "Врач";

      if (typeof onAppointmentMove === "function") {
        void Promise.resolve(onAppointmentMove(appt.id, { doctorUserId: targetDoctorUserId, allowOverbooking: true })).then((result) => {
          if (result !== false) {
            showToast(`Врач приема ${pName} изменен на ${formatDoctorShortName(docName)}`, "success", 3000);
          }
        });
      } else {
        showToast(`Врач приема ${pName} изменен на ${formatDoctorShortName(docName)}`, "success", 3000);
      }

      setSelectedMobileAppt?.((prev) => (prev && prev.id === appt.id ? { ...prev, doctorUserId: targetDoctorUserId } : prev));
      setActiveMenuApptId?.(null);
    },
    [dashboard, onAppointmentMove, patientName, setActiveMenuApptId, setSelectedMobileAppt],
  );

  return {
    waitlistDrawerSlot,
    setWaitlistDrawerSlot,
    handleFreeSlotToWaitlist,
    handleReassignAppointmentChair,
    handleReassignAppointmentDoctor,
  };
}
