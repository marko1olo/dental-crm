import { DENTAL_LAB_STATUSES } from "../dentalLabDefinitions";
import { parseDateOnly, toIsoDate, formatRuDate } from "./labDateUtils";
import type { CheckLabOrderAlertParams, LabDeadlineAlertResult } from "./labDeadlineAlertTypes";

export * from "./labDeadlineAlertTypes";

export function detectLabDeadlineAlert(params: CheckLabOrderAlertParams): LabDeadlineAlertResult {
	const today = params.todayDate ? parseDateOnly(params.todayDate) : parseDateOnly(new Date());
	const todayIso = toIsoDate(today);

	if (params.status === "delayed") {
		return {
			hasAlert: true, isDelayedAlert: true, severity: "CRITICAL_TODAY",
			badgeTextRu: "Задерживается ЗТЛ", badgeLabelRu: "Задерживается ЗТЛ",
			messageRu: "Лаборатория задерживает изготовление работы. Требуется перенос приема пациента.",
			warningRu: "Лаборатория задерживает изготовление работы. Требуется перенос приема пациента.",
			actionRu: "Перенести прием пациента в расписании.", actionPromptRu: "Перенести прием пациента в расписании.",
			daysUntilDeadline: -1,
		};
	}

	if (params.status === "ready_in_clinic") {
		return {
			hasAlert: false, isDelayedAlert: false, severity: "OK", badgeTextRu: "В клинике (Готов)", badgeLabelRu: "В клинике (Готов)",
			messageRu: "Работа доставлена в клинику и готова к примерке или фиксации.", actionRu: "Пригласить пациента на прием.", daysUntilDeadline: 0,
		};
	}

	if (params.status === "try_in") {
		return {
			hasAlert: false, isDelayedAlert: false, severity: "OK", badgeTextRu: "Примерка", badgeLabelRu: "Примерка",
			messageRu: "Конструкция на этапе клинической примерки в полости рта.", actionRu: "Зафиксировать результат примерки.", daysUntilDeadline: 0,
		};
	}

	if (params.status === "delivered_to_patient") {
		return {
			hasAlert: false, isDelayedAlert: false, severity: "OK", badgeTextRu: "Сдан пациенту", badgeLabelRu: "Сдан пациенту",
			messageRu: "Работа успешно установлена и сдана пациенту.", actionRu: "Наряд закрыт.", daysUntilDeadline: 0,
		};
	}

	if (params.status === "warranty_rework") {
		return {
			hasAlert: true, isDelayedAlert: true, severity: "INFO", badgeTextRu: "Переделка (гарантия)", badgeLabelRu: "Переделка (гарантия)",
			messageRu: "Наряд находится на гарантийной переделке / доработке.", actionRu: "Ожидайте повторной доставки из ЗТЛ.", daysUntilDeadline: 0,
		};
	}

	const rawDeadline = params.deadlineDate || params.dueDate;
	if (!rawDeadline) {
		return {
			hasAlert: false, isDelayedAlert: false, severity: "OK", badgeTextRu: "Срок не задан", badgeLabelRu: "Срок не задан",
			messageRu: "", warningRu: "", actionRu: "", actionPromptRu: "", daysUntilDeadline: 0,
		};
	}

	const visitDate = params.scheduledVisitDate ? parseDateOnly(params.scheduledVisitDate) : null;
	const visitIso = visitDate ? toIsoDate(visitDate) : null;
	const deadline = parseDateOnly(rawDeadline);
	const deadlineIso = toIsoDate(deadline);
	const diffMs = deadline.getTime() - today.getTime();
	const daysUntilDeadline = Math.round(diffMs / (1000 * 60 * 60 * 24));

	if (visitDate && visitDate.getTime() < deadline.getTime()) {
		const collisionDays = Math.round((deadline.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
		return {
			hasAlert: true, isDelayedAlert: true, severity: "CRITICAL_TODAY",
			badgeTextRu: "Прием раньше готовности ЗТЛ!", badgeLabelRu: "Прием раньше готовности ЗТЛ!",
			messageRu: `Внимание: прием на примерку назначен раньше готовности лаборатории! (дефицит: ${collisionDays} дн.)`,
			warningRu: `Внимание: прием на примерку назначен раньше готовности лаборатории! (дефицит: ${collisionDays} дн.)`,
			actionRu: `Перенести прием на дату не ранее расчетной готовности лаборатории (${formatRuDate(deadlineIso)}, разница ${collisionDays} дн.).`,
			actionPromptRu: `Перенести прием на дату не ранее расчетной готовности лаборатории (${formatRuDate(deadlineIso)}, разница ${collisionDays} дн.).`,
			daysUntilDeadline,
		};
	}

	if (visitIso && visitIso <= todayIso) {
		const toothLabel = params.toothNotation ? ` (зуб ${params.toothNotation})` : "";
		return {
			hasAlert: true, isDelayedAlert: true, severity: "CRITICAL_TODAY",
			badgeTextRu: "Работа еще не поступила в клинику!", badgeLabelRu: "Работа еще не поступила в клинику!",
			messageRu: `Работа из ЗТЛ еще не поступила в клинику! У пациента ${params.patientName || ""}${toothLabel} назначен прием на ${formatRuDate(visitIso)}, а статус в ЗТЛ еще «${DENTAL_LAB_STATUSES[params.status].labelRu}».`,
			actionRu: "Срочно связаться с лабораторией/курьером или предупредить врача и регистратора!",
			daysUntilDeadline,
		};
	}

	if (daysUntilDeadline < 0) {
		const overdueDays = Math.abs(daysUntilDeadline);
		return {
			hasAlert: true, isDelayedAlert: true, severity: "OVERDUE",
			badgeTextRu: `Просрочено ЗТЛ на ${overdueDays} дн.`, badgeLabelRu: `Просрочено ЗТЛ на ${overdueDays} дн.`,
			messageRu: `Лаборатория не сдала работу к плановому сроку ${formatRuDate(deadlineIso)} (задержка ${overdueDays} дн.).`,
			warningRu: `Лаборатория не сдала работу к плановому сроку ${formatRuDate(deadlineIso)} (задержка ${overdueDays} дн.).`,
			actionRu: "Перенести прием пациента и запросить у техника статус изготовления.",
			actionPromptRu: "Перенести прием пациента и запросить у техника статус изготовления.",
			daysUntilDeadline,
		};
	}

	if (daysUntilDeadline === 0) {
		return {
			hasAlert: true, isDelayedAlert: false, severity: "URGENT_TODAY",
			badgeTextRu: "Сдача из ЗТЛ сегодня",
			messageRu: `Плановая дата сдачи из лаборатории — сегодня (${formatRuDate(deadlineIso)}). Ожидается доставка курьером.`,
			actionRu: "Принять работу у курьера и зарегистрировать поступление.",
			daysUntilDeadline: 0,
		};
	}

	return {
		hasAlert: false, isDelayedAlert: false, severity: "OK",
		badgeTextRu: `В графике (${daysUntilDeadline} дн.)`,
		messageRu: `Работа изготавливается в плановом режиме. Срок сдачи: ${formatRuDate(deadlineIso)}.`,
		actionRu: "Действий не требуется.",
		daysUntilDeadline,
	};
}
