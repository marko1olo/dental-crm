import type { ClinicalVisitStatus } from "./clinicalWorkflowTypes";

export function buildWorkflowStatusAndBanner(
	completionMode: string | undefined,
	totalNet: number,
	interruptionReason?: string,
	rescheduledDateIso?: string,
): { status: ClinicalVisitStatus; statusBannerText: string } {
	if (completionMode === "aborted") {
		return {
			status: "aborted",
			statusBannerText: `Приём прерван: ${interruptionReason || "По клиническим показаниям"} • Протокол зафиксирован (без обязательных полей)`,
		};
	}
	if (completionMode === "rescheduled") {
		const dateStr = rescheduledDateIso ? new Date(rescheduledDateIso).toLocaleDateString("ru-RU") : "согласованную дату";
		return {
			status: "rescheduled",
			statusBannerText: `Приём перенесен на ${dateStr}: ${interruptionReason || "По согласованию"} • Черновик сохранён`,
		};
	}
	if (completionMode === "emergency_interrupted") {
		return {
			status: "emergency_interrupted",
			statusBannerText: `Экстренное завершение: ${interruptionReason || "Неотложное состояние"} • Данные ЭМК зафиксированы`,
		};
	}
	if (totalNet === 0) {
		return {
			status: "completed",
			statusBannerText: "Гарантийный прием / 100% скидка • Оплачено (скидка 100%)",
		};
	}
	return {
		status: "ready_for_payment",
		statusBannerText: `Смета сформирована: ${totalNet.toLocaleString("ru-RU")} ₽ • Чек передан на кассу / готов к оплате`,
	};
}
