import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";
import type { UseQuickBookingSubmitParams } from "./QuickBookingDrawerTypes";

interface BuildPayloadOptions {
  params: UseQuickBookingSubmitParams;
  activePatientId: string | null;
  startsAtIso: string;
  endsAtIso: string;
  isEmergency: boolean;
  overbookOverride?: boolean | undefined;
}

export function buildQuickBookingPayload(opts: BuildPayloadOptions) {
  const { params, activePatientId, startsAtIso, endsAtIso, isEmergency, overbookOverride } = opts;
  const {
    doctorUserId, dutyDoctorId, doctors, chairId, chairs, assistantUserId,
    isSoloClinic, reason, comment, status, initialSlot,
  } = params;

  /*
   * Честный payload: без выбранных врача/кресла уходит null, а не выдуманный
   * алиас «doctor-default»/«chair-1». Сервер (prepareCreateAppointmentRawBody)
   * резолвит null в реального врача и реальное кресло этой клиники из БД —
   * врать идентификаторами на клиенте незачем, источник правды один: база.
   */
  const effDoctor = doctorUserId || dutyDoctorId || doctors[0]?.id || null;
  const effChair = chairId || chairs[0]?.id || null;
  const effectiveReason = reason.trim() || (isEmergency ? "Срочно! Острая боль" : "Приём врача");

  const stageServices = initialSlot?.services || initialSlot?.items || initialSlot?.procedures || [];
  const planId = initialSlot?.treatmentPlanId || initialSlot?.planId || null;
  const stageId = initialSlot?.stageId || (initialSlot?.stageNumber ? String(initialSlot.stageNumber) : null);
  let effectiveComment = comment.trim();
  if (planId && !effectiveComment.includes("План лечения")) {
    const marker = `[План лечения: ${planId}${initialSlot?.stageTitle ? ` | ${initialSlot.stageTitle}` : ""}]${stageId ? ` [Этап: ${stageId}]` : ""}`;
    effectiveComment = effectiveComment ? `${marker}\n${effectiveComment}` : marker;
  }

  const allowOverbookingFlag = Boolean(isEmergency || overbookOverride);
  return {
    patientId: activePatientId || null,
    doctorUserId: effDoctor,
    assistantUserId: isSoloClinic ? null : assistantUserId || null,
    chairId: effChair,
    startsAt: startsAtIso,
    endsAt: endsAtIso,
    status,
    reason: effectiveReason,
    comment: effectiveComment,
    isCito: isEmergency,
    cito: isEmergency,
    allowOverbooking: allowOverbookingFlag,
    allowEmergencyOverride: allowOverbookingFlag,
    treatmentPlanId: planId,
    stageId,
    invoice_items: stageServices,
    invoiceItems: stageServices,
    completedServices: stageServices,
  };
}

export async function handleBookingError(
  res: Response,
  isEditing: boolean,
  setSlotConflict: ((c: any) => void) | undefined,
  setSubmitError: (e: string | null) => void,
) {
  let errData: any = null;
  try {
    errData = await res.json();
  } catch {
    // Ignore JSON parse failure
  }

  const conflictMessage = errData?.message || errData?.error;
  if (
    res.status === 409 ||
    errData?.code === "AppointmentCreateRejected" ||
    errData?.reason === "resource_overlap" ||
    errData?.code === "resource_overlap" ||
    errData?.code === "overlap"
  ) {
    const userFacingMsg = conflictMessage || "Слот уже занят другим приёмом. Выберите другое время или кресло.";
    if (typeof setSlotConflict === "function") {
      setSlotConflict({
        message: userFacingMsg,
        suggestedSlots: Array.isArray(errData?.suggestedSlots) ? errData.suggestedSlots : [],
      });
    }
    setSubmitError(userFacingMsg);
    showToast(userFacingMsg, "warning", 6000);
    return;
  }

  const defaultMsg = isEditing ? "Ошибка обновления записи на сервере" : "Ошибка создания записи на сервере";
  showToast(actionFailureToast(conflictMessage || defaultMsg, res.status), "warning");
  setSubmitError(conflictMessage || `Ошибка при ${isEditing ? "обновлении" : "создании"} записи (${res.status})`);
}
