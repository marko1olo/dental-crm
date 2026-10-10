import { z } from "zod";
import {
	type BactericidalDeviceType,
	type BactericidalLampStatus,
	type BactericidalOperatingMode,
	type BiohazardInjuryType,
	type CleaningApplicationMethod,
	type CleaningStatus,
	type CleaningType,
	type PsoTestTypeEnum,
	type TemperatureEquipmentType,
	type TemperatureMeasurementPeriod,
	bactericidalDeviceTypeSchema,
	bactericidalLampStatusSchema,
	bactericidalOperatingModeSchema,
	biohazardInjuryTypeSchema,
	cleaningApplicationMethodSchema,
	cleaningStatusSchema,
	cleaningTypeSchema,
	psoTestTypeEnumSchema,
	temperatureEquipmentTypeSchema,
	temperatureMeasurementPeriodSchema,
} from "./types.js";

// ─── 1. Журнал предстерилизационной очистки (ПСО, Форма № 366/у) ─────────────

export const psoCleaningLogSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	instrumentName: z.string().min(1, "Наименование инструментария обязательно"),
	testType: psoTestTypeEnumSchema.default("both"),
	batchItemCount: z.number().int().min(1, "Количество изделий в партии должно быть >= 1"),
	testedSampleCount: z.number().int().min(1, "Количество проверенных изделий должно быть >= 1"),
	isAzopyramNegative: z.boolean().default(true),
	isPhenolphthaleinNegative: z.boolean().default(true),
	isSudanNegative: z.boolean().default(true),
	isBatchApproved: z.boolean().default(true),
	detergentBrand: z.string().nullable().optional(),
	rejectionReason: z.string().nullable().optional(),
	operatorId: z.string().uuid().nullable().optional(),
	operatorName: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	timestamp: z.string(),
	createdAt: z.string(),
});
export type PsoCleaningLog = z.infer<typeof psoCleaningLogSchema>;

export const createPsoCleaningLogDtoSchema = z.object({
	instrumentName: z.string().trim().min(1, "Укажите наименование инструментария"),
	testType: psoTestTypeEnumSchema.default("both"),
	batchItemCount: z.number().int().min(1, "Объем партии должен быть не менее 1 шт."),
	testedSampleCount: z.number().int().min(1, "Количество образцов должно быть не менее 1 шт."),
	isAzopyramNegative: z.boolean().default(true),
	isPhenolphthaleinNegative: z.boolean().default(true),
	isSudanNegative: z.boolean().default(true).optional(),
	detergentBrand: z.string().trim().max(120).optional().nullable(),
	operatorId: z.string().uuid().optional().nullable(),
	notes: z.string().trim().max(500).optional().nullable(),
});
export type CreatePsoCleaningLogDto = z.input<typeof createPsoCleaningLogDtoSchema>;

// ─── 3. Бактерицидные установки и рециркуляторы ─────────────────────────────

export const bactericidalEquipmentSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	roomName: z.string().min(1, "Укажите наименование помещения"),
	roomVolumeM3: z.number().positive("Объем помещения должен быть больше 0"),
	roomAreaM2: z.number().positive("Площадь помещения должна быть больше 0").optional().nullable(),
	deviceBrand: z.string().min(1, "Укажите марку/модель облучателя"),
	serialNumber: z.string().min(1, "Укажите заводской номер"),
	deviceType: bactericidalDeviceTypeSchema.default("recirculator_closed"),
	lampType: z.string().default("TUV 15W / 30W"),
	lampCount: z.number().int().min(1).default(2),
	maxLampHours: z.number().int().min(1000).max(20000).default(8000),
	totalOperatingHours: z.number().min(0).default(0),
	lampStatus: bactericidalLampStatusSchema.default("normal"),
	remainingLampHours: z.number().default(8000),
	remainingLampPercent: z.number().min(0).max(100).default(100),
	lastLampReplacementDate: z.string().nullable().optional(),
	isCommissioned: z.boolean().default(true),
	notes: z.string().nullable().optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});
export type BactericidalEquipment = z.infer<typeof bactericidalEquipmentSchema>;

export const createBactericidalEquipmentDtoSchema = z.object({
	roomName: z.string().trim().min(1, "Наименование помещения обязательно"),
	roomVolumeM3: z.number().positive("Объем помещения должен быть > 0 м³"),
	roomAreaM2: z.number().positive().optional().nullable(),
	deviceBrand: z.string().trim().min(1, "Марка/модель облучателя обязательна"),
	serialNumber: z.string().trim().min(1, "Заводской номер обязателен"),
	deviceType: bactericidalDeviceTypeSchema.default("recirculator_closed"),
	lampType: z.string().trim().default("TUV 15W / 30W"),
	lampCount: z.number().int().min(1).max(12).default(2),
	maxLampHours: z.number().int().min(1000).max(20000).default(8000),
	totalOperatingHours: z.number().min(0).default(0),
	lastLampReplacementDate: z.string().optional().nullable(),
	isCommissioned: z.boolean().default(true),
	notes: z.string().trim().max(500).optional().nullable(),
});
export type CreateBactericidalEquipmentDto = z.input<typeof createBactericidalEquipmentDtoSchema>;

export const bactericidalLogEntrySchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	equipmentId: z.string().uuid(),
	roomName: z.string().nullable().optional(),
	deviceBrand: z.string().nullable().optional(),
	date: z.string(),
	sessionStartTime: z.string(),
	sessionEndTime: z.string(),
	durationMinutes: z.number().int().min(1),
	durationHours: z.number(),
	operatingMode: bactericidalOperatingModeSchema.default("continuous_presence"),
	cumulativeHoursAfterSession: z.number(),
	operatorId: z.string().uuid().nullable().optional(),
	operatorName: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	createdAt: z.string(),
});
export type BactericidalLogEntry = z.infer<typeof bactericidalLogEntrySchema>;

export const createBactericidalLogEntryDtoSchema = z.object({
	equipmentId: z.string().uuid("Выберите облучатель/рециркулятор"),
	date: z.string().min(10, "Укажите дату сеанса"),
	sessionStartTime: z.string().min(5, "Укажите время начала"),
	sessionEndTime: z.string().min(5, "Укажите время окончания"),
	durationMinutes: z.number().int().min(1, "Длительность сеанса должна быть >= 1 мин"),
	operatingMode: bactericidalOperatingModeSchema.default("continuous_presence"),
	operatorId: z.string().uuid().optional().nullable(),
	notes: z.string().trim().max(500).optional().nullable(),
});
export type CreateBactericidalLogEntryDto = z.input<typeof createBactericidalLogEntryDtoSchema>;

// ─── 4. Журнал генеральных уборок и текущей дезинфекции ──────────────────────

export const generalCleaningLogSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	cleaningType: cleaningTypeSchema.default("general"),
	scheduledDate: z.string(),
	actualDateTime: z.string(),
	roomName: z.string().min(1),
	treatedAreaM2: z.number().positive(),
	disinfectantName: z.string().min(1),
	activeIngredient: z.string().nullable().optional(),
	solutionConcentrationPercent: z.number().positive(),
	applicationMethod: cleaningApplicationMethodSchema.default("wiping"),
	exposureTimeMinutes: z.number().int().min(1),
	uvIrradiationMinutes: z.number().int().min(0).default(30),
	ventilationMinutes: z.number().int().min(0).default(15),
	operatorId: z.string().uuid().nullable().optional(),
	operatorName: z.string().nullable().optional(),
	inspectorId: z.string().uuid().nullable().optional(),
	inspectorName: z.string().nullable().optional(),
	status: cleaningStatusSchema.default("completed"),
	notes: z.string().nullable().optional(),
	createdAt: z.string(),
});
export type GeneralCleaningLog = z.infer<typeof generalCleaningLogSchema>;

export const createGeneralCleaningLogDtoSchema = z.object({
	cleaningType: cleaningTypeSchema.default("general"),
	scheduledDate: z.string().min(10, "Укажите плановую дату"),
	actualDateTime: z.string().min(10, "Укажите фактическую дату проведения"),
	roomName: z.string().trim().min(1, "Укажите наименование помещения"),
	treatedAreaM2: z.number().positive("Площадь обработки должна быть > 0 м²"),
	disinfectantName: z.string().trim().min(1, "Укажите торговое название дезсредства"),
	activeIngredient: z.string().trim().max(160).optional().nullable(),
	solutionConcentrationPercent: z.number().positive("Концентрация раствора должна быть > 0%"),
	applicationMethod: cleaningApplicationMethodSchema.default("wiping"),
	exposureTimeMinutes: z.number().int().min(1, "Время экспозиции должно быть >= 1 мин"),
	uvIrradiationMinutes: z.number().int().min(0).default(30),
	ventilationMinutes: z.number().int().min(0).default(15),
	operatorId: z.string().uuid().optional().nullable(),
	inspectorId: z.string().uuid().optional().nullable(),
	status: cleaningStatusSchema.default("completed"),
	notes: z.string().trim().max(500).optional().nullable(),
});
export type CreateGeneralCleaningLogDto = z.input<typeof createGeneralCleaningLogDtoSchema>;

// ─── 6. Журнал аварийных ситуаций (Аптечка «Анти-ВИЧ» / Постконтакт) ─────────

export const emergencyBiohazardLogSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	incidentDateTime: z.string(),
	victimStaffId: z.string().uuid().nullable().optional(),
	victimFullName: z.string().min(1),
	victimRole: z.string().min(1),
	patientId: z.string().uuid().nullable().optional(),
	patientFullName: z.string().nullable().optional(),
	patientCardNumber: z.string().nullable().optional(),
	patientInfectiousStatus: z.string().nullable().optional(),
	injuryType: biohazardInjuryTypeSchema.default("needle_stick"),
	circumstances: z.string().min(1),
	firstAidMeasures: z.string().min(1),
	antiHivKitUsed: z.boolean().default(true),
	bloodSampledForTesting: z.boolean().default(true),
	arvProphylaxisRecommended: z.boolean().default(false),
	arvProphylaxisStartedWithin72h: z.boolean().default(false),
	arvDrugsPrescribed: z.string().nullable().optional(),
	chiefPhysicianNotified: z.boolean().default(true),
	actSanPiNNumber: z.string().nullable().optional(),
	responsibleDoctorId: z.string().uuid().nullable().optional(),
	responsibleDoctorName: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	createdAt: z.string(),
});
export type EmergencyBiohazardLog = z.infer<typeof emergencyBiohazardLogSchema>;

export const createEmergencyBiohazardLogDtoSchema = z.object({
	incidentDateTime: z.string().min(10, "Укажите точную дату и время аварии"),
	victimStaffId: z.string().uuid().optional().nullable(),
	victimFullName: z.string().trim().min(1, "Укажите ФИО пострадавшего сотрудника"),
	victimRole: z.string().trim().min(1, "Укажите должность пострадавшего"),
	patientId: z.string().uuid().optional().nullable(),
	patientFullName: z.string().trim().optional().nullable(),
	patientCardNumber: z.string().trim().optional().nullable(),
	patientInfectiousStatus: z.string().trim().max(200).optional().nullable(),
	injuryType: biohazardInjuryTypeSchema.default("needle_stick"),
	circumstances: z.string().trim().min(1, "Опишите обстоятельства аварии и проводимую манипуляцию"),
	firstAidMeasures: z.string().trim().min(1, "Опишите принятые меры первой помощи из аптечки «Анти-ВИЧ»"),
	antiHivKitUsed: z.boolean().default(true),
	bloodSampledForTesting: z.boolean().default(true),
	arvProphylaxisRecommended: z.boolean().default(false),
	arvProphylaxisStartedWithin72h: z.boolean().default(false),
	arvDrugsPrescribed: z.string().trim().max(300).optional().nullable(),
	chiefPhysicianNotified: z.boolean().default(true),
	actSanPiNNumber: z.string().trim().max(100).optional().nullable(),
	responsibleDoctorId: z.string().uuid().optional().nullable(),
	notes: z.string().trim().max(500).optional().nullable(),
});
export type CreateEmergencyBiohazardLogDto = z.input<typeof createEmergencyBiohazardLogDtoSchema>;

// ─── 7. Журнал температурного режима и влажности (Приказ 706н) ─────────────────

export const temperatureHumidityEquipmentSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	equipmentType: temperatureEquipmentTypeSchema.default("refrigerator_cold"),
	name: z.string().min(1),
	location: z.string().min(1),
	meterDeviceName: z.string().min(1),
	meterSerialNumber: z.string().nullable().optional(),
	verificationExpiryDate: z.string().nullable().optional(),
	targetTempMinCelsius: z.number().default(2.0),
	targetTempMaxCelsius: z.number().default(8.0),
	targetHumidityMinPercent: z.number().nullable().optional(),
	targetHumidityMaxPercent: z.number().nullable().optional(),
	isActive: z.boolean().default(true),
	createdAt: z.string(),
	updatedAt: z.string(),
});
export type TemperatureHumidityEquipment = z.infer<typeof temperatureHumidityEquipmentSchema>;

export const createTemperatureHumidityEquipmentDtoSchema = z.object({
	equipmentType: temperatureEquipmentTypeSchema.default("refrigerator_cold"),
	name: z.string().trim().min(1, "Укажите название объекта (холодильник / комната)"),
	location: z.string().trim().min(1, "Укажите место установки / кабинет"),
	meterDeviceName: z.string().trim().min(1, "Укажите марку термометра/гигрометра"),
	meterSerialNumber: z.string().trim().max(80).optional().nullable(),
	verificationExpiryDate: z.string().optional().nullable(),
	targetTempMinCelsius: z.number(),
	targetTempMaxCelsius: z.number(),
	targetHumidityMinPercent: z.number().min(0).max(100).optional().nullable(),
	targetHumidityMaxPercent: z.number().min(0).max(100).optional().nullable(),
	isActive: z.boolean().default(true),
});
export type CreateTemperatureHumidityEquipmentDto = z.input<typeof createTemperatureHumidityEquipmentDtoSchema>;

export const temperatureHumidityLogSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	equipmentId: z.string().uuid(),
	equipmentName: z.string().nullable().optional(),
	equipmentType: temperatureEquipmentTypeSchema.nullable().optional(),
	measurementDate: z.string(),
	measurementPeriod: temperatureMeasurementPeriodSchema.default("morning"),
	temperatureCelsius: z.number(),
	relativeHumidityPercent: z.number().nullable().optional(),
	isWithinNorm: z.boolean().default(true),
	deviationReason: z.string().nullable().optional(),
	correctiveAction: z.string().nullable().optional(),
	operatorId: z.string().uuid().nullable().optional(),
	operatorName: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	createdAt: z.string(),
});
export type TemperatureHumidityLog = z.infer<typeof temperatureHumidityLogSchema>;

export const createTemperatureHumidityLogDtoSchema = z.object({
	equipmentId: z.string().uuid("Выберите объект контроля"),
	measurementDate: z.string().min(10, "Укажите дату измерения"),
	measurementPeriod: temperatureMeasurementPeriodSchema.default("morning"),
	temperatureCelsius: z.number(),
	relativeHumidityPercent: z.number().min(0).max(100).optional().nullable(),
	deviationReason: z.string().trim().max(300).optional().nullable(),
	correctiveAction: z.string().trim().max(300).optional().nullable(),
	operatorId: z.string().uuid().optional().nullable(),
	notes: z.string().trim().max(500).optional().nullable(),
});
export type CreateTemperatureHumidityLogDto = z.input<typeof createTemperatureHumidityLogDtoSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// REGULATORY CALCULATION & VERIFICATION ENGINE (SanPiNEngine)
// ─────────────────────────────────────────────────────────────────────────────

export class SanPiNRegulatoryEngine {
	/**
	 * 1. Проверка выборки ПСО по СанПиН 3.3686-21:
	 * Минимальная выборка — 1% от партии, но не менее 3-5 единиц каждого наименования.
	 */
	static evaluatePsoSampling(
		batchCount: number,
		testedCount: number,
		isAzopyramNegative: boolean,
		isPhenolphthaleinNegative: boolean,
		isSudanNegative: boolean = true,
	): {
		isBatchApproved: boolean;
		minSampleRequired: number;
		samplingSatisfied: boolean;
		rejectionReason: string | null;
	} {
		const minSampleRequired = Math.max(3, Math.ceil(batchCount * 0.01));
		const samplingSatisfied = testedCount >= minSampleRequired;

		if (!samplingSatisfied) {
			return {
				isBatchApproved: false,
				minSampleRequired,
				samplingSatisfied: false,
				rejectionReason: `Недостаточный объем выборки ПСО: проверено ${testedCount} шт. из минимум ${minSampleRequired} шт. (требование 1% партии по СанПиН 3.3686-21).`,
			};
		}
		if (!isAzopyramNegative) {
			return {
				isBatchApproved: false,
				minSampleRequired,
				samplingSatisfied: true,
				rejectionReason:
					"Положительная азопирамовая проба (обнаружен гемоглобин / скрытая кровь). Вся партия подлежит повторной дезинфекции и ПСО.",
			};
		}
		if (!isPhenolphthaleinNegative) {
			return {
				isBatchApproved: false,
				minSampleRequired,
				samplingSatisfied: true,
				rejectionReason:
					"Положительная фенолфталеиновая проба (остатки щелочных компонентов моющих средств). Вся партия подлежит повторному ополаскиванию дистиллированной водой.",
			};
		}
		if (!isSudanNegative) {
			return {
				isBatchApproved: false,
				minSampleRequired,
				samplingSatisfied: true,
				rejectionReason:
					"Положительная проба с Суданом III (обнаружены остаточные жировые и масляные загрязнения наконечников). Вся партия подлежит обезжириванию и повторной ПСО.",
			};
		}

		return {
			isBatchApproved: true,
			minSampleRequired,
			samplingSatisfied: true,
			rejectionReason: null,
		};
	}

	/**
	 * 2. Расчет наработки ламп рециркуляторов и бактерицидных облучателей (Р 3.5.1904-04):
	 * При наработке >90% формируется предупреждение, при >100% — критический алерт замены.
	 */
	static calculateLampLife(
		totalOperatingHours: number,
		maxLampHours: number = 8000,
	): {
		remainingHours: number;
		remainingPercent: number;
		status: BactericidalLampStatus;
		isCritical: boolean;
		warningMessage: string | null;
	} {
		const remainingHours = Math.max(0, maxLampHours - totalOperatingHours);
		const remainingPercent = Number(
			Math.max(0, Math.min(100, (remainingHours / maxLampHours) * 100)).toFixed(1),
		);

		if (totalOperatingHours >= maxLampHours) {
			return {
				remainingHours: 0,
				remainingPercent: 0,
				status: "expired_replace_now",
				isCritical: true,
				warningMessage: `РЕСУРС БАКТЕРИЦИДНЫХ ЛАМП ИСЧЕРПАН (${totalOperatingHours}/${maxLampHours} ч). Эксплуатация облучателя запрещена СанПиН: эффективность УФ-дезинфекции снижена до нуля. Необходима срочная замена ламп!`,
			};
		}

		if (totalOperatingHours >= maxLampHours * 0.9) {
			return {
				remainingHours,
				remainingPercent,
				status: "warning_replace_soon",
				isCritical: false,
				warningMessage: `Выработано ${totalOperatingHours} ч из ${maxLampHours} ч (${remainingPercent}% остатка). Запланируйте закупку и замену бактерицидных ламп.`,
			};
		}

		return {
			remainingHours,
			remainingPercent,
			status: "normal",
			isCritical: false,
			warningMessage: null,
		};
	}

	/**
	 * 3. Контроль температурного режима и влажности (Приказ 706н / 646н):
	 */
	static evaluateTemperatureHumidity(params: {
		equipmentType: TemperatureEquipmentType;
		targetTempMin: number;
		targetTempMax: number;
		actualTemp: number;
		targetHumidityMin?: number | null;
		targetHumidityMax?: number | null;
		actualHumidity?: number | null;
	}): {
		isWithinNorm: boolean;
		tempViolation: boolean;
		humidityViolation: boolean;
		deviationMessage: string | null;
		requiresEmergencyTransfer: boolean;
	} {
		const {
			targetTempMin,
			targetTempMax,
			actualTemp,
			targetHumidityMin,
			targetHumidityMax,
			actualHumidity,
		} = params;

		const tempViolation = actualTemp < targetTempMin || actualTemp > targetTempMax;
		let humidityViolation = false;

		if (
			actualHumidity !== undefined &&
			actualHumidity !== null &&
			targetHumidityMin !== undefined &&
			targetHumidityMin !== null &&
			targetHumidityMax !== undefined &&
			targetHumidityMax !== null
		) {
			humidityViolation =
				actualHumidity < targetHumidityMin || actualHumidity > targetHumidityMax;
		}

		const isWithinNorm = !tempViolation && !humidityViolation;

		if (isWithinNorm) {
			return {
				isWithinNorm: true,
				tempViolation: false,
				humidityViolation: false,
				deviationMessage: null,
				requiresEmergencyTransfer: false,
			};
		}

		const messages: string[] = [];
		if (tempViolation) {
			messages.push(
				`Температура ${actualTemp}°C вне допустимого диапазона [${targetTempMin}°C .. ${targetTempMax}°C]`,
			);
		}
		if (humidityViolation && actualHumidity !== null && actualHumidity !== undefined) {
			messages.push(
				`Влажность ${actualHumidity}% вне нормы [${targetHumidityMin}% .. ${targetHumidityMax}%]`,
			);
		}

		const requiresEmergencyTransfer =
			tempViolation && (actualTemp > targetTempMax + 3.0 || actualTemp < targetTempMin - 2.0);

		return {
			isWithinNorm: false,
			tempViolation,
			humidityViolation,
			deviationMessage: messages.join("; "),
			requiresEmergencyTransfer,
		};
	}

	/**
	 * 4. Контроль протокола аварийной ситуации («Анти-ВИЧ» / Постконтактная профилактика):
	 */
	static evaluateBiohazardEmergencyProtocol(input: {
		antiHivKitUsed: boolean;
		bloodSampled: boolean;
		arvRecommended: boolean;
		arvStartedWithin72h: boolean;
		chiefPhysicianNotified: boolean;
	}): {
		isProtocolCompliant: boolean;
		missingSteps: string[];
		urgencyMessage: string;
	} {
		const missingSteps: string[] = [];

		if (!input.antiHivKitUsed) {
			missingSteps.push("Не зафиксирована обработка раны/слизистых препаратами аптечки «Анти-ВИЧ» (70% спирт, 5% йод, обильное мытье)");
		}
		if (!input.bloodSampled) {
			missingSteps.push("Не проведен забор сыворотки крови пострадавшего сотрудника и пациента на маркеры ВИЧ, HBsAg, Anti-HCV");
		}
		if (!input.chiefPhysicianNotified) {
			missingSteps.push("Не уведомлен главный врач / председатель врачебной комиссии по ИСМП");
		}
		if (input.arvRecommended && !input.arvStartedWithin72h) {
			missingSteps.push("КРИТИЧЕСКИЙ РИСК: АРВ-профилактика показана, но не начата в «золотое окно» 72 часов!");
		}

		const isProtocolCompliant = missingSteps.length === 0;
		const urgencyMessage = !isProtocolCompliant
			? `Нарушение СанПиН 3.3686-21: ${missingSteps.join(". ")}.`
			: "Протокол постконтактной профилактики полностью соблюден.";

		return {
			isProtocolCompliant,
			missingSteps,
			urgencyMessage,
		};
	}
}
