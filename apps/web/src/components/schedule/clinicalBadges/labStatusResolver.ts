import type {
	Appointment,
	AppointmentLabStatusInfo,
} from "@dental/shared";
import { evaluateAppointmentLabStatus } from "@dental/shared";
import type { ExtendedAppointmentBadgeData } from "./types";

/**
 * Resolves lab order status info:
 * - «Поступил в клинику» (ready_in_clinic: зеленый/emerald)
 * - «Просрочен» (overdue: красный/rose с числом дней задержки)
 * - «В лаборатории» (in_lab: желтый/amber)
 */
export function resolveAppointmentLabStatus(
	appointment?: Appointment | null,
	explicitLabOrder?: AppointmentLabStatusInfo | Record<string, unknown> | null | undefined,
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

	const aAny = appointment as ExtendedAppointmentBadgeData | null | undefined;
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
		return evaluateAppointmentLabStatus(candidate as Parameters<typeof evaluateAppointmentLabStatus>[0], referenceDate);
	}

	return null;
}
