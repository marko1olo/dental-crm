/**
 * apps/api/src/routes/sanpin/wasteModules/canonicalShiftWasteRecords.ts
 *
 * Единый канонический генератор журнала медицинских отходов смены по СанПиН 3.3686-21.
 * Исключает Split-Brain: гарантирует фиксацию триады отходов стоматологической смены:
 * 1) Класс А (эпидемиологически безопасные: упаковка, картон, бумага)
 * 2) Класс Б мягкие (эпидемиологически опасные: перчатки, маски, салфетки, слюноотсосы)
 * 3) Класс Б острые (эпидемиологически опасные: пустые карпулы анестетиков, иглы, скальпели)
 *
 * Мандат 8b: строго <= 120 строк.
 */

import type { medicalWasteLogs } from "../../../db/schema.js";

export type MedicalWasteInsert = typeof medicalWasteLogs.$inferInsert;

export interface CanonicalShiftWasteParams {
	organizationId: string;
	logDate: Date;
	operatorId: string | null;
	dateStr: string;
	defaultOperatorName?: string | undefined;
	barcode?: string | undefined;
	sealNumber?: string | undefined;
	classAWeightKg?: number | string | undefined;
	classBSoftWeightKg?: number | string | undefined;
	classBSharpsWeightKg?: number | string | undefined;
	carpulesCount?: number | undefined;
	needlesCount?: number | undefined;
	disposalCompany?: string | undefined;
}

export function buildCanonicalShiftWasteRecords(
	params: CanonicalShiftWasteParams,
): MedicalWasteInsert[] {
	const {
		organizationId,
		logDate,
		operatorId,
		dateStr,
		defaultOperatorName = "Медсестра ЦСО",
		barcode,
		sealNumber = "DNT-PL-01",
		classAWeightKg = "1.800",
		classBSoftWeightKg = "1.850",
		classBSharpsWeightKg = "0.450",
		carpulesCount = 8,
		needlesCount = 8,
		disposalCompany = "ООО «ЭкоМедСервис»",
	} = params;

	const actSuffix = dateStr.replace(/-/g, "");

	return [
		// 1. Класс А (белые пакеты): эпидемиологически безопасные отходы смены
		{
			organizationId,
			operationType: "accumulation",
			logDate,
			wasteClass: "class_A",
			wasteDescription: "Эпидемиологически безопасные отходы смены (упаковка стоматологических материалов, бумага, картон)",
			packageType: "white_bag",
			packageCount: 1,
			weightKg: String(classAWeightKg),
			volumeLiters: "30.00",
			disinfectionMethod: "none_centralized",
			disinfectantUsed: null,
			disposalCompany,
			transferActNumber: null,
			responsibleStaffId: operatorId,
			notes: `Твердые коммунальные отходы смены. Ответственный: ${defaultOperatorName}`,
		},
		// 2. Класс Б мягкие (желтые пакеты): эпидемиологически опасные отходы
		{
			organizationId,
			operationType: "accumulation",
			logDate,
			wasteClass: "class_B",
			wasteDescription: "Мягкие отходы смены (перчатки, маски, салфетки, ватные валики, слюноотсосы)",
			packageType: "yellow_bag",
			packageCount: 2,
			weightKg: String(classBSoftWeightKg),
			volumeLiters: "25.00",
			disinfectionMethod: "chemical_soaking",
			disinfectantUsed: "Оптимакс Про 1.5% / Дезофран",
			disposalCompany,
			transferActNumber: String(barcode || `АКТ-Б-М-${actSuffix}`),
			responsibleStaffId: operatorId,
			notes: `Пломба ${sealNumber}. Сбор и химическое обеззараживание мягких отходов класса Б. Сдано: ${defaultOperatorName}`,
		},
		// 3. Класс Б острые (желтые непрокалываемые контейнеры): иглы, карпулы, скальпели
		{
			organizationId,
			operationType: "accumulation",
			logDate,
			wasteClass: "class_B",
			wasteDescription: `Острый инструментарий: отработанные карпулы анестетиков (${carpulesCount} шт.), инъекционные иглы (${needlesCount} шт.), скальпели`,
			packageType: "yellow_sharps_container",
			packageCount: 1,
			weightKg: String(classBSharpsWeightKg),
			volumeLiters: "2.00",
			disinfectionMethod: "chemical_soaking",
			disinfectantUsed: "Аламинол 5% / Дезофран",
			disposalCompany,
			transferActNumber: String(barcode || `АКТ-Б-О-${actSuffix}`),
			responsibleStaffId: operatorId,
			notes: `Пломба ${sealNumber}. Непрокалываемый контейнер с иглосъёмником. Сдано: ${defaultOperatorName}`,
		},
	];
}
