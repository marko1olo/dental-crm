import { type ProstheticTypeId, PROSTHETIC_TYPES } from "./labWorkOrderPresets";
import type { LabWorkOrderSchedule } from "./labWorkOrderTypes";

export function addWorkingDays(startDate: Date, daysToAdd: number): Date {
	const result = new Date(startDate);
	let added = 0;
	while (added < daysToAdd) {
		result.setDate(result.getDate() + 1);
		const dayOfWeek = result.getDay();
		if (dayOfWeek !== 0 && dayOfWeek !== 6) {
			added++;
		}
	}
	return result;
}

export function formatDateToIsoDay(d: Date): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function calculateLabTurnaroundSchedule(params: {
	orderDate: Date | string;
	prostheticTypeId: ProstheticTypeId;
	customWorkingDays?: number | undefined;
	currentDate?: Date | string | undefined;
}): LabWorkOrderSchedule {
	const orderD = typeof params.orderDate === "string" ? new Date(params.orderDate) : params.orderDate;
	const nowD = params.currentDate
		? (typeof params.currentDate === "string" ? new Date(params.currentDate) : params.currentDate)
		: new Date();

	const preset = PROSTHETIC_TYPES[params.prostheticTypeId] || PROSTHETIC_TYPES.crown_zirconia_monolithic;
	const workingDays = Math.max(1, params.customWorkingDays ?? preset.standardTurnaroundWorkingDays);

	const cadDate = addWorkingDays(orderD, 1);
	const millingDate = addWorkingDays(orderD, Math.max(2, Math.floor(workingDays * 0.5)));
	const fittingDate = preset.requiresFittingStage
		? addWorkingDays(orderD, Math.max(3, Math.floor(workingDays * 0.7)))
		: undefined;
	const deliveryDate = addWorkingDays(orderD, workingDays);

	const diffMs = deliveryDate.getTime() - nowD.getTime();
	const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

	let deadlineStatus: LabWorkOrderSchedule["deadlineStatus"] = "on_track";
	let deadlineStatusRu = "В графике";
	let colorToken = "var(--ok, #10b981)";

	if (daysRemaining < 0) {
		deadlineStatus = "overdue";
		deadlineStatusRu = `Просрочено на ${Math.abs(daysRemaining)} дн.`;
		colorToken = "var(--bad, #ef4444)";
	} else if (daysRemaining === 0) {
		deadlineStatus = "urgent_today";
		deadlineStatusRu = "Сдача сегодня!";
		colorToken = "var(--bad, #ef4444)";
	} else if (daysRemaining <= 2) {
		deadlineStatus = "approaching_deadline";
		deadlineStatusRu = `Срок через ${daysRemaining} дн.`;
		colorToken = "var(--warn, #f59e0b)";
	}

	return {
		orderDate: formatDateToIsoDay(orderD),
		workingDaysRequired: workingDays,
		expectedCadDate: formatDateToIsoDay(cadDate),
		expectedMillingDate: formatDateToIsoDay(millingDate),
		expectedFittingDate: fittingDate ? formatDateToIsoDay(fittingDate) : undefined,
		expectedDeliveryDate: formatDateToIsoDay(deliveryDate),
		daysRemaining,
		isOverdue: daysRemaining < 0,
		deadlineStatus,
		deadlineStatusRu,
		colorToken,
	};
}
