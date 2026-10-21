import { parseDateToMidnight, formatDateToIsoDay, formatRussianDate } from "./workflowDateUtils";

export type LabDeadlineStatus =
	| "ON_TRACK" // В графике, запас времени достаточен
	| "APPROACHING" // Срок приближается (осталось <= 2 дней)
	| "URGENT_TODAY" // Срок готовности сегодня!
	| "OVERDUE" // Лаборатория просрочила плановую дату готовности
	| "VISIT_CONFLICT"; // КРИТИЧЕСКИЙ КОНФЛИКТ: дата готовности позже визита/примерки!

export interface LabDelayAlert {
	readonly hasAlert: boolean;
	readonly isDelayedAlert: boolean;
	readonly lab_delay_alert: boolean;
	readonly status: LabDeadlineStatus;
	readonly severity: "CRITICAL" | "WARNING" | "INFO" | "OK";
	readonly daysDifference: number;
	readonly expectedLabDateIso: string;
	readonly scheduledVisitDateIso?: string | undefined;
	readonly fittingDateIso?: string | undefined;
	readonly appointmentId?: string | undefined;
	readonly alertMessageRu: string;
	readonly detailedReasonRu: string;
	readonly recommendedActionRu: string;
}

export interface CheckLabDeadlineParams {
	readonly expectedLabDate: string | Date;
	readonly scheduledVisitDate?: string | Date | null | undefined;
	readonly fittingDate?: string | Date | null | undefined;
	readonly appointmentId?: string | null | undefined;
	readonly currentDate?: string | Date | undefined;
	readonly isInstalledOrCompleted?: boolean | undefined;
	readonly orderNumber?: string | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly labName?: string | undefined;
}

export function checkLabDeadlineAndAlert(params: CheckLabDeadlineParams): LabDelayAlert {
	const expectedDate = parseDateToMidnight(params.expectedLabDate);
	const expectedIso = formatDateToIsoDay(expectedDate);
	const expectedRu = formatRussianDate(expectedIso);
	const today = params.currentDate ? parseDateToMidnight(params.currentDate) : parseDateToMidnight(new Date());

	const visitDateRaw = params.fittingDate || params.scheduledVisitDate;
	const visitDate = visitDateRaw ? parseDateToMidnight(visitDateRaw) : null;
	const visitIso = visitDate ? formatDateToIsoDay(visitDate) : undefined;
	const visitRu = visitIso ? formatRussianDate(visitIso) : "не назначен";
	const fittingIso = params.fittingDate ? formatDateToIsoDay(parseDateToMidnight(params.fittingDate)) : visitIso;
	const appointmentId = params.appointmentId || undefined;

	if (params.isInstalledOrCompleted) {
		return {
			hasAlert: false, isDelayedAlert: false, lab_delay_alert: false, status: "ON_TRACK", severity: "OK",
			daysDifference: 0, expectedLabDateIso: expectedIso, scheduledVisitDateIso: visitIso, fittingDateIso: fittingIso,
			appointmentId, alertMessageRu: "Работа успешно зафиксирована в полости рта.", detailedReasonRu: "Заказ завершен.",
			recommendedActionRu: "Действий не требуется.",
		};
	}

	const daysToLab = Math.round((expectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

	if (visitDate && expectedDate.getTime() > visitDate.getTime()) {
		const conflictDays = Math.round((expectedDate.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
		return {
			hasAlert: true, isDelayedAlert: true, lab_delay_alert: true, status: "VISIT_CONFLICT", severity: "CRITICAL",
			daysDifference: daysToLab, expectedLabDateIso: expectedIso, scheduledVisitDateIso: visitIso, fittingDateIso: fittingIso,
			appointmentId, alertMessageRu: `КРИТИЧЕСКИЙ КОНФЛИКТ: Готовность ЗТЛ (${expectedRu}) позже приема пациента (${visitRu}) на ${conflictDays} дн.!`,
			detailedReasonRu: `Пациент записан на прием ${visitRu}, а готовность только ${expectedRu}.`,
			recommendedActionRu: `Срочно свяжитесь с администратором для переноса визита на дату не ранее ${expectedRu}.`,
		};
	}

	if (daysToLab < 0) {
		const overdueDays = Math.abs(daysToLab);
		return {
			hasAlert: true, isDelayedAlert: true, lab_delay_alert: true, status: "OVERDUE", severity: "CRITICAL",
			daysDifference: daysToLab, expectedLabDateIso: expectedIso, scheduledVisitDateIso: visitIso, fittingDateIso: fittingIso,
			appointmentId, alertMessageRu: `ПРОСРОЧЕНО ЗТЛ: Заказ задерживается на ${overdueDays} дн. (план был: ${expectedRu})!`,
			detailedReasonRu: `Лаборатория не доставила конструкцию к нормативному сроку ${expectedRu}.`,
			recommendedActionRu: "Свяжитесь с курьерской службой или лабораторией для выяснения времени доставки.",
		};
	}

	if (daysToLab === 0) {
		return {
			hasAlert: true, isDelayedAlert: false, lab_delay_alert: false, status: "URGENT_TODAY", severity: "WARNING",
			daysDifference: 0, expectedLabDateIso: expectedIso, scheduledVisitDateIso: visitIso, fittingDateIso: fittingIso,
			appointmentId, alertMessageRu: `Сдача работы из ЗТЛ сегодня (${expectedRu})! Ожидается доставка курьером.`,
			detailedReasonRu: "Заказ должен поступить в клинику сегодня. Проверьте приемку.",
			recommendedActionRu: "Проконтролируйте приемку коробки с нарядом у администратора.",
		};
	}

	const isApproaching = daysToLab <= 2;
	return {
		hasAlert: false, isDelayedAlert: false, lab_delay_alert: false,
		status: isApproaching ? "APPROACHING" : "ON_TRACK", severity: isApproaching ? "INFO" : "OK",
		daysDifference: daysToLab, expectedLabDateIso: expectedIso, scheduledVisitDateIso: visitIso, fittingDateIso: fittingIso,
		appointmentId, alertMessageRu: isApproaching ? `Срок сдачи ЗТЛ через ${daysToLab} дн. (${expectedRu}).` : `В графике. Срок готовности через ${daysToLab} дн. (${expectedRu}).`,
		detailedReasonRu: "Производственный цикл ЗТЛ протекает штатно.", recommendedActionRu: "Действий не требуется.",
	};
}
