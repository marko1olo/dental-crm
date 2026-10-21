import { useCallback, useMemo } from "react";
import type { Dashboard } from "@dental/shared";
import { formatDoctorShortName } from "../GridAppointmentCard";
import { showToast } from "../../GlobalToast";
import { safeLocalStorageGetJson, safeLocalStorageSetJson } from "../../../lib/safeLocalStorage";
import { useScheduleChairShiftBulkOps } from "./useScheduleChairShiftBulkOps";
import type { ChairDoctorShiftAssignment } from "./gridTypes";
import { useChairDutyStaff } from "./chairDuty/useChairDutyStaff";
import { useChairDutyStorage } from "./chairDuty/useChairDutyStorage";
import { computeEffectiveChairAssignments } from "./chairDuty/effectiveChairAssignmentsBuilder";
import { resolveDoctorForChairAndHour, resolveSuggestedDoctorForChair } from "./chairDuty/chairDutyDoctorResolution";
import { buildChairShiftAssignment } from "./chairDuty/chairDutyAssignmentBuilder";
import { useChairDutyModals } from "./chairDuty/useChairDutyModals";

export interface UseScheduleChairDutyProps {
  dashboard: Dashboard;
  dateKey: string;
  selectedChairId?: string | null | undefined;
  chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
  onAssignChairDoctor?: ((chairId: string, assignment: ChairDoctorShiftAssignment | null) => void) | undefined;
  onOpenAddChair?: (() => void) | undefined;
}

export function useScheduleChairDuty(props: UseScheduleChairDutyProps) {
  const { dashboard, dateKey, selectedChairId, chairDoctorAssignments, onAssignChairDoctor, onOpenAddChair } = props;
  const staffState = useChairDutyStaff(dashboard, selectedChairId);
  const { localChairAssignments, setLocalChairAssignments, saveAssignment } = useChairDutyStorage(dateKey, chairDoctorAssignments);

  const effectiveChairAssignments = useMemo(() => {
    return computeEffectiveChairAssignments(
      staffState.effectiveChairs,
      staffState.doctors,
      staffState.isSoloDoctor,
      chairDoctorAssignments,
      localChairAssignments,
    );
  }, [staffState.effectiveChairs, staffState.doctors, staffState.isSoloDoctor, chairDoctorAssignments, localChairAssignments]);

  const getSuggestedDoctorForChair = useCallback(
    (targetChairId: string) => resolveSuggestedDoctorForChair(targetChairId, staffState.effectiveChairs, staffState.doctors),
    [staffState.effectiveChairs, staffState.doctors],
  );

  const getDoctorForChairAndHour = useCallback(
    (targetChairId: string, hourStr: string) => resolveDoctorForChairAndHour(targetChairId, hourStr, effectiveChairAssignments),
    [effectiveChairAssignments],
  );

  const modals = useChairDutyModals(staffState.doctors, effectiveChairAssignments, getSuggestedDoctorForChair, onOpenAddChair);

  const handleConfirmAssignDoctor = useCallback(
    (chairId: string, docId: string, shiftPreset: any, eveningDocId?: string) => {
      const assignment = buildChairShiftAssignment(chairId, docId, shiftPreset, staffState.doctors, effectiveChairAssignments, eveningDocId);
      const chair = staffState.effectiveChairs.find((c) => c.id === chairId) || { id: chairId, name: "Кресло" };
      saveAssignment(chairId, assignment);
      if (typeof onAssignChairDoctor === "function") onAssignChairDoctor(chairId, assignment);

      if (shiftPreset === "two_shifts") {
        const evDoc = staffState.doctors.find((d) => d.id === (eveningDocId || docId));
        showToast(`Кресло «${chair.name}»: 2 смены (Утро: ${formatDoctorShortName(assignment.doctorName)}, Вечер: ${formatDoctorShortName(evDoc?.fullName || "Врач")})`, "success", 3500);
      } else {
        showToast(`Врач ${formatDoctorShortName(assignment.doctorName)} закреплен за креслом «${chair.name}» (${assignment.shiftHours})`, "success", 3000);
      }
    },
    [staffState.doctors, staffState.effectiveChairs, saveAssignment, onAssignChairDoctor, effectiveChairAssignments],
  );

  const handleBindDoctorToChair = useCallback(
    (chairId: string, doctorId: string) => {
      const targetChair = staffState.effectiveChairs.find((c) => c.id === chairId);
      const targetDoc = staffState.doctors.find((d) => d.id === doctorId) || (dashboard?.clinicSettings?.staff ?? []).find((s) => s.id === doctorId);
      if (typeof window !== "undefined") {
        const storedPref = safeLocalStorageGetJson<Record<string, string>>("dente_doctor_preferred_chairs", {});
        storedPref[doctorId] = chairId;
        safeLocalStorageSetJson("dente_doctor_preferred_chairs", storedPref);
        const storedChairDef = safeLocalStorageGetJson<Record<string, string>>("dente_chair_default_doctors", {});
        storedChairDef[chairId] = doctorId;
        safeLocalStorageSetJson("dente_chair_default_doctors", storedChairDef);
      }
      if (targetDoc) (targetDoc as any).preferredChairId = chairId;
      if (targetChair) (targetChair as any).defaultDoctorId = doctorId;
      handleConfirmAssignDoctor(chairId, doctorId, "full");
      showToast(`Врач ${targetDoc ? formatDoctorShortName(targetDoc.fullName) : doctorId} закреплен за креслом «${targetChair?.name || chairId}»`, "success", 3500);
    },
    [staffState.effectiveChairs, staffState.doctors, dashboard?.clinicSettings?.staff, handleConfirmAssignDoctor],
  );

  const bulkOps = useScheduleChairShiftBulkOps({
    doctors: staffState.doctors, effectiveChairs: staffState.effectiveChairs,
    effectiveChairAssignments, dateKey, dashboard, setLocalChairAssignments, onAssignChairDoctor,
  });

  return {
    ...staffState, localChairAssignments, setLocalChairAssignments, effectiveChairAssignments,
    ...modals, getSuggestedDoctorForChair, getDoctorForChairAndHour,
    handleConfirmAssignDoctor, handleBindDoctorToChair, ...bulkOps,
  };
}
