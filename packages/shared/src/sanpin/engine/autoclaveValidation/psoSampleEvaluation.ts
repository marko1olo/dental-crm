/**
 * packages/shared/src/sanpin/engine/autoclaveValidation/psoSampleEvaluation.ts
 * Выборочный контроль предстерилизационной очистки (азопирам, фенолфталеин, Судан III).
 * Мандат 8b: строго <= 120 строк.
 */

import { generateDeterministicOrSecureInteger } from "../../../utils/idGenerators.js";

export function calculatePsoSampleRequirements(
	batchCount: number,
	isCriticalSurgical = false,
): {
	readonly minSampleCount: number;
	readonly formulaDescriptionRu: string;
	readonly ruleRefRu: string;
} {
	const count = Math.max(1, Math.floor(Number(batchCount) || 1));
	const absoluteMin = isCriticalSurgical ? 5 : 3;
	const onePercent = Math.ceil(count * 0.01);
	const minSampleCount = Math.max(absoluteMin, onePercent);

	return {
		minSampleCount,
		formulaDescriptionRu: `max(${absoluteMin}, ceil(${count} × 1%)) = ${minSampleCount} шт.`,
		ruleRefRu: "СанПиН 3.3686-21 п. 3584: 1% от партии изделий, не менее 3–5 единиц каждого наименования",
	};
}

export function evaluatePsoTrialResult(params: {
	batchCount: number;
	testedSampleCount: number;
	isAzopyramNegative: boolean;
	isPhenolphthaleinNegative: boolean;
	isSudanNegative?: boolean | undefined;
	isCriticalSurgical?: boolean | undefined;
}): {
	readonly isBatchApproved: boolean;
	readonly minSampleRequired: number;
	readonly samplingSatisfied: boolean;
	readonly rejectionReason: string | null;
	readonly complianceNoteRu: string;
} {
	const { minSampleCount } = calculatePsoSampleRequirements(params.batchCount, params.isCriticalSurgical);
	const samplingSatisfied = params.testedSampleCount >= minSampleCount;

	if (!samplingSatisfied) {
		return {
			isBatchApproved: false,
			minSampleRequired: minSampleCount,
			samplingSatisfied: false,
			rejectionReason: `Недостаточный объем выборки предстерилизационной очистки: проверено ${params.testedSampleCount} шт. из минимум ${minSampleCount} шт. (норма 1%).`,
			complianceNoteRu: "Отказ: нарушение минимального объема выборочного контроля",
		};
	}

	if (!params.isAzopyramNegative) {
		return {
			isBatchApproved: false,
			minSampleRequired: minSampleCount,
			samplingSatisfied: true,
			rejectionReason:
				"БРАК: Положительная азопирамовая проба (обнаружена скрытая кровь / гемоглобин). Вся партия подлежит повторной дезинфекции и предстерилизационной очистке!",
			complianceNoteRu: "Брак очистки: обнаружены следы крови (положительный азопирам)",
		};
	}

	if (!params.isPhenolphthaleinNegative) {
		return {
			isBatchApproved: false,
			minSampleRequired: minSampleCount,
			samplingSatisfied: true,
			rejectionReason:
				"БРАК: Положительная фенолфталеиновая проба (остатки щелочных компонентов моющих средств). Вся партия подлежит повторному ополаскиванию дистиллированной водой!",
			complianceNoteRu: "Брак очистки: обнаружены остатки моющего средства (положительный фенолфталеин)",
		};
	}

	if (params.isSudanNegative === false) {
		return {
			isBatchApproved: false,
			minSampleRequired: minSampleCount,
			samplingSatisfied: true,
			rejectionReason:
				"БРАК: Положительная проба с Суданом III (масляные/жировые загрязнения). Партия направляется на повторное обезжиривание!",
			complianceNoteRu: "Брак очистки: обнаружены масляные загрязнения (положительный Судан III)",
		};
	}

	return {
		isBatchApproved: true,
		minSampleRequired: minSampleCount,
		samplingSatisfied: true,
		rejectionReason: null,
		complianceNoteRu: "Партия предстерилизационной очистки соответствует нормам и допущена к автоклавированию",
	};
}

export function generatePsoRecordId(
	dateStr: string = new Date().toISOString().slice(0, 10),
	seq?: number,
): string {
	const effectiveSeq = seq ?? generateDeterministicOrSecureInteger(100, 999, dateStr);
	const cleanDate = dateStr.replace(/[^0-9]/g, "").slice(0, 8);
	return `PSO-${cleanDate}-${effectiveSeq.toString().padStart(4, "0")}`;
}
