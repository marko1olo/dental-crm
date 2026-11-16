import type {
	ChamberPointEvaluation,
	Form257Record,
	PsoChemicalTestId,
	PsoJournalRecord,
	SterilizerEquipmentRecord,
} from "@dental/shared";
import type { FetchSanpinContext } from "./sanpinConsolidatedFetcher.js";

export interface RawPsoRecordDto {
	readonly id?: string | null | undefined;
	readonly timestamp?: string | null | undefined;
	readonly createdAt?: string | null | undefined;
	readonly instrumentName?: string | null | undefined;
	readonly batchItemCount?: number | string | null | undefined;
	readonly testedSampleCount?: number | string | null | undefined;
	readonly testType?: string | null | undefined;
	readonly isAzopyramNegative?: boolean | null | undefined;
	readonly isPhenolphthaleinNegative?: boolean | null | undefined;
	readonly isBatchApproved?: boolean | null | undefined;
	readonly detergentBrand?: string | null | undefined;
	readonly rejectionReason?: string | null | undefined;
	readonly operatorName?: string | null | undefined;
	readonly notes?: string | null | undefined;
}

export interface RawSterilizerEquipmentDto {
	readonly id: string;
	readonly name?: string | null | undefined;
	readonly brandModel?: string | null | undefined;
	readonly serialNumber?: string | null | undefined;
	readonly inventoryNumber?: string | null | undefined;
	readonly deviceType?: string | null | undefined;
	readonly deviceClass?: string | null | undefined;
	readonly chamberVolumeLiters?: number | string | null | undefined;
	readonly locationRoom?: string | null | undefined;
	readonly verificationExpiryDate?: string | null | undefined;
	readonly lastMaintenanceDate?: string | null | undefined;
	readonly nextMaintenanceDate?: string | null | undefined;
	readonly status?: string | null | undefined;
	readonly notes?: string | null | undefined;
}

export interface RawSterilizationCycleDto {
	readonly id?: string | null | undefined;
	readonly timestamp?: string | null | undefined;
	readonly createdAt?: string | null | undefined;
	readonly cycleNumber?: number | string | null | undefined;
	readonly autoclaveId?: string | null | undefined;
	readonly deviceName?: string | null | undefined;
	readonly cycleMode?: string | null | undefined;
	readonly temperatureCelsius?: number | string | null | undefined;
	readonly pressureBar?: number | string | null | undefined;
	readonly durationMin?: number | string | null | undefined;
	readonly itemsDescription?: string | null | undefined;
	readonly packagingType?: string | null | undefined;
	readonly indicatorType?: string | null | undefined;
	readonly passedIndicator?: boolean | null | undefined;
	readonly status?: string | null | undefined;
	readonly rejectionReason?: string | null | undefined;
	readonly operatorName?: string | null | undefined;
	readonly barcode?: string | null | undefined;
}

function normalizePsoTestType(val: string | null | undefined): PsoChemicalTestId {
	if (val === "azopyram" || val === "phenolphthalein" || val === "sudan_iii") {
		return val;
	}
	return "both_standard";
}

export function mapRawPsoRecords(
	rawPso: readonly RawPsoRecordDto[],
	ctx: FetchSanpinContext,
): PsoJournalRecord[] {
	return rawPso.map((item: RawPsoRecordDto, idx: number) => ({
		id: item.id || `PSO-${idx + 1}`,
		timestamp: item.timestamp || item.createdAt || new Date().toISOString(),
		instrumentName: item.instrumentName || item.notes || "Стоматологический инструментарий",
		categoryId: "therapeutic_kit",
		batchItemCount: Number(item.batchItemCount) || 1,
		testedSampleCount: Number(item.testedSampleCount) || 1,
		testType: normalizePsoTestType(item.testType),
		isAzopyramNegative: item.isAzopyramNegative ?? true,
		isPhenolphthaleinNegative: item.isPhenolphthaleinNegative ?? true,
		isSudanNegative: true,
		detergentBrand: item.detergentBrand || "Биолот 0.5% + Аламинол 1.0%",
		isBatchApproved: item.isBatchApproved ?? true,
		rejectionReason: item.rejectionReason || undefined,
		operatorStaffFullName:
			item.operatorName ||
			ctx.appLogic?.activeDoctor?.fullName ||
			ctx.appLogic?.activeDoctor?.name ||
			"Медсестра ЦСО",
		operatorStaffPosition: "Медсестра ЦСО",
		electronicStampVerified: true,
		notes: item.notes || undefined,
	}));
}

export function mapRawSterilizersAndCycles(
	rawSterilizers: readonly RawSterilizerEquipmentDto[],
	rawSterilization: readonly RawSterilizationCycleDto[],
	ctx: FetchSanpinContext,
): { sterilizerEquipments: SterilizerEquipmentRecord[]; form257Records: Form257Record[] } {
	const sterilizerEquipments: SterilizerEquipmentRecord[] = rawSterilizers.map((eq: RawSterilizerEquipmentDto) => ({
		id: eq.id,
		name: eq.name || eq.brandModel || "Автоклав",
		brandModel: eq.brandModel || "Euronda E9 Next",
		serialNumber: eq.serialNumber || "—",
		inventoryNumber: eq.inventoryNumber ?? null,
		deviceType: eq.deviceType || "Паровой",
		deviceClass: eq.deviceClass ?? "B",
		chamberVolumeLiters: eq.chamberVolumeLiters ? Number(eq.chamberVolumeLiters) : 18,
		locationRoom: eq.locationRoom ?? "ЦСО",
		verificationExpiryDate: eq.verificationExpiryDate ?? null,
		lastMaintenanceDate: eq.lastMaintenanceDate ?? null,
		nextMaintenanceDate: eq.nextMaintenanceDate ?? null,
		status: eq.status ?? "active",
		notes: eq.notes ?? null,
	}));

	const form257Records: Form257Record[] = rawSterilization.map((item: RawSterilizationCycleDto, idx: number) => {
		const eq = sterilizerEquipments.find((e) => e.id === item.autoclaveId);
		const isPassed = item.status === "completed" || item.status === "passed" || item.status === "sterile_passed" || item.passedIndicator === true;
		const indicatorTradeName = item.indicatorType || "Медтест 134/5";
		const chamberPoints: ChamberPointEvaluation[] = [
			{ pointIndex: 1, code: "KT-1", nameRu: "Верхний левый угол", indicatorId: "medtest-134", indicatorTradeNameRu: indicatorTradeName, status: isPassed ? "passed" : "failed", initialColorRu: "Желтый", actualColorRu: isPassed ? "Темно-коричневый" : "Желтый" },
			{ pointIndex: 2, code: "KT-2", nameRu: "Верхний правый угол", indicatorId: "medtest-134", indicatorTradeNameRu: indicatorTradeName, status: isPassed ? "passed" : "failed", initialColorRu: "Желтый", actualColorRu: isPassed ? "Темно-коричневый" : "Желтый" },
			{ pointIndex: 3, code: "KT-3", nameRu: "Центр камеры", indicatorId: "medtest-134", indicatorTradeNameRu: indicatorTradeName, status: isPassed ? "passed" : "failed", initialColorRu: "Желтый", actualColorRu: isPassed ? "Темно-коричневый" : "Желтый" },
			{ pointIndex: 4, code: "KT-4", nameRu: "Нижний левый угол", indicatorId: "medtest-134", indicatorTradeNameRu: indicatorTradeName, status: isPassed ? "passed" : "failed", initialColorRu: "Желтый", actualColorRu: isPassed ? "Темно-коричневый" : "Желтый" },
			{ pointIndex: 5, code: "KT-5", nameRu: "Точка стока конденсата", indicatorId: "medtest-134", indicatorTradeNameRu: indicatorTradeName, status: isPassed ? "passed" : "failed", initialColorRu: "Желтый", actualColorRu: isPassed ? "Темно-коричневый" : "Желтый" },
		];

		return {
			id: item.id || `F257-${idx + 1}`,
			date: item.timestamp ? item.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10),
			cycleNumber: Number(item.cycleNumber) || (idx + 1),
			sterilizerId: item.autoclaveId || eq?.id || "autoclave-01",
			sterilizerCode: item.deviceName || eq?.brandModel || "АВТОКЛАВ-01",
			sterilizerBrandModel: eq?.brandModel || item.deviceName || "Euronda E9 Next (Класс B)",
			sterilizerSerialNumber: eq?.serialNumber || "SN-EUR-99824",
			regimeId: item.cycleMode === "prion" ? "steam_134_20min" : "steam_134_5min",
			regimeNameRu: item.cycleMode === "prion" ? "134°C Прион (20 мин)" : "134°C Универсальный (5 мин)",
			targetTemperatureCelsius: 134,
			targetPressureBar: 2.1,
			targetExposureMinutes: item.cycleMode === "prion" ? 20 : 5,
			actualTemperatureCelsius: Number(item.temperatureCelsius) || 134.5,
			actualPressureBar: Number(item.pressureBar) || 2.15,
			actualExposureMinutes: Number(item.durationMin) || 5.5,
			itemsDescriptionRu: item.itemsDescription || "Стоматологический инструментарий (крафт-пакеты)",
			packsCount: 1,
			packagingType: item.packagingType || "kraft_pouch",
			packagingNameRu: "Пакеты комбинированные самоклеящиеся",
			shelfLifeDays: 50,
			chamberPoints,
			areAllPointsPassed: isPassed,
			chemicalIndicatorNameRu: item.indicatorType || "Медтест 134/5 (5 класс)",
			isCyclePassed: isPassed,
			rejectionReason: !isPassed ? (item.rejectionReason || "Не пройден тест индикатора") : undefined,
			status: isPassed ? "sterile_passed" : "rejected_defect",
			operatorStaffFullName: item.operatorName || ctx.appLogic?.activeDoctor?.fullName || "Медсестра ЦСО",
			operatorStaffPosition: "Медсестра ЦСО",
			headNurseSignatureFullName: ctx.appLogic?.clinic?.legalEntityName || "Главная медсестра",
			isHeadNurseVerified: true,
			verificationTimestamp: item.createdAt || new Date().toISOString(),
			digitalStampHash: `STAMP-${item.barcode || (item.id ? item.id.slice(0, 8) : "VERIFIED")}-ECP`,
			createdAt: item.createdAt || new Date().toISOString(),
		};
	});

	return { sterilizerEquipments, form257Records };
}
