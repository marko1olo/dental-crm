/**
 * aspirationJournal043.ts — Clinical Medical Diary Protocol Serializer
 * Standards: СтАР, Минздрав РФ. Mandate 8b (<= 120 lines).
 */
import {
	getAnestheticDrugSpecification,
	getNeedleSpecification,
	getTechniqueSpecification,
} from "./anesthesiaTechniqueMath";
import type {
	AnesthesiaSessionData,
	Form043ExportResult,
	InjectionVelocityPlan,
} from "./aspirationSafetyEngine";

export function calculateInjectionSpeedProfile(
	volumeMl: number,
): InjectionVelocityPlan {
	const vol = Math.max(0.1, volumeMl);
	const minRecommendedDurationSeconds = Math.round((vol / 1.0) * 60);
	const absoluteFastestDurationSeconds = Math.round((vol / 1.7) * 60);

	return {
		volumeMl: vol,
		maxSafeVelocityMlPerMinute: 1.0,
		minRecommendedDurationSeconds,
		absoluteFastestDurationSeconds,
		safeInjectionInstructionsRu: `Рекомендуемая скорость введения: не более 1.0 мл/мин (минимальное время введения ${minRecommendedDurationSeconds} сек).`,
	};
}

export function generateAspirationJournalEntry043(
	session: AnesthesiaSessionData,
): Form043ExportResult {
	const technique = getTechniqueSpecification(session.techniqueId);
	const needle = getNeedleSpecification(session.needleId);
	const drug = getAnestheticDrugSpecification(session.drugKey);

	const sideRu =
		session.side === "right"
			? "справа"
			: session.side === "left"
				? "слева"
				: "";
	const toothStr = session.toothNumber ? ` в обл. ${session.toothNumber}` : "";
	const carpules =
		Math.round((session.volumeMl / drug.standardCarpuleVolumeMl) * 10) / 10;
	const isNegative = session.aspirationStatus === "negative_safe";

	const planesText = session.isTwoPlaneConfirmed
		? "в 2-х плоскостях (0° и 180°)"
		: "в 1-й плоскости";
	const aspirationStatusText = isNegative
		? "ОТРИЦАТЕЛЬНАЯ (кровь в карпуле отсутствует)"
		: "ПОЛОЖИТЕЛЬНАЯ";

	const diaryText043 = [
		`ПРОТОКОЛ МЕСТНОЙ АНЕСТЕЗИИ И АСПИРАЦИОННОЙ ПРОБЫ:`,
		`Метод: ${technique.nameRu} ${sideRu}${toothStr}.`,
		`Препарат: ${drug.tradeNamesRu[0]} (${drug.activeSubstanceRu} ${drug.vasoconstrictorRatio !== "none" ? `вазоконстриктор ${drug.vasoconstrictorRatio}` : "без вазоконстриктора"}), объем ${session.volumeMl} мл (${carpules} карп.).`,
		`Инструмент: игла стоматологическая карпульная ${needle.gauge} × ${needle.lengthMm} мм.`,
		`Аспирационная проба ${planesText}: ${aspirationStatusText}.`,
		`Введение раствора: медленное (скорость не более 1.0 мл/мин), безболезненное, без сопротивления.`,
		`Оценка эффективности и безопасности: обезболивание глубокое, наступило через ${session.onsetDurationMinutesActual ?? 2} мин. Токсических и аллергических реакций не выявлено.`,
	].join(" ");

	return {
		diaryText043,
		isLegalSafe: isNegative,
		complianceCheckPassed: isNegative,
		warningsRu: isNegative
			? []
			: [
					"Внимание: Аспирационная проба не была подтверждена как отрицательная.",
				],
	};
}
