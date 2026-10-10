import { generateKraftBatchRecords, getKraftMaterialDefinition } from '../kraftPackageGenerator.js';
import { type KraftPackageMaterialId, type KraftPackageRecord } from '../kraftPackageTypes.js';
import { calculateDigitalStampHash, calculatePsoSampleRequirements, createDefault5ChamberPoints, generateForm257RecordId, generatePsoRecordId, type Form257Record, type PsoJournalRecord } from '../sanpinRegistryEngine.js';
import { type SanpinDailyLoad } from './types.js';
// ─────────────────────────────────────────────────────────────────────────────
// 4. RETROSPECTIVE JOURNAL RECORD GENERATORS (ФОРМА 366/у & 257/у)
// ─────────────────────────────────────────────────────────────────────────────

export interface RetrospectiveGenerationOptions {
	readonly operatorStaffFullName?: string | undefined;
	readonly operatorStaffPosition?: string | undefined;
	readonly headNurseFullName?: string | undefined;
	readonly autoclaveBrandModel?: string | undefined;
	readonly autoclaveSerialNumber?: string | undefined;
	readonly detergentBrand?: string | undefined;
	readonly packageMaterial?: KraftPackageMaterialId | undefined;
}

/**
 * Генерирует ретроспективные записи журнала ПСО (Форма № 366/у)
 * на основе рассчитанной суточной нагрузки инструментов по расписанию.
 */
export function generateRetrospectivePsoRecordsFromDailyLoad(
	dailyLoad: SanpinDailyLoad,
	options: RetrospectiveGenerationOptions = {},
): PsoJournalRecord[] {
	if (!dailyLoad.isWorkingDay || dailyLoad.totalInstrumentsCount === 0) {
		return [];
	}

	const operatorName = options.operatorStaffFullName || "Смирнова А.В.";
	const operatorPosition = options.operatorStaffPosition || "Медсестра ЦСО";
	const detergent = options.detergentBrand || "Оптимакс Про 1.0%";

	const records: PsoJournalRecord[] = [];
	let seq = 1;

	// 1. Терапевтический инструментарий (лотки + боры + наконечники)
	if (dailyLoad.totalBasicTraysCount > 0 || dailyLoad.totalBurSetsCount > 0 || dailyLoad.totalHandpiecesCount > 0) {
		const batchCount =
			dailyLoad.totalBasicTraysCount * 5 + dailyLoad.totalBurSetsCount * 6 + dailyLoad.totalHandpiecesCount;
		const { minSampleCount } = calculatePsoSampleRequirements(batchCount, false);

		records.push({
			id: generatePsoRecordId(dailyLoad.date, seq++),
			timestamp: `${dailyLoad.date}T13:30:00.000Z`,
			instrumentName: "Терапевтический смотровой инструментарий (зеркала, зонды, пинцеты, штопферы, наконечники)",
			categoryId: "therapeutic_kit",
			batchItemCount: batchCount,
			testedSampleCount: minSampleCount,
			testType: "both_standard",
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isSudanNegative: true,
			detergentBrand: detergent,
			isBatchApproved: true,
			operatorStaffFullName: operatorName,
			operatorStaffPosition: operatorPosition,
			electronicStampVerified: true,
			notes: `ПСО по расписанию дня: ${dailyLoad.therapyPatientsCount} терапевтических пациентов`,
		});
	}

	// 2. Хирургический инструментарий (щипцы, элеваторы, хирургические лотки)
	if (dailyLoad.totalSurgicalTraysCount > 0 || dailyLoad.totalForcepsCount > 0 || dailyLoad.totalElevatorsCount > 0) {
		const batchCount =
			dailyLoad.totalSurgicalTraysCount * 5 +
			dailyLoad.totalForcepsCount * 3 +
			dailyLoad.totalElevatorsCount * 3 +
			dailyLoad.totalSyringesCount;
		const { minSampleCount } = calculatePsoSampleRequirements(batchCount, true);

		records.push({
			id: generatePsoRecordId(dailyLoad.date, seq++),
			timestamp: `${dailyLoad.date}T14:15:00.000Z`,
			instrumentName: "Хирургический инструментарий (щипцы экстракционные, элеваторы, кюреты Лукаса, шприцы)",
			categoryId: "surgical_kit",
			batchItemCount: batchCount,
			testedSampleCount: minSampleCount,
			testType: "both_standard",
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isSudanNegative: true,
			detergentBrand: detergent,
			isBatchApproved: true,
			operatorStaffFullName: operatorName,
			operatorStaffPosition: operatorPosition,
			electronicStampVerified: true,
			notes: `ПСО хирургической смены: ${dailyLoad.surgeryPatientsCount} хирургических пациентов`,
		});
	}

	// 3. Ортопедический инструментарий (лотки + слепочные ложки)
	if (dailyLoad.totalOrthopedicTraysCount > 0 || dailyLoad.totalImpressionTraysCount > 0) {
		const batchCount = dailyLoad.totalOrthopedicTraysCount * 4 + dailyLoad.totalImpressionTraysCount * 2;
		const { minSampleCount } = calculatePsoSampleRequirements(batchCount, false);

		records.push({
			id: generatePsoRecordId(dailyLoad.date, seq++),
			timestamp: `${dailyLoad.date}T15:00:00.000Z`,
			instrumentName: "Ортопедический инструментарий (лотки препарирования, слепочные металлические ложки)",
			categoryId: "orthopedic_kit",
			batchItemCount: batchCount,
			testedSampleCount: minSampleCount,
			testType: "both_standard",
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isSudanNegative: true,
			detergentBrand: detergent,
			isBatchApproved: true,
			operatorStaffFullName: operatorName,
			operatorStaffPosition: operatorPosition,
			electronicStampVerified: true,
			notes: `ПСО ортопедического приёма: ${dailyLoad.orthopedicsPatientsCount} ортопедических пациентов`,
		});
	}

	return records;
}

/**
 * Генерирует ретроспективные записи журнала контроля работы автоклавов (Форма № 257/у)
 * на основе предложенных циклов стерилизации по фактической дневной загрузке.
 */
export function generateRetrospectiveAutoclaveRecordsFromDailyLoad(
	dailyLoad: SanpinDailyLoad,
	options: RetrospectiveGenerationOptions = {},
): Form257Record[] {
	if (!dailyLoad.isWorkingDay || dailyLoad.totalAutoclaveCyclesCount === 0) {
		return [];
	}

	const operatorName = options.operatorStaffFullName || "Смирнова А.В.";
	const operatorPosition = options.operatorStaffPosition || "Медсестра ЦСО";
	const headNurse = options.headNurseFullName || "Иванова М.П.";
	const sterilizerBrand = options.autoclaveBrandModel || "Melag Vacuklav 23B+";
	const serialNumber = options.autoclaveSerialNumber || "VK-2024-8841";
	const pkgMaterial = options.packageMaterial || "paper_self_seal_single";
	const materialDef = getKraftMaterialDefinition(pkgMaterial);

	const records: Form257Record[] = [];

	for (const cycle of dailyLoad.proposedAutoclaveCycles) {
		const chamberPoints = createDefault5ChamberPoints("Интеграл-134 (Класс 5)", true);
		const id = generateForm257RecordId(dailyLoad.date, cycle.cycleNumber, "АК-01");

		const stampHash = calculateDigitalStampHash({
			id,
			date: dailyLoad.date,
			cycleNumber: cycle.cycleNumber,
			sterilizerCode: "АК-01",
			actualTemp: 134.4,
			actualPressure: 2.15,
			actualTime: 5,
			isPassed: true,
			operatorName,
		});

		const record: Form257Record = {
			id,
			date: dailyLoad.date,
			cycleNumber: cycle.cycleNumber,
			sterilizerId: "sterilizer-ak01",
			sterilizerCode: "АК-01",
			sterilizerBrandModel: sterilizerBrand,
			sterilizerSerialNumber: serialNumber,
			regimeId: cycle.autoclaveRegime,
			regimeNameRu: "Паровой 134°C / 5 мин (2.1 бар) — Скоростной B-класс",
			targetTemperatureCelsius: 134,
			targetPressureBar: 2.1,
			targetExposureMinutes: 5,
			actualTemperatureCelsius: 134.4,
			actualPressureBar: 2.15,
			actualExposureMinutes: 5,
			itemsDescriptionRu: cycle.itemsListRu.join("; "),
			packsCount: cycle.packagesCount,
			packagingType: pkgMaterial,
			packagingNameRu: materialDef.shortLabelRu,
			shelfLifeDays: materialDef.statutoryShelfLifeDays,
			chamberPoints,
			areAllPointsPassed: true,
			chemicalIndicatorNameRu: "Винар ИнтеТЕСТ-В-134/5 (Класс 5 Интеграл)",
			isCyclePassed: true,
			status: "sterile_passed",
			operatorStaffFullName: operatorName,
			operatorStaffPosition: operatorPosition,
			headNurseSignatureFullName: headNurse,
			isHeadNurseVerified: true,
			verificationTimestamp: `${dailyLoad.date}T18:00:00.000Z`,
			digitalStampHash: stampHash,
			notes: `Стерилизация партии по расписанию дня (${cycle.packagesCount} пакетов на ${dailyLoad.totalPatientsCount} пациентов)`,
			createdAt: `${dailyLoad.date}T18:00:00.000Z`,
		};

		records.push(record);
	}

	return records;
}

/**
 * Генерирует массив крафт-пакетов (KraftPackageRecord) со штрихкодами
 * для всей дневной партии по реальной структуре визитов.
 */
export function generateRetrospectiveKraftPackagesFromDailyLoad(
	dailyLoad: SanpinDailyLoad,
	options: RetrospectiveGenerationOptions = {},
): KraftPackageRecord[] {
	if (!dailyLoad.isWorkingDay || dailyLoad.totalKraftPackagesCount === 0) {
		return [];
	}

	const pkgMaterial = options.packageMaterial || "paper_self_seal_single";
	const operatorName = options.operatorStaffFullName || "Смирнова А.В.";

	const allRecords: KraftPackageRecord[] = [];

	// 1. Терапевтические смотровые лотки
	if (dailyLoad.totalBasicTraysCount > 0) {
		const trayRecords = generateKraftBatchRecords({
			autoclaveId: "АК-01",
			cycleNumber: 1,
			packageType: pkgMaterial,
			packageSize: "size_100x200",
			toolSetId: "set_therapeutic_tray",
			quantity: dailyLoad.totalBasicTraysCount,
			operatorName,
			customPackDate: `${dailyLoad.date}T09:00:00.000Z`,
			customBatchId: `KB-${dailyLoad.date.replace(/-/g, "")}-TER-TRAY`,
			notes: `Базовые смотровые лотки (${dailyLoad.therapyPatientsCount} терапевтических визитов)`,
		});
		allRecords.push(...trayRecords);
	}

	// 2. Наборы боров
	if (dailyLoad.totalBurSetsCount > 0) {
		const burRecords = generateKraftBatchRecords({
			autoclaveId: "АК-01",
			cycleNumber: 1,
			packageType: pkgMaterial,
			packageSize: "size_75x150",
			toolSetId: "set_endodontic_burs",
			quantity: dailyLoad.totalBurSetsCount,
			operatorName,
			customPackDate: `${dailyLoad.date}T09:15:00.000Z`,
			customBatchId: `KB-${dailyLoad.date.replace(/-/g, "")}-BURS`,
			notes: `Наборы боров и фрез (${dailyLoad.totalBurSetsCount} шт.)`,
		});
		allRecords.push(...burRecords);
	}

	// 3. Хирургические наборы
	if (dailyLoad.totalSurgicalTraysCount > 0) {
		const surgRecords = generateKraftBatchRecords({
			autoclaveId: "АК-01",
			cycleNumber: 2,
			packageType: pkgMaterial,
			packageSize: "size_150x250",
			toolSetId: "set_surgical_extraction",
			quantity: dailyLoad.totalSurgicalTraysCount,
			operatorName,
			customPackDate: `${dailyLoad.date}T10:00:00.000Z`,
			customBatchId: `KB-${dailyLoad.date.replace(/-/g, "")}-SURG`,
			notes: `Хирургические экстракционные наборы (${dailyLoad.surgeryPatientsCount} визитов)`,
		});
		allRecords.push(...surgRecords);
	}

	// 4. Ортопедические наборы
	if (dailyLoad.totalOrthopedicTraysCount > 0) {
		const orthoRecords = generateKraftBatchRecords({
			autoclaveId: "АК-01",
			cycleNumber: 2,
			packageType: pkgMaterial,
			packageSize: "size_100x200",
			toolSetId: "set_orthopedic_prep",
			quantity: dailyLoad.totalOrthopedicTraysCount,
			operatorName,
			customPackDate: `${dailyLoad.date}T10:30:00.000Z`,
			customBatchId: `KB-${dailyLoad.date.replace(/-/g, "")}-ORTHO`,
			notes: `Ортопедические наборы (${dailyLoad.orthopedicsPatientsCount} визитов)`,
		});
		allRecords.push(...orthoRecords);
	}

	return allRecords;
}
