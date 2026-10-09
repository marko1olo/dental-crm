/**
 * DENTE Dental CRM — Endodontic Case Evaluator Core (Layer 2)
 * @dental/shared/clinical/endo/endoCaseEvaluatorCore.ts
 *
 * Чистая доменная клиническая логика оценки качества пломбирования корневых каналов
 * по клиническим рекомендациям Стоматологической Ассоциации России (СтАР) и Форме 043/у:
 * - Рентгенологический контроль уровня обтурации (до верхушки / физиологического апекса):
 *     • Оптимально: 0.5–1.5 мм до рентгенологического апекса (физиологическое сужение).
 *     • Допустимо по СтАР: 0–2.0 мм до верхушки корня.
 *     • Брак (недопломбировка): > 2.0 мм до апекса (риск рецидива апикального периодонтита).
 *     • Брак (выведение за верхушку): > 0 мм за анатомический апекс (риск токсико-аллергической реакции периодонта).
 * - Оценка трехмерности и плотности обтурации (гомогенность, отсутствие пор).
 * - Формирование экспертного заключения качества эндодонтического лечения для зав. отделением (CMO).
 * - Ноль побочных эффектов, чистая математика и предикаты.
 */

import { getAnatomicalWorkingLength } from "./canalAnatomyRules.js";
import type {
	EndoCanalData,
	EndoCanalEvaluation,
	EndoCaseEvaluationResult,
	EndoObturationDensityStatus,
	EndoObturationLengthStatus,
} from "./types.js";

/** Опции для точечной оценки качества обтурации канала */
export interface EvaluateCanalOptions {
	readonly radiologyApexLengthMm?: number | undefined;
	readonly reportedDensity?: string | undefined;
}

/**
 * Оценка качества обтурации отдельного корневого канала по стандартам СтАР
 */
export function evaluateEndoCanalObturation(
	canal: EndoCanalData,
	toothNumber: number,
	options?: EvaluateCanalOptions,
): EndoCanalEvaluation {
	const rawLength = canal.workingLengthMm;
	const parsedLength =
		typeof rawLength === "number"
			? rawLength
			: Number.parseFloat(String(rawLength || "").replace(",", "."));

	const anatomicalLength =
		options?.radiologyApexLengthMm ??
		getAnatomicalWorkingLength(toothNumber, canal.canalName);

	if (Number.isNaN(parsedLength) || parsedLength <= 0) {
		return {
			canalId: canal.id,
			canalName: canal.canalName,
			workingLengthMm: null,
			anatomicalLengthMm: anatomicalLength,
			lengthDifferenceMm: null,
			lengthStatus: "unmeasured",
			densityStatus: "unspecified",
			isCompliantStar: false,
			clinicalNoteRu: "Рабочая длина канала не измерена или равна 0 мм",
		};
	}

	// Разница: анатомическая/рентгенологическая длина минус фактическая длина пломбирования
	// Положительная разница означает недоход до верхушки (в мм)
	// Отрицательная разница означает выведение за пределы верхушки корня
	const lengthDiff = Number((anatomicalLength - parsedLength).toFixed(2));

	let lengthStatus: EndoObturationLengthStatus = "adequate";
	let lengthNote = "";

	if (lengthDiff < -0.5) {
		lengthStatus = "overfilled";
		lengthNote = `Выведение пломбировочного материала за апекс на ${Math.abs(lengthDiff)} мм`;
	} else if (lengthDiff >= -0.5 && lengthDiff <= 1.5) {
		lengthStatus = "optimal";
		lengthNote = `Оптимально: обтурация до физиологического сужения (${lengthDiff >= 0 ? `${lengthDiff} мм до верхушки` : "точно до апекса"})`;
	} else if (lengthDiff > 1.5 && lengthDiff <= 2.0) {
		lengthStatus = "adequate";
		lengthNote = `Допустимо по СтАР: недоход до верхушки ${lengthDiff} мм (в пределах нормы 0–2 мм)`;
	} else {
		lengthStatus = "underfilled";
		lengthNote = `Недопломбировка: недоход до рентгенологического апекса ${lengthDiff} мм (> 2 мм)`;
	}

	// Оценка плотности и методики
	let densityStatus: EndoObturationDensityStatus = "dense_homogeneous";
	const techStr = (canal.obturationTechnique || "").toLowerCase();
	const sealerStr = (canal.sealer || "").toLowerCase();
	const notesStr = (canal.notes || "").toLowerCase();
	const repDensity = (options?.reportedDensity || "").toLowerCase();

	if (
		techStr.includes("ca(oh)2") ||
		techStr.includes("каласепт") ||
		techStr.includes("metapex") ||
		techStr.includes("calcept") ||
		sealerStr.includes("каласепт") ||
		sealerStr.includes("calcept") ||
		sealerStr.includes("metapex")
	) {
		densityStatus = "temporary_calcium";
	} else if (
		repDensity.includes("пор") ||
		repDensity.includes("пустот") ||
		repDensity.includes("неоднородн") ||
		notesStr.includes("неплотн") ||
		notesStr.includes("пустот")
	) {
		densityStatus = "inhomogeneous_voids";
	} else if (!canal.obturationTechnique) {
		densityStatus = "unspecified";
	} else {
		densityStatus = "dense_homogeneous";
	}

	const isCompliantStar =
		(lengthStatus === "optimal" || lengthStatus === "adequate") &&
		(densityStatus === "dense_homogeneous" || densityStatus === "temporary_calcium");

	const clinicalNoteRu = `${lengthNote}. Плотность: ${
		densityStatus === "dense_homogeneous"
			? "гомогенно, без пор"
			: densityStatus === "temporary_calcium"
				? "лечебная паста Ca(OH)2"
				: densityStatus === "inhomogeneous_voids"
					? "обнаружены дефекты/поры"
					: "не указана"
	}.`;

	return {
		canalId: canal.id,
		canalName: canal.canalName,
		workingLengthMm: parsedLength,
		anatomicalLengthMm: anatomicalLength,
		lengthDifferenceMm: lengthDiff,
		lengthStatus,
		densityStatus,
		isCompliantStar,
		clinicalNoteRu,
	};
}

/**
 * Комплексная клиническая оценка эндодонтического случая по всем каналам зуба
 */
export function evaluateEndoCase(params: {
	toothNumber: number;
	canals: readonly EndoCanalData[];
	radiologyConfirmedApex?: boolean | undefined;
	densityReported?: string | undefined;
}): EndoCaseEvaluationResult {
	const { toothNumber, canals } = params;

	if (canals.length === 0) {
		return {
			toothNumber,
			totalCanals: 0,
			evaluatedCanals: [],
			isFullyCompliantStar: false,
			hasOverfill: false,
			hasUnderfill: false,
			summaryRu: "Корневые каналы не внесены в протокол",
			clinicalRecommendationsRu: [
				"Необходимо зарегистрировать корневые каналы зуба и зафиксировать рабочую длину",
			],
		};
	}

	const evaluatedCanals = canals.map((c) =>
		evaluateEndoCanalObturation(c, toothNumber, {
			reportedDensity: params.densityReported,
		}),
	);

	const hasOverfill = evaluatedCanals.some((c) => c.lengthStatus === "overfilled");
	const hasUnderfill = evaluatedCanals.some((c) => c.lengthStatus === "underfilled");
	const hasUnmeasured = evaluatedCanals.some((c) => c.lengthStatus === "unmeasured");
	const hasVoids = evaluatedCanals.some((c) => c.densityStatus === "inhomogeneous_voids");

	const isFullyCompliantStar =
		evaluatedCanals.length > 0 && evaluatedCanals.every((c) => c.isCompliantStar);

	const recommendations: string[] = [];
	let summaryRu = "";

	if (isFullyCompliantStar) {
		summaryRu = `Все каналы (${canals.length}) обтурированы качественно в соответствии с клиническими рекомендациями СтАР.`;
		recommendations.push(
			"Контрольная радиовизиография через 6 и 12 месяцев для оценки периапикальных тканей",
		);
		recommendations.push("Рекомендовано постоянное восстановление коронковой части зуба");
	} else {
		summaryRu = "Выявлены отклонения от стандартов качества эндодонтического лечения СтАР:";
		if (hasOverfill) {
			recommendations.push(
				"Внимание: выведение пломбировочного материала за апекс. Контроль болевого синдрома, при необходимости — противовоспалительная терапия.",
			);
		}
		if (hasUnderfill) {
			recommendations.push(
				"Внимание: недопломбировка канала более чем на 2 мм. Высокий риск персистенции внутриканальной биопленки. Рекомендовано повторное прохождение до физиологического апекса.",
			);
		}
		if (hasVoids) {
			recommendations.push(
				"Неоднородность обтурации / наличие пор: рекомендована вертикальная компакция или распломбирование и повторная трехмерная герметизация.",
			);
		}
		if (hasUnmeasured) {
			recommendations.push(
				"Зафиксируйте показатели апекслокатора и рабочую длину для всех каналов зуба в Форме 043/у.",
			);
		}
	}

	return {
		toothNumber,
		totalCanals: canals.length,
		evaluatedCanals,
		isFullyCompliantStar,
		hasOverfill,
		hasUnderfill,
		summaryRu,
		clinicalRecommendationsRu: recommendations,
	};
}

/**
 * Быстрый предикат: соответствуют ли все каналы зуба критериям качества СтАР?
 */
export function isEndoObturationStarCompliant(params: {
	toothNumber: number;
	canals: readonly EndoCanalData[];
}): boolean {
	const evaluation = evaluateEndoCase(params);
	return evaluation.isFullyCompliantStar;
}
