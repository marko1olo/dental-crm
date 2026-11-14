import type { DentalLabOrderData } from "../labMath";

export interface LabScheduleSlotInfo {
	patientId: string;
	patientName?: string | undefined;
	doctorId?: string | null | undefined;
	doctorName?: string | null | undefined;
	targetDateIso: string;
	reason: string;
	toothFdi?: string | null | undefined;
	material?: string | null | undefined;
}

/**
 * Extracts slot planning info from a lab order to seamlessly bind dueDate with ScheduleView.
 */
export function buildLabAppointmentDraft(order: DentalLabOrderData | {
	patientId: string;
	patientName?: string | null | undefined;
	doctorId?: string | null;
	doctorName?: string | null;
	toothFdi?: string | null;
	material?: string | null;
	dueDate?: string | null;
	deliveryDate?: string | null;
	ceramicTrialDate?: string | null;
	frameworkTrialDate?: string | null;
	status?: string | undefined;
}): LabScheduleSlotInfo | null {
	const targetDate =
		order.dueDate ||
		order.deliveryDate ||
		order.ceramicTrialDate ||
		order.frameworkTrialDate;

	if (!targetDate) return null;

	const toothStr = order.toothFdi ? `зуб ${order.toothFdi}` : "ортопедия";
	const matStr = order.material ? ` (${order.material})` : "";
	const isFitting = order.status === "fitting" || order.status === "refitting";
	const actionName = isFitting ? "Примерка конструкции ЗТЛ" : "Установка / фиксация конструкции ЗТЛ";

	return {
		patientId: order.patientId,
		patientName: order.patientName ?? undefined,
		doctorId: order.doctorId ?? undefined,
		doctorName: order.doctorName ?? undefined,
		targetDateIso: String(targetDate),
		reason: `${actionName}: ${toothStr}${matStr}`,
		toothFdi: order.toothFdi ?? undefined,
		material: order.material ?? undefined,
	};
}
