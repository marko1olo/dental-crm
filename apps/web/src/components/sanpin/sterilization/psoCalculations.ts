export function calculatePsoSampleRequirements(
	batchCount: number,
	isSurgicalOrCritical = false,
	itemTypesCount = 1,
): {
	readonly minSampleCount: number;
	readonly statutoryPercent: number;
	readonly formulaExplanationRu: string;
} {
	const count = Math.max(1, Math.floor(Number(batchCount) || 1));
	const typesCount = Math.max(1, Math.floor(Number(itemTypesCount) || 1));
	const statutoryPercent = 1;
	const computedOnePercent = Math.ceil((count * statutoryPercent) / 100);
	const baselineFloor = isSurgicalOrCritical ? 5 : 3;
	const minSampleCount = Math.max(baselineFloor * typesCount, computedOnePercent);

	const formulaExplanationRu =
		typesCount > 1
			? `Минимальный порог СанПиН: ${baselineFloor} шт. × ${typesCount} наим. = ${minSampleCount} шт. (не менее 1% от ${count} шт.)`
			: count <= (isSurgicalOrCritical ? 500 : 300)
				? `Минимальный порог СанПиН: ${baselineFloor} шт. (для партии из ${count} шт.)`
				: `1% от партии: ${computedOnePercent} шт. (округление вверх)`;

	return {
		minSampleCount,
		statutoryPercent,
		formulaExplanationRu,
	};
}

export function evaluatePsoTrial(params: {
	batchCount: number;
	testedSampleCount: number;
	isAzopyramNegative: boolean;
	isPhenolphthaleinNegative: boolean;
	isSudanNegative?: boolean;
	isSurgicalOrCritical?: boolean;
	itemTypesCount?: number;
}): {
	readonly isBatchApproved: boolean;
	readonly isBatchBlocked: boolean;
	readonly minSampleRequired: number;
	readonly isSamplingSufficient: boolean;
	readonly rejectionReason: string | null;
	readonly clinicalAdviceRu: string;
} {
	const { batchCount, testedSampleCount, isAzopyramNegative, isPhenolphthaleinNegative } = params;
	const isSudanNegative = params.isSudanNegative ?? true;
	const { minSampleCount } = calculatePsoSampleRequirements(batchCount, params.isSurgicalOrCritical, params.itemTypesCount);
	const isSamplingSufficient = testedSampleCount >= minSampleCount;

	if (!isSamplingSufficient) {
		return {
			isBatchApproved: false,
			isBatchBlocked: true,
			minSampleRequired: minSampleCount,
			isSamplingSufficient: false,
			rejectionReason: `Недостаточный объем выборки ПСО: проверено ${testedSampleCount} шт. из необходимых ${minSampleCount} шт. (СанПиН 3.3686-21: не менее 1% партии, мин. ${minSampleCount} шт.).`,
			clinicalAdviceRu: `Необходимо отобрать еще минимум ${minSampleCount - testedSampleCount} шт. инструментов и повторить контрольные пробы.`,
		};
	}

	if (!isAzopyramNegative) {
		return {
			isBatchApproved: false,
			isBatchBlocked: true,
			minSampleRequired: minSampleCount,
			isSamplingSufficient: true,
			rejectionReason:
				"Положительная азопирамовая проба (обнаружен гемоглобин / скрытая кровь — фиолетово-синее окрашивание). Немедленная блокировка партии на повторную промывку и нейтрализацию.",
			clinicalAdviceRu:
				"Немедленная блокировка партии! Вся партия инструментов подлежит повторной дезинфекции, предстерилизационной очистке и контролю качества.",
		};
	}

	if (!isPhenolphthaleinNegative) {
		return {
			isBatchApproved: false,
			isBatchBlocked: true,
			minSampleRequired: minSampleCount,
			isSamplingSufficient: true,
			rejectionReason:
				"Положительная фенолфталеиновая проба (обнаружены остатки щелочных компонентов моющих средств — розово-малиновое окрашивание). Немедленная блокировка партии на повторную промывку и нейтрализацию.",
			clinicalAdviceRu:
				"Немедленная блокировка партии! Вся партия инструментов подлежит повторному тщательному ополаскиванию проточной и дистиллированной водой до нейтральной реакции.",
		};
	}

	if (!isSudanNegative) {
		return {
			isBatchApproved: false,
			isBatchBlocked: true,
			minSampleRequired: minSampleCount,
			isSamplingSufficient: true,
			rejectionReason:
				"Положительная проба с суданом III (обнаружены остатки масляных и жировых загрязнений наконечников). Немедленная блокировка партии на повторную промывку и нейтрализацию.",
			clinicalAdviceRu:
				"Немедленная блокировка партии! Наконечники подлежат обезжириванию в ультразвуковой ванне с детергентом и повторному контролю.",
		};
	}

	return {
		isBatchApproved: true,
		isBatchBlocked: false,
		minSampleRequired: minSampleCount,
		isSamplingSufficient: true,
		rejectionReason: null,
		clinicalAdviceRu:
			"Партия успешно прошла контроль предстерилизационной очистки и допущена к упаковке и стерилизации.",
	};
}
