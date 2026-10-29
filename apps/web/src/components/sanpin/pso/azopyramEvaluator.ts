import type { PsoEvaluationInput, PsoEvaluationResult } from "./azopyramTypes";
import { calculateStatutorySampling, checkAzopyramSolutionFreshness } from "./azopyramCalculations";

export function evaluatePsoCleaningBatch(input: PsoEvaluationInput): PsoEvaluationResult {
	const {
		batchItemCount,
		testedSampleCount,
		isSurgicalOrCritical = false,
		itemsTypesCount = 1,
		isAzopyramNegative,
		isPhenolphthaleinNegative,
		isSudanNegative = true,
		azopyramSolutionPreparedAt,
	} = input;

	const reasons: string[] = [];
	const { minSampleRequired } = calculateStatutorySampling(batchItemCount, isSurgicalOrCritical, itemsTypesCount);
	const isSamplingSufficient = testedSampleCount >= minSampleRequired;

	if (!isSamplingSufficient) {
		reasons.push(
			`Недостаточный объем выборки: проверено ${testedSampleCount} шт. из регламентных ${minSampleRequired} шт. (СанПиН 3.3686-21: не менее 1% партии и не менее ${isSurgicalOrCritical ? 5 : 3} шт. каждого наименования).`,
		);
	}

	const freshness = checkAzopyramSolutionFreshness(azopyramSolutionPreparedAt);

	if (!isAzopyramNegative) {
		reasons.push(
			"ПОЛОЖИТЕЛЬНАЯ АЗОПИРАМОВАЯ ПРОБА: обнаружен скрытый гемоглобин / кровь (сине-фиолетовое окрашивание реактива в течение 1 мин.).",
		);
	}

	if (!isPhenolphthaleinNegative) {
		reasons.push(
			"ПОЛОЖИТЕЛЬНАЯ ФЕНОЛФТАЛЕИНОВАЯ ПРОБА: обнаружены остатки щелочных компонентов моющих средств (розово-малиновое окрашивание).",
		);
	}

	if (!isSudanNegative) {
		reasons.push(
			"ПОЛОЖИТЕЛЬНАЯ ПРОБА С СУДАНОМ III: обнаружены остаточные жировые и масляные загрязнения наконечников / вращающихся инструментов (желто-розовые капли и окрашенные жировые пятна).",
		);
	}

	const isBatchApproved = reasons.length === 0;
	const isBatchBlocked = !isBatchApproved;

	let clinicalActionProtocolRu = "";
	if (isBatchApproved) {
		clinicalActionProtocolRu =
			"Партия инструментов полностью очищена, следы крови и моющих средств отсутствуют. Выборка достаточна. Партия допущена к упаковке в крафт-пакеты и стерилизации (СанПиН 3.3686-21).";
	} else if (!isAzopyramNegative) {
		clinicalActionProtocolRu =
			"СТРОГИЙ КЛИНИЧЕСКИЙ РЕГЛАМЕНТ (ПРИ ОБНАРУЖЕНИИ КРОВИ):\n" +
			"1. Вся партия изделий (100%), из которой отбирались образцы, признается НЕСТЕРИЛЬНОЙ И ОПАСНОЙ и подлежит немедленной изоляции.\n" +
			"2. Вся партия направляется на повторный полный цикл дезинфекции и предстерилизационной очистки (замачивание в моющем растворе, механическая чистка каналов и замковых частей).\n" +
			"3. После повторной очистки и промывки проводится повторный контроль качества азопирамовой пробой в удвоенном объеме выборки.";
	} else if (!isPhenolphthaleinNegative) {
		clinicalActionProtocolRu =
			"СТРОГИЙ КЛИНИЧЕСКИЙ РЕГЛАМЕНТ (ПРИ ОБНАРУЖЕНИИ ЩЕЛОЧИ):\n" +
			"1. Вся партия изделий (100%) признается недостаточно отмытой от щелочных ПАВ.\n" +
			"2. Вся партия подлежит повторному обильному ополаскиванию проточной водой не менее 5 минут, затем обессоленной / дистиллированной водой до нейтральной реакции (pH 6.5–7.5).\n" +
			"3. Повторная фенолфталеиновая проба до полного отсутствия розового окрашивания.";
	} else if (!isSudanNegative) {
		clinicalActionProtocolRu =
			"СТРОГИЙ КЛИНИЧЕСКИЙ РЕГЛАМЕНТ (ПРИ ОБНАРУЖЕНИИ МАСЕЛ И ЖИРОВ):\n" +
			"1. Вся партия наконечников и вращающихся инструментов подлежит немедленной изоляции.\n" +
			"2. Проводится механическая промывка внутренних каналов 70% этиловым спиртом, продувка сжатым воздухом и ультразвуковое обезжиривание в нейтральном моющем растворе.\n" +
			"3. Повторная проба с Суданом III в удвоенном объеме выборки.";
	} else {
		clinicalActionProtocolRu = `Необходимо отобрать дополнительно ${minSampleRequired - testedSampleCount} шт. инструментов и провести контрольные пробы в полном нормативном объеме.`;
	}

	return {
		isBatchApproved,
		isBatchBlocked,
		minSampleRequired,
		isSamplingSufficient,
		solutionAgeMinutes: 0,
		isSolutionExpired: false,
		solutionExpiresAtIso: freshness.expiresAtIso,
		solutionTimeRemainingMinutes: 120,
		rejectionReasons: reasons,
		clinicalActionProtocolRu,
		regulatoryClauseRu: "Регламент контроля очистки инструментов",
		statusBadgeText: isBatchApproved
			? "ДОПУЩЕНО К СТЕРИЛИЗАЦИИ"
			: !isAzopyramNegative
				? "БРАК: ОБНАРУЖЕНА КРОВЬ"
				: !isPhenolphthaleinNegative
					? "БРАК: ОСТАТКИ ЩЕЛОЧИ"
					: !isSudanNegative
						? "БРАК: МАСЛЯНЫЕ ЗАГРЯЗНЕНИЯ"
						: "БРАК: МАЛАЯ ВЫБОРКА",
		statusBadgeClass: isBatchApproved ? "badge-success" : "badge-danger",
	};
}
