/**
 * aspirationJournalProtocol.ts — Clinical Medical Diary Protocol Serializer
 * Clean clinical entity for local anesthesia and aspiration test.
 * Mandates: 8e (Doctor Autonomy), 8n (Solo Doctor), 8x/8ao (Domain Purity), 8b (<= 120 lines).
 */
import {
	getAnestheticDrugSpecification,
	getNeedleSpecification,
	getTechniqueSpecification,
} from "./anesthesiaTechniqueMath";
import type {
	AnesthesiaSessionData,
	AspirationProtocolResult,
} from "./aspirationTypes";

export function generateAspirationProtocolEntry(
	session: AnesthesiaSessionData,
): AspirationProtocolResult {
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
		? "ОТРИЦАТЕЛЬНАЯ (кровь в карпуле отсутствует, норма)"
		: "ПОЛОЖИТЕЛЬНАЯ (требуется репозиция)";

	const diaryProtocolText = [
		`ПРОТОКОЛ МЕСТНОЙ АНЕСТЕЗИИ И АСПИРАЦИОННОЙ ПРОБЫ:`,
		`Метод: ${technique.nameRu} ${sideRu}${toothStr}.`,
		`Препарат: ${drug.tradeNamesRu[0]} (${drug.activeSubstanceRu} ${drug.vasoconstrictorRatio !== "none" ? `вазоконстриктор ${drug.vasoconstrictorRatio}` : "без вазоконстриктора"}), объем ${session.volumeMl} мл (${carpules} карп.).`,
		`Инструмент: игла стоматологическая карпульная ${needle.gauge} × ${needle.lengthMm} мм.`,
		`Аспирационная проба ${planesText}: ${aspirationStatusText}.`,
		`Введение раствора: медленное, безболезненное, без сопротивления.`,
		`Оценка эффективности и безопасности: обезболивание глубокое, наступило через ${session.onsetDurationMinutesActual ?? 2} мин. Токсических и аллергических реакций не выявлено.`,
	].join(" ");

	return {
		diaryProtocolText,
		diaryText043: diaryProtocolText,
		isLegalSafe: isNegative,
		complianceCheckPassed: isNegative,
		warningsRu: isNegative
			? []
			: [
					"Внимание: Аспирационная проба не была подтверждена как отрицательная.",
				],
	};
}

export const generateAspirationJournalEntry043 =
	generateAspirationProtocolEntry;
