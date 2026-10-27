import type { Appointment } from "@dental/shared";
import type { ChairMaintenanceBlock } from "../../../utils/scheduleCollisionUtils";
import { QUANTUM_MINUTES, parseTimeToMinutes, formatMinutesToTime, snapMinutesTo15Min } from "./quantumTimeUtils";
import { type QuantumCollisionResult, type QuantumCollisionParams, isMaintenanceBlock } from "./quantumEngineTypes";

export function checkQuantumQuanta(
  chairOccupancy: Map<string, Map<number, Appointment | ChairMaintenanceBlock>>,
  doctorOccupancy: Map<string, Map<number, Appointment>>,
  patientOccupancy: Map<string, Map<number, Appointment>>,
  inactiveChairIds: Set<string>,
  params: QuantumCollisionParams,
): QuantumCollisionResult {
  const {
    chairId, doctorUserId, patientId, slotHour, startsAt, endsAt, durationMinutes,
    excludeAppointmentId, isCito = false, allowCitoOverbooking = false,
    doctorName = "Врач", chairName = "Кресло", patientName = "Пациент",
  } = params;

  if (chairId && inactiveChairIds.has(chairId)) {
    return { hasCollision: true, conflictType: "chair", conflictingEntity: null, message: `Кресло «${chairName}» заблокировано (отключено в настройках).` };
  }

  const effectiveSlotHour = slotHour ?? (startsAt ? startsAt.slice(11, 16) : "08:00");
  const startMin = snapMinutesTo15Min(parseTimeToMinutes(effectiveSlotHour));
  let effectiveDuration = durationMinutes;
  if (!effectiveDuration && startsAt && endsAt) {
    const diffMs = Date.parse(endsAt) - Date.parse(startsAt);
    if (Number.isFinite(diffMs) && diffMs > 0) effectiveDuration = Math.round(diffMs / 60000);
  }
  const finalDuration = Math.max(15, Math.round((effectiveDuration || 30) / QUANTUM_MINUTES) * QUANTUM_MINUTES);
  const endMin = startMin + finalDuration;

  for (let q = startMin; q < endMin; q += QUANTUM_MINUTES) {
    if (chairId) {
      const chairEntity = chairOccupancy.get(chairId)?.get(q);
      if (chairEntity && (!excludeAppointmentId || chairEntity.id !== excludeAppointmentId)) {
        if (isMaintenanceBlock(chairEntity)) {
          const rLabel = chairEntity.note || (chairEntity.reason === "sanitation" ? "санитарную обработку" : chairEntity.reason === "maintenance" ? "техобслуживание" : "технический перерыв");
          return { hasCollision: true, conflictType: "chair_maintenance", conflictingEntity: chairEntity, message: `Кресло «${chairName}» заблокировано: ${rLabel} (Технический перерыв).` };
        }
        if (isCito || allowCitoOverbooking) {
          return { hasCollision: true, isCitoOverbooking: true, conflictType: "chair", conflictingEntity: chairEntity, message: `Острая боль (CITO): наложение на кресле «${chairName}» допустимо` };
        }
        const chairTitle = chairName && chairName !== "Кресло" ? `Кресло «${chairName}»` : "Кресло";
        return { hasCollision: true, conflictType: "chair", conflictingEntity: chairEntity, message: `${chairTitle} уже занято в ${formatMinutesToTime(q)}.` };
      }
    }

    if (doctorUserId) {
      const docAppt = doctorOccupancy.get(doctorUserId)?.get(q);
      if (docAppt && (!excludeAppointmentId || docAppt.id !== excludeAppointmentId)) {
        if (isCito || allowCitoOverbooking) {
          return { hasCollision: true, isCitoOverbooking: true, conflictType: "doctor", conflictingEntity: docAppt, message: `Острая боль (CITO): наложение приёма врача ${doctorName} допустимо` };
        }
        const docTitle = doctorName && doctorName !== "Врач" ? `Врач ${doctorName}` : "Врач";
        return { hasCollision: true, conflictType: "doctor", conflictingEntity: docAppt, message: `${docTitle} уже ведет прием (занят) в ${formatMinutesToTime(q)}.` };
      }
    }

    if (patientId) {
      const patAppt = patientOccupancy.get(patientId)?.get(q);
      if (patAppt && (!excludeAppointmentId || patAppt.id !== excludeAppointmentId)) {
        const patTitle = patientName && patientName !== "Пациент" ? `Пациент ${patientName}` : "Пациент";
        return { hasCollision: true, conflictType: "patient", conflictingEntity: patAppt, message: `${patTitle} уже записан(а) на прием в ${formatMinutesToTime(q)}.` };
      }
    }
  }

  return { hasCollision: false, conflictType: null, conflictingEntity: null, message: null };
}
