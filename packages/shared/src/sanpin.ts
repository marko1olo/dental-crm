import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// SanPiN 3.3686-21 & 2.1.3684-21 REGULATORY CONSTANTS & TYPES
// ─────────────────────────────────────────────────────────────────────────────

export const SANPIN_REGULATORY_AUTHORITIES = {
	sanpin33686_21: {
		title: "СанПиН 3.3686-21",
		fullName:
			"Санитарно-эпидемиологические требования по профилактике инфекционных болезней",
		issuedBy: "Главный государственный санитарный врач РФ",
	},
	sanpin213684_21: {
		title: "СанПиН 2.1.3684-21",
		fullName:
			"Санитарно-эпидемиологические требования к обращению с медицинскими отходами",
		issuedBy: "Главный государственный санитарный врач РФ",
	},
	order706n: {
		title: "Приказ Минздравсоцразвития РФ № 706н",
		fullName: "Об утверждении Правил хранения лекарственных средств",
		issuedBy: "Минздравсоцразвития РФ",
	},
	order646n: {
		title: "Приказ Минздрава РФ № 646н",
		fullName:
			"Об утверждении Правил надлежащей практики хранения и перевозки лекарственных препаратов для медицинского применения",
		issuedBy: "Минздрав РФ",
	},
	guideline1904_04: {
		title: "Руководство Р 3.5.1904-04",
		fullName:
			"Использование ультрафиолетового бактерицидного излучения для обеззараживания воздуха в помещениях",
		issuedBy: "Минздрав России",
	},
} as const;

// ─── 1. Журнал предстерилизационной очистки (ПСО, Форма № 366/у) ─────────────

export const psoTestTypeEnumSchema = z.enum([
	"azopyram",
	"phenolphthalein",
	"both",
]);
export type PsoTestTypeEnum = z.infer<typeof psoTestTypeEnumSchema>;

export const psoCleaningLogSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	instrumentName: z.string().min(1, "Наименование инструментария обязательно"),
	testType: psoTestTypeEnumSchema.default("both"),
	batchItemCount: z.number().int().min(1, "Количество изделий в партии должно быть >= 1"),
	testedSampleCount: z.number().int().min(1, "Количество проверенных изделий должно быть >= 1"),
	isAzopyramNegative: z.boolean().default(true),
	isPhenolphthaleinNegative: z.boolean().default(true),
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
	detergentBrand: z.string().trim().max(120).optional().nullable(),
	operatorId: z.string().uuid().optional().nullable(),
	notes: z.string().trim().max(500).optional().nullable(),
});
export type CreatePsoCleaningLogDto = z.input<typeof createPsoCleaningLogDtoSchema>;

// ─── 2. Журнал контроля работы стерилизаторов (Форма № 257/у) ─────────────────

export const sterilizationDeviceTypeSchema = z.enum([
	"autoclave_steam",
	"dry_heat",
	"plasma",
	"gas_eo",
]);
export type SterilizationDeviceType = z.infer<typeof sterilizationDeviceTypeSchema>;

export const sterilizerPackagingTypeSchema = z.enum([
	"kraft_heat_sealed",
	"kraft_self_adhesive",
	"laminated_heat_sealed",
	"metal_cassette",
	"bix_filter",
	"unpacked",
]);
export type SterilizerPackagingType = z.infer<typeof sterilizerPackagingTypeSchema>;

export const sterilizerIndicatorClassSchema = z.enum([
	"class4_multivariable",
	"class5_integrating",
	"class6_emulating",
	"biological",
	"bowie_dick",
	"helix",
]);
export type SterilizerIndicatorClass = z.infer<typeof sterilizerIndicatorClassSchema>;

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

// ─── 3. Журнал работы бактерицидных облучателей и рециркуляторов ──────────────

export const bactericidalDeviceTypeSchema = z.enum([
	"recirculator_closed",
	"irradiator_open",
	"combined",
]);
export type BactericidalDeviceType = z.infer<typeof bactericidalDeviceTypeSchema>;

export const bactericidalLampStatusSchema = z.enum([
	"normal",
	"warning_replace_soon",
	"expired_replace_now",
]);
export type BactericidalLampStatus = z.infer<typeof bactericidalLampStatusSchema>;

export const bactericidalOperatingModeSchema = z.enum([
	"continuous_presence",
	"intermittent",
	"pre_op_preparation",
	"post_cleaning",
]);
export type BactericidalOperatingMode = z.infer<typeof bactericidalOperatingModeSchema>;

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

export const cleaningTypeSchema = z.enum(["general", "current_routine"]);
export type CleaningType = z.infer<typeof cleaningTypeSchema>;

export const cleaningApplicationMethodSchema = z.enum([
	"wiping",
	"spraying",
	"immersion",
	"combined",
]);
export type CleaningApplicationMethod = z.infer<typeof cleaningApplicationMethodSchema>;

export const cleaningStatusSchema = z.enum([
	"completed",
	"verified_by_inspector",
	"rescheduled",
]);
export type CleaningStatus = z.infer<typeof cleaningStatusSchema>;

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

// ─── 5. Журнал медицинских отходов классов А, Б, В, Г (СанПиН 2.1.3684-21) ────

export const medicalWasteClassSchema = z.enum([
	"class_A",
	"class_B",
	"class_V",
	"class_G",
]);
export type MedicalWasteClass = z.infer<typeof medicalWasteClassSchema>;

export const medicalWasteOperationTypeSchema = z.enum([
	"accumulation",
	"disinfection_on_site",
	"transfer_to_disposal_company",
]);
export type MedicalWasteOperationType = z.infer<typeof medicalWasteOperationTypeSchema>;

export const medicalWastePackageTypeSchema = z.enum([
	"white_bag",
	"yellow_bag",
	"yellow_sharps_container",
	"red_bag",
	"hazard_g_container",
]);
export type MedicalWastePackageType = z.infer<typeof medicalWastePackageTypeSchema>;

export const medicalWasteDisinfectionMethodSchema = z.enum([
	"chemical_soaking",
	"steam_autoclave",
	"microwave",
	"none_centralized",
]);
export type MedicalWasteDisinfectionMethod = z.infer<typeof medicalWasteDisinfectionMethodSchema>;

export const medicalWasteLogSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	operationType: medicalWasteOperationTypeSchema.default("accumulation"),
	logDate: z.string(),
	wasteClass: medicalWasteClassSchema.default("class_B"),
	wasteDescription: z.string().min(1),
	packageType: medicalWastePackageTypeSchema.default("yellow_bag"),
	packageCount: z.number().int().min(1).default(1),
	weightKg: z.number().positive(),
	volumeLiters: z.number().positive().nullable().optional(),
	disinfectionMethod: medicalWasteDisinfectionMethodSchema.default("chemical_soaking"),
	disinfectantUsed: z.string().nullable().optional(),
	disposalCompany: z.string().nullable().optional(),
	contractNumber: z.string().nullable().optional(),
	transferActNumber: z.string().nullable().optional(),
	responsibleStaffId: z.string().uuid().nullable().optional(),
	responsibleStaffName: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	createdAt: z.string(),
});
export type MedicalWasteLog = z.infer<typeof medicalWasteLogSchema>;

export const createMedicalWasteLogDtoSchema = z.object({
	operationType: medicalWasteOperationTypeSchema.default("accumulation"),
	logDate: z.string().min(10, "Укажите дату"),
	wasteClass: medicalWasteClassSchema.default("class_B"),
	wasteDescription: z.string().trim().min(1, "Укажите описание состава отходов"),
	packageType: medicalWastePackageTypeSchema.default("yellow_bag"),
	packageCount: z.number().int().min(1).default(1),
	weightKg: z.number().positive("Масса отходов должна быть > 0 кг"),
	volumeLiters: z.number().positive().optional().nullable(),
	disinfectionMethod: medicalWasteDisinfectionMethodSchema.default("chemical_soaking"),
	disinfectantUsed: z.string().trim().max(160).optional().nullable(),
	disposalCompany: z.string().trim().max(200).optional().nullable(),
	contractNumber: z.string().trim().max(100).optional().nullable(),
	transferActNumber: z.string().trim().max(100).optional().nullable(),
	responsibleStaffId: z.string().uuid().optional().nullable(),
	notes: z.string().trim().max(500).optional().nullable(),
});
export type CreateMedicalWasteLogDto = z.input<typeof createMedicalWasteLogDtoSchema>;

// ─── 6. Журнал аварийных ситуаций (Аптечка «Анти-ВИЧ» / Постконтакт) ─────────

export const biohazardInjuryTypeSchema = z.enum([
	"needle_stick",
	"bur_cut",
	"scalpel_cut",
	"splash_skin_intact",
	"splash_skin_damaged",
	"splash_mucosa_eye",
	"splash_mucosa_mouth",
	"other",
]);
export type BiohazardInjuryType = z.infer<typeof biohazardInjuryTypeSchema>;

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

export const temperatureEquipmentTypeSchema = z.enum([
	"storage_room",
	"medicine_cabinet",
	"refrigerator_cold",
	"refrigerator_cool",
	"freezer",
]);
export type TemperatureEquipmentType = z.infer<typeof temperatureEquipmentTypeSchema>;

export const temperatureMeasurementPeriodSchema = z.enum(["morning", "evening"]);
export type TemperatureMeasurementPeriod = z.infer<typeof temperatureMeasurementPeriodSchema>;

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

