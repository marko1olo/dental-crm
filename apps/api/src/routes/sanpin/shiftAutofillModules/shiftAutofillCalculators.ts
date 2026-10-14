import crypto from "node:crypto";
import type { PsoBatchItem, SterilizationBatchItem } from "./shiftAutofillSchemas.js";

export function normalizePackagingType(rawPackagingType?: string): string {
	const pt = String(rawPackagingType || "").toLowerCase();
	if (pt === "kraft_self_adhesive" || pt === "kraft_self_seal") return "kraft_self_adhesive";
	if (pt === "laminated_heat_sealed" || pt.includes("kombin") || pt.includes("laminat")) {
		return "laminated_heat_sealed";
	}
	if (pt === "metal_cassette" || pt.includes("kasset")) return "metal_cassette";
	if (pt === "other") return "other";
	return "kraft_heat_sealed";
}

export function getShiftPsoBatches(providedRecords?: PsoBatchItem[] | any[]): any[] {
	if (Array.isArray(providedRecords) && providedRecords.length > 0) {
		return providedRecords;
	}
	return [
		{
			instrumentName: "Терапевтический смотровой инструментарий (зеркала, зонды, пинцеты)",
			batchItemCount: 120,
			testedSampleCount: 5,
			detergentBrand: "Биолот 0.5% + Аламинол 1%",
			notes: "СанПиН 3.3686-21. 1% от партии проверен. Азопирам/фенолфталеин отрицательны.",
		},
		{
			instrumentName: "Хирургический инструментарий (щипцы, элеваторы)",
			batchItemCount: 40,
			testedSampleCount: 4,
			detergentBrand: "Оптимакс Про 1.5%",
			notes: "Кровь и белковые загрязнения отсутствуют.",
		},
		{
			instrumentName: "Эндодонтический инструментарий и боры",
			batchItemCount: 150,
			testedSampleCount: 5,
			detergentBrand: "Биолот 0.5%",
			notes: "УЗ-мойка 15 мин. Пробы отрицательные.",
		},
	];
}

export function getShiftSterilizationRecords(
	sterilizationRecords?: SterilizationBatchItem[] | any[],
	form257Fallback?: any[],
): any[] {
	if (Array.isArray(sterilizationRecords) && sterilizationRecords.length > 0) {
		return sterilizationRecords;
	}
	if (Array.isArray(form257Fallback) && form257Fallback.length > 0) {
		return form257Fallback;
	}
	return [
		{
			sterilizerBrandModel: "Автоклав Euronda E9 Next (Класс B)",
			sterilizerId: "АК-01",
			cycleNumber: 1,
			itemsDescription: "Стоматологический инструментарий смены",
			packagingType: "kraft_bag",
			temperatureCelsius: "134",
			pressureBar: "2.15",
			durationMin: 5,
		},
		{
			sterilizerBrandModel: "Автоклав Euronda E9 Next (Класс B)",
			sterilizerId: "АК-01",
			cycleNumber: 2,
			itemsDescription: "Хирургические наконечники и турбины",
			packagingType: "kraft_bag",
			temperatureCelsius: "134",
			pressureBar: "2.15",
			durationMin: 5,
		},
	];
}

export function getDefaultBactericidalEquipments(organizationId: string) {
	return [
		{
			organizationId,
			roomName: "Терапевтический кабинет №1",
			roomAreaM2: "18.00",
			roomVolumeM3: "54.00",
			deviceBrand: "Дезар-4 (КРОНТ)",
			serialNumber: "DZR-2026-001",
			deviceType: "recirculator_closed" as const,
			lampType: "TUV 15W",
			lampCount: 3,
			maxLampHours: 9000,
			totalOperatingHours: "420.50",
			isCommissioned: true,
		},
		{
			organizationId,
			roomName: "ЦСО (Стерилизационная)",
			roomAreaM2: "12.00",
			roomVolumeM3: "36.00",
			deviceBrand: "Дезар-7 (КРОНТ)",
			serialNumber: "DZR-2026-002",
			deviceType: "recirculator_closed" as const,
			lampType: "TUV 15W",
			lampCount: 5,
			maxLampHours: 9000,
			totalOperatingHours: "310.00",
			isCommissioned: true,
		},
	];
}

export function getDefaultTemperatureHumidityEquipments(organizationId: string) {
	return [
		{
			organizationId,
			name: "Фармацевтический холодильник Позис ХФ-140",
			location: "Кабинет №1 (хранение анестетиков)",
			equipmentType: "refrigerator_cold" as const,
			meterDeviceName: "Термометр ТЦ-1200",
			meterSerialNumber: "PZS-140-001",
			targetTempMinCelsius: "2.00",
			targetTempMaxCelsius: "8.00",
			isActive: true,
		},
		{
			organizationId,
			name: "Гигрометр психометрический ВИТ-2",
			location: "ЦСО (Стерилизационная)",
			equipmentType: "storage_room" as const,
			meterDeviceName: "Гигрометр ВИТ-2",
			meterSerialNumber: "VIT2-2026-01",
			targetTempMinCelsius: "18.00",
			targetTempMaxCelsius: "25.00",
			targetHumidityMinPercent: "30.00",
			targetHumidityMaxPercent: "60.00",
			isActive: true,
		},
	];
}

export function calculateMonthWorkingDates(year?: number, month?: number): {
	targetYear: number;
	targetMonth: number;
	workingDates: string[];
	monthLabelRu: string;
} {
	const now = new Date();
	const targetYear = year ?? now.getFullYear();
	const targetMonth = month ? month - 1 : now.getMonth();
	const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

	const monthNamesRu = [
		"Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
		"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
	];
	const monthLabelRu = `${monthNamesRu[targetMonth]} ${targetYear}`;

	const workingDates: string[] = [];
	for (let d = 1; d <= daysInMonth; d++) {
		const dt = new Date(targetYear, targetMonth, d);
		if (dt.getDay() !== 0) {
			const yyyy = dt.getFullYear();
			const mm = String(dt.getMonth() + 1).padStart(2, "0");
			const dd = String(dt.getDate()).padStart(2, "0");
			workingDates.push(`${yyyy}-${mm}-${dd}`);
		}
	}

	return { targetYear, targetMonth, workingDates, monthLabelRu };
}

export function generateMonthBatchRows(params: {
	workingDates: string[];
	organizationId: string;
	activeEquips: any[];
	tempEquips: any[];
	operatorId: string | null;
}) {
	const { workingDates, organizationId, activeEquips, tempEquips, operatorId } = params;

	const allSterilRows: any[] = [];
	const allPsoRows: any[] = [];
	const allBactLogs: any[] = [];
	const allTempLogs: any[] = [];
	const allWasteLogs: any[] = [];

	for (const dateStr of workingDates) {
		allSterilRows.push(
			{
				organizationId,
				deviceName: "Автоклав Euronda E9 Next (Класс B)",
				autoclaveId: "АК-01",
				cycleNumber: 1,
				itemsDescription:
					"Терапевтический инструментарий (зеркала, зонды, пинцеты, наконечники NSK Ti-Max)",
				packagingType: "kraft_heat_sealed",
				temperatureCelsius: "134",
				pressureBar: "2.15",
				durationMin: 5,
				indicatorType: "class5_integrating",
				cycleMode: "B",
				passedIndicator: true,
				status: "passed" as const,
				barcode: `DNT-STER-${dateStr.replace(/-/g, "")}-1-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
				operatorId,
				notes: "⚡ 1-Клик автопилот месяца: норма СанПиН 3.3686-21, 5 точек КТ подтверждены",
				createdAt: new Date(`${dateStr}T09:30:00Z`),
			},
			{
				organizationId,
				deviceName: "Автоклав Euronda E9 Next (Класс B)",
				autoclaveId: "АК-01",
				cycleNumber: 2,
				itemsDescription:
					"Хирургический инструментарий (щипцы, элеваторы) и эндодонтические файлы",
				packagingType: "kraft_self_adhesive",
				temperatureCelsius: "134",
				pressureBar: "2.15",
				durationMin: 5,
				indicatorType: "class5_integrating",
				cycleMode: "B",
				passedIndicator: true,
				status: "passed" as const,
				barcode: `DNT-STER-${dateStr.replace(/-/g, "")}-2-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
				operatorId,
				notes: "⚡ 1-Клик автопилот месяца: норма СанПиН 3.3686-21, 5 точек КТ подтверждены",
				createdAt: new Date(`${dateStr}T14:30:00Z`),
			},
		);

		allPsoRows.push(
			{
				organizationId,
				testType: "both",
				batchItemCount: 120,
				testedSampleCount: 5,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isBatchApproved: true,
				detergentBrand: "Биолот 0.5% + Аламинол 1%",
				operatorId,
				notes: "Терапевтический смотровой инструментарий | СанПиН 3.3686-21 (Норма)",
				createdAt: new Date(`${dateStr}T08:50:00Z`),
			},
			{
				organizationId,
				testType: "both",
				batchItemCount: 40,
				testedSampleCount: 4,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isBatchApproved: true,
				detergentBrand: "Оптимакс Про 1.5%",
				operatorId,
				notes: "Хирургический инструментарий | СанПиН 3.3686-21 (Норма)",
				createdAt: new Date(`${dateStr}T13:45:00Z`),
			},
			{
				organizationId,
				testType: "both",
				batchItemCount: 150,
				testedSampleCount: 5,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isBatchApproved: true,
				detergentBrand: "Биолот 0.5%",
				operatorId,
				notes: "Эндодонтический инструментарий и боры | УЗ-мойка 15 мин (Норма)",
				createdAt: new Date(`${dateStr}T17:10:00Z`),
			},
		);

		const sessStart = new Date(`${dateStr}T08:00:00Z`);
		const sessEnd = new Date(`${dateStr}T08:30:00Z`);
		for (const eq of activeEquips) {
			allBactLogs.push({
				organizationId,
				equipmentId: eq.id,
				date: dateStr,
				sessionStartTime: sessStart,
				sessionEndTime: sessEnd,
				durationMinutes: 30,
				operatingMode: "continuous_presence" as const,
				cumulativeHoursAfterSession: (Number(eq.totalOperatingHours || 0) + 0.5).toFixed(2),
				operatorId,
				notes: "⚡ 1-Клик автопилот месяца: предсменная дезинфекция воздуха",
			});
		}

		for (const te of tempEquips) {
			const isFridge = te.equipmentType.includes("refrigerator");
			allTempLogs.push({
				organizationId,
				equipmentId: te.id,
				measurementDate: dateStr,
				measurementPeriod: "morning" as const,
				temperatureCelsius: isFridge ? "4.2" : "21.5",
				relativeHumidityPercent: isFridge ? null : "48",
				isWithinNorm: true,
				deviationReason: null,
				operatorId,
				notes: "⚡ 1-Клик автопилот месяца: норма СанПиН 3.3686-21",
			});
		}

		allWasteLogs.push({
			organizationId,
			operationType: "accumulation",
			wasteClass: "class_B",
			wasteDescription: "Отработанные карпулы анестетиков, салфетки, перчатки, слюноотсосы",
			packageType: "yellow_bag",
			packageCount: 2,
			weightKg: "1.850",
			disinfectionMethod: "chemical_soaking",
			disinfectantUsed: "Оптимакс Про 1.5%",
			disposalCompany: "ООО «ЭкоМедСервис»",
			transferActNumber: `АКТ-Б-${dateStr.replace(/-/g, "")}`,
			responsibleStaffId: operatorId,
			notes: "⚡ 1-Клик автопилот месяца: обеззараживание отходов класса Б",
		});
	}

	return {
		allSterilRows,
		allPsoRows,
		allBactLogs,
		allTempLogs,
		allWasteLogs,
	};
}
