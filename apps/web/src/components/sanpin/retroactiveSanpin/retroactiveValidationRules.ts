import type {
	RetroactiveComplianceAudit,
	RetroactiveDayRecord,
	RetroactiveValidationIssue,
	RetroactiveValidationResult,
} from "./types.js";

/**
 * Валидирует отдельную суточную запись на строгое соответствие СанПиН 3.3686-21 и СП 2.1.3678-20
 */
export function validateRetroactiveDaySanpin(
	record: RetroactiveDayRecord,
): RetroactiveValidationResult {
	const issues: RetroactiveValidationIssue[] = [];

	if (record.isWorkingDay) {
		const minExpectedSample = Math.max(3, Math.ceil(record.traysProcessedCount * 0.01));
		if (record.psoSampleCount < minExpectedSample) {
			issues.push({
				code: "PSO_SAMPLE_UNDERSIZED",
				messageRu: `Выборка предстерилизационной очистки (${record.psoSampleCount} шт.) ниже норматива 1% (${minExpectedSample} шт.)`,
				severity: "error",
				statutoryNorm: "СанПиН 3.3686-21 п. 3624 / МУ 287-113",
			});
		}

		if (!record.isAzopyramNegative) {
			issues.push({
				code: "AZOPYRAM_POSITIVE",
				messageRu: "Положительная азопирамовая проба — обнаружены следы скрытой крови!",
				severity: "error",
				statutoryNorm: "СанПиН 3.3686-21 п. 3626",
			});
		}
		if (!record.isPhenolphthaleinNegative) {
			issues.push({
				code: "PHENOLPHTHALEIN_POSITIVE",
				messageRu: "Положительная фенолфталеиновая проба — остаточная щелочность моющих средств!",
				severity: "error",
				statutoryNorm: "СанПиН 3.3686-21 п. 3627",
			});
		}

		if (!record.points5Passed) {
			issues.push({
				code: "AUTOCLAVE_POINTS_FAILED",
				messageRu: "Не сработали химические индикаторы в 5 точках стерилизационной камеры (КТ-1..5)",
				severity: "error",
				statutoryNorm: "ГОСТ ISO 11140-1 / СанПиН 3.3686-21",
			});
		}
	}

	if (
		record.refrigeratorTempMorning < 2.0 ||
		record.refrigeratorTempMorning > 8.0 ||
		record.refrigeratorTempEvening < 2.0 ||
		record.refrigeratorTempEvening > 8.0
	) {
		issues.push({
			code: "REFRIGERATOR_TEMP_DEVIATION",
			messageRu: `Температура фарм-холодильника (${record.refrigeratorTempMorning}°C / ${record.refrigeratorTempEvening}°C) вне диапазона +2..+8°C`,
			severity: "warning",
			statutoryNorm: "Приказ Минздравсоцразвития № 706н",
		});
	}

	if (record.roomTempMorning < 18.0 || record.roomTempMorning > 25.0) {
		issues.push({
			code: "ROOM_TEMP_DEVIATION",
			messageRu: `Температура в кабинетах (${record.roomTempMorning}°C) отклоняется от нормы 18..25°C`,
			severity: "warning",
			statutoryNorm: "СП 2.1.3678-20",
		});
	}

	return {
		recordId: record.id,
		date: record.date,
		isCompliant: issues.length === 0,
		issues,
	};
}

/**
 * Комплексный аудит всей ретроспективной партии журналов
 */
export function validateRetroactiveBatchSanpin(
	days: readonly RetroactiveDayRecord[],
): RetroactiveComplianceAudit {
	const results = days.map((d) => validateRetroactiveDaySanpin(d));
	const compliantCount = results.filter((r) => r.isCompliant).length;
	const totalIssues = results.reduce((acc, r) => acc + r.issues.length, 0);

	return {
		totalDaysAudited: days.length,
		compliantDaysCount: compliantCount,
		complianceRatePercent: days.length > 0 ? Math.round((compliantCount / days.length) * 100) : 100,
		totalIssuesFound: totalIssues,
		results,
	};
}
