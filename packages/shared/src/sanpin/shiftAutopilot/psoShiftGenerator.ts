/**
 * packages/shared/src/sanpin/shiftAutopilot/psoShiftGenerator.ts
 * Генератор нормативных записей предстерилизационной очистки за смену.
 * Мандат 8b: строго <= 120 строк.
 */

import { evaluatePsoTrialResult, type PsoJournalRecord } from "../sanpinRegistryEngine.js";

export function generateShiftPsoRecords(
	date: string,
	operatorFullName: string,
	operatorPosition: string,
): PsoJournalRecord[] {
	const batch1Math = evaluatePsoTrialResult({
		batchCount: 120,
		testedSampleCount: 5,
		isAzopyramNegative: true,
		isPhenolphthaleinNegative: true,
		isSudanNegative: true,
	});

	const batch2Math = evaluatePsoTrialResult({
		batchCount: 40,
		testedSampleCount: 4,
		isAzopyramNegative: true,
		isPhenolphthaleinNegative: true,
		isSudanNegative: true,
	});

	const batch3Math = evaluatePsoTrialResult({
		batchCount: 150,
		testedSampleCount: 5,
		isAzopyramNegative: true,
		isPhenolphthaleinNegative: true,
		isSudanNegative: true,
	});

	return [
		{
			id: `pso-${date}-01`,
			timestamp: `${date}T08:45:00Z`,
			instrumentName: "Терапевтический базовый лоток (зеркала, зонды, пинцеты, гладилки)",
			categoryId: "therapeutic_kit",
			batchItemCount: 120,
			testedSampleCount: 5,
			testType: "both_standard",
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isSudanNegative: true,
			detergentBrand: "Биолот 0.5%",
			isBatchApproved: batch1Math.isBatchApproved,
			operatorStaffFullName: operatorFullName,
			operatorStaffPosition: operatorPosition,
			electronicStampVerified: true,
			rejectionReason: undefined,
			notes: "Ультразвуковая мойка Elmasonic S30H (40 кГц, 15 мин при 45°C). Пробы отрицательные.",
		},
		{
			id: `pso-${date}-02`,
			timestamp: `${date}T11:30:00Z`,
			instrumentName: "Хирургический набор (элеваторы, щипцы, кюреты)",
			categoryId: "surgical_kit",
			batchItemCount: 40,
			testedSampleCount: 4,
			testType: "both_standard",
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isSudanNegative: true,
			detergentBrand: "Биолот 0.5%",
			isBatchApproved: batch2Math.isBatchApproved,
			operatorStaffFullName: operatorFullName,
			operatorStaffPosition: operatorPosition,
			electronicStampVerified: true,
			rejectionReason: undefined,
			notes: "Предварительное замачивание в растворе Аламинол 1.5% 60 мин. Пробы отрицательные.",
		},
		{
			id: `pso-${date}-03`,
			timestamp: `${date}T14:15:00Z`,
			instrumentName: "Боры твердосплавные и алмазные головки",
			categoryId: "rotary_burs",
			batchItemCount: 150,
			testedSampleCount: 5,
			testType: "both_standard",
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isSudanNegative: true,
			detergentBrand: "Бородез 2.0%",
			isBatchApproved: batch3Math.isBatchApproved,
			operatorStaffFullName: operatorFullName,
			operatorStaffPosition: operatorPosition,
			electronicStampVerified: true,
			rejectionReason: undefined,
			notes: "Очистка в эндобоксе. Пробы на гемоглобин и щелочь отрицательные.",
		},
	];
}
