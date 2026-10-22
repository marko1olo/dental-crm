import type { MissingSterilizationDaysAuditResult } from "./types.js";

/**
 * Аудит непрерывности журнала стерилизации:
 * Выявляет рабочие дни, в которые велся клинический прием пациентов,
 * но отсутствует хотя бы один зарегистрированный цикл стерилизации (автоклавирования).
 */
export function detectMissingSterilizationDays(
	records: readonly { date: string }[],
	visitsOrActiveDates: readonly ({ date: string; hasVisits?: boolean } | string)[],
): MissingSterilizationDaysAuditResult {
	const sterilizationDates = new Set(records.map((r) => r.date.slice(0, 10)));
	const missingSet = new Set<string>();

	for (const item of visitsOrActiveDates) {
		const dateStr = typeof item === "string" ? item.slice(0, 10) : item.date.slice(0, 10);
		const hasActivity = typeof item === "string" ? true : (item.hasVisits ?? true);
		if (hasActivity && !sterilizationDates.has(dateStr)) {
			missingSet.add(dateStr);
		}
	}

	const missingDates = Array.from(missingSet).sort();
	const isMissingAutoclaveLog = missingDates.length > 0;

	return {
		auditedDatesCount: visitsOrActiveDates.length,
		missingDatesCount: missingDates.length,
		missingDates,
		isMissingAutoclaveLog,
		warningMessageRu: isMissingAutoclaveLog
			? "Внимание: за смену были приемы пациентов, но цикл автоклавирования не зарегистрирован"
			: undefined,
		recommendationRu: isMissingAutoclaveLog
			? `Пропущены записи стерилизации за даты: ${missingDates.join(", ")}. Выполните пакетное формирование записей стерилизации за пропущенные смены для соблюдения требований СанПиН 3.3686-21.`
			: undefined,
	};
}
