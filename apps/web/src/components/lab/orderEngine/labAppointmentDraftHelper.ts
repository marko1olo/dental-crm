/**
 * labAppointmentDraftHelper.ts — Сквозная привязка нарядов ЗТЛ к визитам и расписанию (Мандаты 8e, 8n).
 */

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

export const ONE_CLICK_LAB_DEFAULTS = {
	materialId: "zirconia_multilayer",
	materialName: "Диоксид циркония (Katana STML)",
	colorVita: "A2",
	workingDays: 5,
	translucency: "HT",
	surfaceTexture: "natural_anatomy",
	cementGapMicrons: 30,
	shadeSystem: "classical" as const,
	restorationTypeSingle: "single_crown",
	restorationTypeBridge: "bridge",
};

/**
 * Извлекает информацию о бронировании примерки из наряда ЗТЛ для привязки к ScheduleView.
 */
export function buildLabAppointmentDraft(order: {
	patientId: string;
	patientName?: string | null | undefined;
	doctorId?: string | null | undefined;
	doctorName?: string | null | undefined;
	toothFdi?: string | null | undefined;
	material?: string | null | undefined;
	dueDate?: string | null | undefined;
	deliveryDate?: string | null | undefined;
	ceramicTrialDate?: string | null | undefined;
	frameworkTrialDate?: string | null | undefined;
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
