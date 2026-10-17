import type {
	Appointment,
	AppointmentLabStatusInfo,
} from "@dental/shared";
import { evaluateAppointmentLabStatus } from "@dental/shared";

/**
 * Resolves lab order status info:
 * - «Поступил в клинику» (ready_in_clinic: зеленый/emerald)
 * - «Просрочен» (overdue: красный/rose с числом дней задержки)
 * - «В лаборатории» (in_lab: желтый/amber)
 */
export function resolveAppointmentLabStatus(
	appointment?: Appointment | null,
	// biome-ignore lint/suspicious/noExplicitAny: lab order payload
	explicitLabOrder?: any,
	referenceDate: Date | string = new Date(),
): AppointmentLabStatusInfo | null {
	if (!appointment && !explicitLabOrder) return null;

	if (
		explicitLabOrder &&
		typeof explicitLabOrder === "object" &&
		"state" in explicitLabOrder &&
		"badgeClass" in explicitLabOrder
	) {
		return explicitLabOrder as AppointmentLabStatusInfo;
	}

	// biome-ignore lint/suspicious/noExplicitAny: polymorphic appointment structure
	const aAny = appointment as any;
	const candidate =
		explicitLabOrder ||
		aAny?.labOrder ||
		(aAny?.labOrderId ||
		aAny?.labWorkTitle ||
		aAny?.labDueDate ||
		aAny?.labStatus
			? {
					id: aAny?.labOrderId,
					orderNumber: aAny?.labOrderNumber,
					patientId: appointment?.patientId,
					toothFdi: aAny?.toothNumber || aAny?.tooth,
					workType: aAny?.labWorkTitle || aAny?.labWorkType,
					material: aAny?.labMaterial,
					colorVita: aAny?.colorVita || aAny?.vitaShade,
					dueDate: aAny?.labDueDate || aAny?.expectedLabDeliveryDate,
					status: aAny?.labStatus,
					stage: aAny?.labStage,
					receivedDate: aAny?.labReceivedDate,
				}
			: null);

	if (candidate) {
		return evaluateAppointmentLabStatus(candidate, referenceDate);
	}

	const reason = (appointment?.reason || "").toLowerCase();
	if (/лаборат|наряд|слепок|коронк|протез|вкладк|примерк/i.test(reason)) {
		return evaluateAppointmentLabStatus(
			{
				status: /готов|сдач|поступ/i.test(reason) ? "ready_in_clinic" : "in_progress",
				workType: appointment?.reason ?? null,
			},
			referenceDate,
		);
	}

	return null;
}
