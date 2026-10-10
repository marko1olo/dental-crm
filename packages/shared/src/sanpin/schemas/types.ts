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

// ─── 1. Журнал предстерилизационной очистки (ПСО, Форма № 366/у) enums ──────

export const psoTestTypeEnumSchema = z.enum([
	"azopyram",
	"phenolphthalein",
	"both",
	"sudan_iii",
	"all",
]);
export type PsoTestTypeEnum = z.infer<typeof psoTestTypeEnumSchema>;

// ─── 2. Журнал контроля работы стерилизаторов (Форма № 257/у) enums ─────────

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

// ─── 2.1. Парк стерилизаторов и автоклавов enums & presets ─────────────────

export const sterilizerDeviceClassSchema = z.enum([
	"autoclave_class_b",
	"autoclave_class_s",
	"autoclave_class_n",
	"dry_heat_air",
	"plasma",
]);
export type SterilizerDeviceClass = z.infer<typeof sterilizerDeviceClassSchema>;

export const sterilizerEquipmentStatusSchema = z.enum([
	"active",
	"in_maintenance",
	"decommissioned",
]);
export type SterilizerEquipmentStatus = z.infer<typeof sterilizerEquipmentStatusSchema>;

export interface PopularSterilizerBrandPreset {
	readonly id: string;
	readonly brandModel: string;
	readonly manufacturerRu: string;
	readonly deviceType: SterilizationDeviceType;
	readonly deviceClass: SterilizerDeviceClass;
	readonly chamberVolumeLiters: number;
	readonly descriptionRu: string;
	readonly recommendedNameRu: string;
}

export const POPULAR_STERILIZER_BRAND_PRESETS: readonly PopularSterilizerBrandPreset[] = [
	{
		id: "melag_vacuklav_23b",
		brandModel: "Melag Vacuklav 23 B+",
		manufacturerRu: "MELAG Medizintechnik (Германия)",
		deviceType: "autoclave_steam",
		deviceClass: "autoclave_class_b",
		chamberVolumeLiters: 22,
		descriptionRu: "Автоклав B-класса с глубоким фракционированным вакуумом (22 л)",
		recommendedNameRu: "Автоклав Melag Vacuklav 23 B+ (№1)",
	},
	{
		id: "melag_vacuklav_43b",
		brandModel: "Melag Vacuklav 43 B+ Evolution",
		manufacturerRu: "MELAG Medizintechnik (Германия)",
		deviceType: "autoclave_steam",
		deviceClass: "autoclave_class_b",
		chamberVolumeLiters: 22,
		descriptionRu: "Скоростной B-автоклав с технологией DRYtelligence и двойной камерой",
		recommendedNameRu: "Автоклав Melag Vacuklav 43 B+ Evolution (№2)",
	},
	{
		id: "euronda_e9_next",
		brandModel: "Euronda E9 Next",
		manufacturerRu: "Euronda S.p.A. (Италия)",
		deviceType: "autoclave_steam",
		deviceClass: "autoclave_class_b",
		chamberVolumeLiters: 24,
		descriptionRu: "Интеллектуальный B-автоклав со встроенным термопринтером (24 л)",
		recommendedNameRu: "Автоклав Euronda E9 Next (№1)",
	},
	{
		id: "euronda_e10",
		brandModel: "Euronda E10",
		manufacturerRu: "Euronda S.p.A. (Италия)",
		deviceType: "autoclave_steam",
		deviceClass: "autoclave_class_b",
		chamberVolumeLiters: 24,
		descriptionRu: "Флагманский B-автоклав с сенсорным экраном E-Touch и Wi-Fi (24 л)",
		recommendedNameRu: "Автоклав Euronda E10 (№2)",
	},
	{
		id: "dentsply_dac_universal",
		brandModel: "Dentsply Sirona DAC Universal S",
		manufacturerRu: "Dentsply Sirona (Германия)",
		deviceType: "autoclave_steam",
		deviceClass: "autoclave_class_s",
		chamberVolumeLiters: 6,
		descriptionRu: "Комбинированный автоклав для промывки, смазки и стерилизации 6 наконечников",
		recommendedNameRu: "Автоклав наконечников DAC Universal S",
	},
	{
		id: "dryheat_gp10",
		brandModel: "ГП-10 СПУ",
		manufacturerRu: "ОАО «Смоленское СКТБ СПУ» (Россия)",
		deviceType: "dry_heat",
		deviceClass: "dry_heat_air",
		chamberVolumeLiters: 10,
		descriptionRu: "Компактный воздушный сухожаровой стерилизатор 180°C (10 л) для боров и инструментов",
		recommendedNameRu: "Сухожаровой шкаф ГП-10 СПУ",
	},
	{
		id: "dryheat_gp20",
		brandModel: "ГП-20 СПУ",
		manufacturerRu: "ОАО «Смоленское СКТБ СПУ» (Россия)",
		deviceType: "dry_heat",
		deviceClass: "dry_heat_air",
		chamberVolumeLiters: 20,
		descriptionRu: "Воздушный сухожаровой стерилизатор 180°C (20 л) для боров и цельнометаллических инструментов",
		recommendedNameRu: "Сухожаровой шкаф ГП-20 СПУ",
	},
	{
		id: "dryheat_gp40",
		brandModel: "ГП-40 СПУ",
		manufacturerRu: "ОАО «Смоленское СКТБ СПУ» (Россия)",
		deviceType: "dry_heat",
		deviceClass: "dry_heat_air",
		chamberVolumeLiters: 40,
		descriptionRu: "Вместительный сухожаровой шкаф 180°C (40 л) для централизованной стерилизации лотков",
		recommendedNameRu: "Сухожаровой шкаф ГП-40 СПУ",
	},
	{
		id: "dgm_and_20",
		brandModel: "DGM AND-20",
		manufacturerRu: "DGM Pharma-Apparate Handel AG (Швейцария)",
		deviceType: "autoclave_steam",
		deviceClass: "autoclave_class_b",
		chamberVolumeLiters: 20,
		descriptionRu: "Надежный автоклав B-класса для стоматологических лотков и пакетов",
		recommendedNameRu: "Автоклав DGM AND-20",
	},
	{
		id: "dgm_and_24",
		brandModel: "DGM AND-24",
		manufacturerRu: "DGM Pharma-Apparate Handel AG (Швейцария)",
		deviceType: "autoclave_steam",
		deviceClass: "autoclave_class_b",
		chamberVolumeLiters: 24,
		descriptionRu: "Вместительный автоклав B-класса (24 л) для стерилизационной ЦСО",
		recommendedNameRu: "Автоклав DGM AND-24",
	},
	{
		id: "wh_lisa_500",
		brandModel: "W&H Lisa 500",
		manufacturerRu: "W&H Dentalwerk (Австрия)",
		deviceType: "autoclave_steam",
		deviceClass: "autoclave_class_b",
		chamberVolumeLiters: 22,
		descriptionRu: "B-автоклав с системой оптимизации расхода воды Eco Dry",
		recommendedNameRu: "Автоклав W&H Lisa 500",
	},
	{
		id: "tau_clave_3000",
		brandModel: "Tau Clave 3000",
		manufacturerRu: "Tau Steril (Италия)",
		deviceType: "dry_heat",
		deviceClass: "dry_heat_air",
		chamberVolumeLiters: 17,
		descriptionRu: "Сухожаровой шкаф 180°C для щипцов и элеваторов",
		recommendedNameRu: "Сухожар Tau Clave 3000",
	},
];

// ─── 3. Бактерицидные установки и рециркуляторы enums ───────────────────────

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

// ─── 4. Генеральные уборки и текущая дезинфекция enums ──────────────────────

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

// ─── 5. Медицинские отходы классов А, Б, В, Г enums ──────────────────────────

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

// ─── 6. Аварийные ситуации (Аптечка «Анти-ВИЧ») enums ────────────────────────

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

// ─── 7. Температурный режим и влажность enums ────────────────────────────────

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
