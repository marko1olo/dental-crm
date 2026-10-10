import { z } from "zod";
import { SanPiNRegulatoryEngine } from "./disinfectionSchemas.js";
import {
	type SterilizationDeviceType,
	type SterilizerDeviceClass,
	type SterilizerEquipmentStatus,
	type SterilizerIndicatorClass,
	type SterilizerPackagingType,
	sterilizationDeviceTypeSchema,
	sterilizerDeviceClassSchema,
	sterilizerEquipmentStatusSchema,
	sterilizerIndicatorClassSchema,
	sterilizerPackagingTypeSchema,
} from "./types.js";

// ─── 2. Журнал контроля работы стерилизаторов (Форма № 257/у) ─────────────────

export const sterilizationLogRecordSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	deviceName: z.string().min(1),
	sterilizerType: sterilizationDeviceTypeSchema.default("autoclave_steam"),
	autoclaveId: z.string().nullable().optional(),
	serialNumber: z.string().nullable().optional(),
	cycleNumber: z.number().int().min(1),
	itemsDescription: z.string().nullable().optional(),
	packagingType: sterilizerPackagingTypeSchema.default("kraft_heat_sealed"),
	temperatureCelsius: z.number().nullable().optional(),
	pressureBar: z.number().nullable().optional(),
	durationMin: z.number().int().nullable().optional(),
	indicatorType: sterilizerIndicatorClassSchema.default("class5_integrating"),
	passedIndicator: z.boolean().default(true),
	biologicalTestResult: z.enum(["passed", "failed", "not_conducted"]).default("not_conducted"),
	status: z.enum(["passed", "failed", "quarantined"]).default("passed"),
	barcode: z.string().nullable().optional(),
	expiresAt: z.string().nullable().optional(),
	operatorId: z.string().uuid().nullable().optional(),
	operatorName: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	timestamp: z.string(),
	createdAt: z.string(),
});
export type SterilizationLogRecord = z.infer<typeof sterilizationLogRecordSchema>;

export const createSterilizationLogDtoSchema = z.object({
	deviceName: z.string().trim().min(1, "Укажите марку/название аппарата"),
	sterilizerType: sterilizationDeviceTypeSchema.default("autoclave_steam"),
	autoclaveId: z.string().trim().optional().nullable(),
	serialNumber: z.string().trim().max(80).optional().nullable(),
	cycleNumber: z.number().int().min(1).default(1),
	itemsDescription: z.string().trim().min(1, "Укажите наименование изделий и лотков"),
	packagingType: sterilizerPackagingTypeSchema.default("kraft_heat_sealed"),
	temperatureCelsius: z.number().min(50).max(250),
	pressureBar: z.number().min(0).max(10).optional().nullable(),
	durationMin: z.number().int().min(1).max(300),
	indicatorType: sterilizerIndicatorClassSchema.default("class5_integrating"),
	passedIndicator: z.boolean().default(true),
	biologicalTestResult: z.enum(["passed", "failed", "not_conducted"]).default("not_conducted"),
	operatorId: z.string().uuid().optional().nullable(),
	notes: z.string().trim().max(500).optional().nullable(),
});
export type CreateSterilizationLogDto = z.input<typeof createSterilizationLogDtoSchema>;

// ─── 2.1. Парк стерилизаторов и автоклавов (Учет оборудования ЦСО) ────────────

export const sterilizerEquipmentSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	name: z.string().min(1, "Наименование аппарата обязательно"),
	brandModel: z.string().min(1, "Марка/модель обязательна"),
	serialNumber: z.string().min(1, "Заводской серийный номер обязателен"),
	inventoryNumber: z.string().nullable().optional(),
	deviceType: sterilizationDeviceTypeSchema.default("autoclave_steam"),
	deviceClass: sterilizerDeviceClassSchema.default("autoclave_class_b"),
	chamberVolumeLiters: z.number().min(0.1).default(22),
	locationRoom: z.string().default("ЦСО (Стерилизационная)"),
	verificationExpiryDate: z.string().nullable().optional(),
	lastMaintenanceDate: z.string().nullable().optional(),
	nextMaintenanceDate: z.string().nullable().optional(),
	commissioningDate: z.string().nullable().optional(),
	decommissioningDate: z.string().nullable().optional(),
	status: sterilizerEquipmentStatusSchema.default("active"),
	isCommissioned: z.boolean().default(true),
	isVerificationExpired: z.boolean().optional(),
	isVerificationDueSoon: z.boolean().optional(),
	notes: z.string().nullable().optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});
export type SterilizerEquipment = z.infer<typeof sterilizerEquipmentSchema>;

export const createSterilizerEquipmentDtoSchema = z.object({
	name: z.string().trim().min(1, "Укажите наименование аппарата"),
	brandModel: z.string().trim().min(1, "Укажите марку/модель аппарата"),
	serialNumber: z.string().trim().min(1, "Укажите заводской серийный номер"),
	inventoryNumber: z.string().trim().max(80).optional().nullable(),
	deviceType: sterilizationDeviceTypeSchema.default("autoclave_steam"),
	deviceClass: sterilizerDeviceClassSchema.default("autoclave_class_b"),
	chamberVolumeLiters: z.number().min(0.5, "Объем камеры должен быть не менее 0.5 л").max(500, "Объем камеры не может превышать 500 л").default(22),
	locationRoom: z.string().trim().min(1, "Укажите помещение/кабинет").default("ЦСО (Стерилизационная)"),
	verificationExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Формат даты поверки: ГГГГ-ММ-ДД").optional().nullable(),
	lastMaintenanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Формат даты ТО: ГГГГ-ММ-ДД").optional().nullable(),
	nextMaintenanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Формат даты след. ТО: ГГГГ-ММ-ДД").optional().nullable(),
	commissioningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Формат даты ввода: ГГГГ-ММ-ДД").optional().nullable(),
	status: sterilizerEquipmentStatusSchema.default("active"),
	notes: z.string().trim().max(500).optional().nullable(),
});
export type CreateSterilizerEquipmentDto = z.input<typeof createSterilizerEquipmentDtoSchema>;

export const updateSterilizerEquipmentDtoSchema = createSterilizerEquipmentDtoSchema.partial().extend({
	action: z.enum(["put_in_maintenance", "return_to_service", "decommission", "recommission", "update_verification"]).optional(),
	decommissioningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
	decommissionReason: z.string().max(300).optional().nullable(),
});
export type UpdateSterilizerEquipmentDto = z.input<typeof updateSterilizerEquipmentDtoSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// STERILIZATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export class SanPiNSterilizationEngine {
	static computeMinimumPsoSampleSize(batchCount: number): number {
		const count = Math.max(1, Math.floor(Number(batchCount) || 1));
		return Math.max(3, Math.ceil(count * 0.01));
	}

	static evaluatePsoCleaningBatch(
		batchCount: number,
		testedCount: number,
		isAzopyramNegative: boolean,
		isPhenolphthaleinNegative: boolean,
	): {
		isBatchApproved: boolean;
		minSampleRequired: number;
		samplingSatisfied: boolean;
		rejectionReason: string | null;
	} {
		return SanPiNRegulatoryEngine.evaluatePsoSampling(
			batchCount,
			testedCount,
			isAzopyramNegative,
			isPhenolphthaleinNegative,
		);
	}

	static validateAutoclaveCycle(params: {
		cycleMode: "B" | "dry_heat_180" | string;
		temperatureCelsius: number;
		pressureBar?: number;
		durationMin: number;
		passedIndicator: boolean;
	}): {
		isValid: boolean;
		status: "passed" | "failed";
		reasons: string[];
	} {
		const reasons: string[] = [];
		let isValid = true;

		if (params.cycleMode === "B") {
			if (params.temperatureCelsius < 134.0) {
				isValid = false;
				reasons.push("Температура ниже допустимой нормы 134°C");
			}
			if ((params.pressureBar ?? 0) < 2.05) {
				isValid = false;
				reasons.push("Недостаточное давление пара (менее 2.05 бар)");
			}
		} else if (params.cycleMode === "dry_heat_180") {
			if (params.temperatureCelsius < 180.0) {
				isValid = false;
				reasons.push("Температура сухожара ниже 180°C");
			}
		}

		if (!params.passedIndicator) {
			isValid = false;
			reasons.push("Химический индикатор не сработал");
		}

		return {
			isValid,
			status: isValid ? "passed" : "failed",
			reasons,
		};
	}

	static generateSterilizationBarcode(params: {
		cycleId: string;
		trayCode: string;
		expiryDate: Date | string;
	}): string {
		const cleanCycle = params.cycleId.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
		const cleanTray = params.trayCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
		const dateObj =
			typeof params.expiryDate === "string"
				? new Date(params.expiryDate)
				: params.expiryDate;
		const year = dateObj.getUTCFullYear();
		const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
		const day = String(dateObj.getUTCDate()).padStart(2, "0");
		const dateStr = `${year}${month}${day}`;

		return `DNT-STER-${cleanCycle}-${cleanTray}-${dateStr}`;
	}
}
