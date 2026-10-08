/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION & PSO QUALITY CONTROL: TYPES & STATUTORY PRESETS
 * (Layer 0: Pure domain types, statutory presets, and regulatory constants)
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. REGULATORY CONSTANTS & SANPIN PRESETS
// ─────────────────────────────────────────────────────────────────────────────

export const SANPIN_REGULATORY_META = {
	standardRu: "СанПиН 3.3686-21",
	standardTitleRu: "Санитарно-эпидемиологические требования по профилактике инфекционных болезней (Раздел IV)",
	form257TitleRu: "Форма № 257/у — Журнал работы стерилизаторов воздушного, парового (автоклава)",
	form366TitleRu: "Форма № 366/у — Журнал учета качества предстерилизационной очистки (ПСО)",
	guidelinePsoRu: "МУ 287-113 по дезинфекции, предстерилизационной очистке и стерилизации изделий медицинского назначения",
} as const;

export type SterilizerDeviceClass = "autoclave_class_b" | "autoclave_class_s" | "autoclave_class_n" | "dry_heat_air";

export interface SterilizerPreset {
	readonly id: string;
	readonly code: string;
	readonly brandModel: string;
	readonly deviceClass: SterilizerDeviceClass;
	readonly deviceClassLabelRu: string;
	readonly serialNumber: string;
	readonly chamberVolumeLiters: number;
	readonly locationRoomRu: string;
	readonly defaultRegimeId: SterilizationRegimeCode;
}

export const STATUTORY_STERILIZERS: readonly SterilizerPreset[] = [
	{
		id: "autoclave-melag-vacuklav-23b",
		code: "АК-01",
		brandModel: "Melag Vacuklav 23 B+ (Класс B)",
		deviceClass: "autoclave_class_b",
		deviceClassLabelRu: "Автоклав B-класса (фракционированный вакуум)",
		serialNumber: "MEL-2024-88412",
		chamberVolumeLiters: 22,
		locationRoomRu: "ЦСО (Стерилизационная)",
		defaultRegimeId: "steam_134_5min",
	},
	{
		id: "autoclave-euronda-e9-med",
		code: "АК-02",
		brandModel: "Euronda E9 Next Med (Класс B)",
		deviceClass: "autoclave_class_b",
		deviceClassLabelRu: "Автоклав B-класса (вакуумная сушка)",
		serialNumber: "EUR-E9-55102",
		chamberVolumeLiters: 24,
		locationRoomRu: "ЦСО (Стерилизационная)",
		defaultRegimeId: "steam_134_20min_prion",
	},
	{
		id: "autoclave-dac-universal",
		code: "АК-03",
		brandModel: "Dentsply Sirona DAC Universal S",
		deviceClass: "autoclave_class_s",
		deviceClassLabelRu: "Автоклав для стоматологических наконечников (Класс S)",
		serialNumber: "DAC-S-9014",
		chamberVolumeLiters: 6,
		locationRoomRu: "Кабинет № 1 (Терапия)",
		defaultRegimeId: "steam_134_5min",
	},
	{
		id: "dryheat-gpk-gp20",
		code: "СХ-01",
		brandModel: "ГП-20 СПУ (Сухожаровой шкаф)",
		deviceClass: "dry_heat_air",
		deviceClassLabelRu: "Воздушный стерилизатор (Сухожар)",
		serialNumber: "SPU-20-4109",
		chamberVolumeLiters: 20,
		locationRoomRu: "ЦСО (Стерилизационная)",
		defaultRegimeId: "dry_heat_180_60min",
	},
];

export type SterilizationRegimeCode =
	| "steam_134_5min"
	| "steam_134_20min_prion"
	| "steam_121_20min"
	| "dry_heat_180_60min"
	| "dry_heat_160_150min";

export interface SterilizationRegimeMeta {
	readonly id: SterilizationRegimeCode;
	readonly nameRu: string;
	readonly methodType: "steam" | "dry_heat";
	readonly targetTemperatureCelsius: number;
	readonly targetPressureBar: number;
	readonly exposureMinutes: number;
	readonly minTemperatureCelsius: number;
	readonly maxTemperatureCelsius: number;
	readonly minPressureBar: number;
	readonly maxPressureBar: number;
	readonly minExposureMinutes: number;
	readonly recommendedForRu: string;
	readonly clauseRu: string;
}

export const STATUTORY_REGIMES: readonly SterilizationRegimeMeta[] = [
	{
		id: "steam_134_5min",
		nameRu: "Паровой 134°C / 5 мин (2.05–2.20 бар) — Скоростной B-класс",
		methodType: "steam",
		targetTemperatureCelsius: 134.0,
		targetPressureBar: 2.15,
		exposureMinutes: 5.0,
		minTemperatureCelsius: 134.0,
		maxTemperatureCelsius: 138.0,
		minPressureBar: 2.05,
		maxPressureBar: 2.30,
		minExposureMinutes: 5.0,
		recommendedForRu: "Стоматологический инструментарий, турбинные и микромоторные наконечники, крафт-пакеты",
		clauseRu: "СанПиН 3.3686-21 Таблица 3.13 / Режим I",
	},
	{
		id: "steam_134_20min_prion",
		nameRu: "Паровой 134°C / 20 мин (2.05–2.20 бар) — Хирургический / Прионный",
		methodType: "steam",
		targetTemperatureCelsius: 134.0,
		targetPressureBar: 2.15,
		exposureMinutes: 20.0,
		minTemperatureCelsius: 134.0,
		maxTemperatureCelsius: 138.0,
		minPressureBar: 2.05,
		maxPressureBar: 2.30,
		minExposureMinutes: 20.0,
		recommendedForRu: "Хирургические и имплантологические наборы, костные распаторы, сложные кассеты и биксы",
		clauseRu: "СанПиН 3.3686-21 п. 3624 / Режим I усиленный",
	},
	{
		id: "steam_121_20min",
		nameRu: "Паровой 121°C / 20 мин (1.10–1.25 бар) — Щадящий (термолабильные)",
		methodType: "steam",
		targetTemperatureCelsius: 121.0,
		targetPressureBar: 1.15,
		exposureMinutes: 20.0,
		minTemperatureCelsius: 120.0,
		maxTemperatureCelsius: 125.0,
		minPressureBar: 1.05,
		maxPressureBar: 1.30,
		minExposureMinutes: 20.0,
		recommendedForRu: "Изделия из полимеров, резины, силиконовые слепочные ложки, оптоволоконные световоды",
		clauseRu: "СанПиН 3.3686-21 Таблица 3.13 / Режим II",
	},
	{
		id: "dry_heat_180_60min",
		nameRu: "Воздушный 180°C / 60 мин (0 бар) — Сухожаровой шкаф",
		methodType: "dry_heat",
		targetTemperatureCelsius: 180.0,
		targetPressureBar: 0.0,
		exposureMinutes: 60.0,
		minTemperatureCelsius: 180.0,
		maxTemperatureCelsius: 186.0,
		minPressureBar: 0.0,
		maxPressureBar: 0.0,
		minExposureMinutes: 60.0,
		recommendedForRu: "Цельнометаллические боры, штопферы, элеваторы, шпатели без оптики и резиновых колец",
		clauseRu: "СанПиН 3.3686-21 п. 3626",
	},
	{
		id: "dry_heat_160_150min",
		nameRu: "Воздушный 160°C / 150 мин (0 бар) — Длительный щадящий сухожар",
		methodType: "dry_heat",
		targetTemperatureCelsius: 160.0,
		targetPressureBar: 0.0,
		exposureMinutes: 150.0,
		minTemperatureCelsius: 160.0,
		maxTemperatureCelsius: 165.0,
		minPressureBar: 0.0,
		maxPressureBar: 0.0,
		minExposureMinutes: 150.0,
		recommendedForRu: "Металлические инструменты, чувствительные к перегреву выше 170°C",
		clauseRu: "СанПиН 3.3686-21 п. 3626 (Режим II)",
	},
];

export type ChemicalIndicatorClassId =
	| "class4_multivariable"
	| "class5_integrating"
	| "class6_emulating"
	| "bowie_dick_test"
	| "helix_pcd_test";

export interface ChemicalIndicatorPreset {
	readonly id: string;
	readonly tradeNameRu: string;
	readonly indicatorClass: ChemicalIndicatorClassId;
	readonly indicatorClassLabelRu: string;
	readonly targetRegimeId: SterilizationRegimeCode;
	readonly initialColorRu: string;
	readonly finalColorRu: string;
	readonly manufacturerRu: string;
}

export const STATUTORY_CHEMICAL_INDICATORS: readonly ChemicalIndicatorPreset[] = [
	{
		id: "intetest-v-134-5",
		tradeNameRu: "Интетест-В-134/5 (Внутренний)",
		indicatorClass: "class5_integrating",
		indicatorClassLabelRu: "Класс 5 (Интегрирующий индикатор)",
		targetRegimeId: "steam_134_5min",
		initialColorRu: "Желтый / Бежевый",
		finalColorRu: "Темно-коричневый / Черный (эталон)",
		manufacturerRu: "ООО «Винар» (Россия)",
	},
	{
		id: "steritest-v-134-20",
		tradeNameRu: "Стеритест-В-134/20 (Многопеременный)",
		indicatorClass: "class4_multivariable",
		indicatorClassLabelRu: "Класс 4 (Многопеременный индикатор)",
		targetRegimeId: "steam_134_20min_prion",
		initialColorRu: "Светло-голубой",
		finalColorRu: "Темно-синий / Фиолетовый",
		manufacturerRu: "ООО «Винар» (Россия)",
	},
	{
		id: "steritest-v-121-20",
		tradeNameRu: "Стеритест-В-121/20 (Многопеременный)",
		indicatorClass: "class4_multivariable",
		indicatorClassLabelRu: "Класс 4 (Многопеременный индикатор)",
		targetRegimeId: "steam_121_20min",
		initialColorRu: "Оранжевый",
		finalColorRu: "Темно-коричневый",
		manufacturerRu: "ООО «Винар» (Россия)",
	},
	{
		id: "medis-v-180-60",
		tradeNameRu: "МедИС-В-180/60 (Для сухожаровых шкафов)",
		indicatorClass: "class4_multivariable",
		indicatorClassLabelRu: "Класс 4 (Воздушная стерилизация)",
		targetRegimeId: "dry_heat_180_60min",
		initialColorRu: "Синий",
		finalColorRu: "Коричневый (цвет эталона)",
		manufacturerRu: "ООО «Медтест» (Россия)",
	},
	{
		id: "comply-3m-1243",
		tradeNameRu: "3M™ Comply™ 1243 (Химический интегратор)",
		indicatorClass: "class5_integrating",
		indicatorClassLabelRu: "Класс 5 (Интегратор перемещающегося фронта)",
		targetRegimeId: "steam_134_5min",
		initialColorRu: "Полоса в зоне REJECT",
		finalColorRu: "Фронт вошел в зону ACCEPT",
		manufacturerRu: "3M Health Care (USA)",
	},
];

export interface ChamberControlPoint {
	readonly pointIndex: 1 | 2 | 3 | 4 | 5;
	readonly code: string;
	readonly labelRu: string;
	readonly locationRu: string;
	readonly indicatorPassed: boolean;
	readonly indicatorColorObservedRu: string;
}

export const DEFAULT_CHAMBER_POINTS_TEMPLATE: readonly {
	readonly pointIndex: 1 | 2 | 3 | 4 | 5;
	readonly code: string;
	readonly labelRu: string;
	readonly locationRu: string;
}[] = [
	{
		pointIndex: 1,
		code: "КТ-1",
		labelRu: "Верхний передний правый угол",
		locationRu: "Верхняя полка у дверцы камеры",
	},
	{
		pointIndex: 2,
		code: "КТ-2",
		labelRu: "Нижний задний левый угол",
		locationRu: "Нижняя полка у задней стенки (критическая зона прогрева)",
	},
	{
		pointIndex: 3,
		code: "КТ-3",
		labelRu: "Геометрический центр камеры",
		locationRu: "Центральная полка в толще стерилизуемой загрузки",
	},
	{
		pointIndex: 4,
		code: "КТ-4",
		labelRu: "Зона выхода конденсата / дренаж",
		locationRu: "Нижняя точка камеры у сливного фильтра",
	},
	{
		pointIndex: 5,
		code: "КТ-5",
		labelRu: "Верхняя задняя зона",
		locationRu: "Верхняя полка у датчика температуры камеры",
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. KRAFT PACKAGING & STERILITY RETENTION PERIODS
// ─────────────────────────────────────────────────────────────────────────────

export type KraftPackagingType =
	| "kraft_heat_sealed"
	| "kraft_self_adhesive"
	| "laminated_heat_sealed"
	| "crepe_paper_double"
	| "bix_filter_kspf"
	| "unpacked";

export interface KraftPackagingMeta {
	readonly id: KraftPackagingType;
	readonly nameRu: string;
	readonly statutoryShelfLifeDays: number;
	readonly sealingMethodRu: string;
	readonly descriptionRu: string;
	readonly standardClauseRu: string;
}

export const STATUTORY_PACKAGING_TYPES: Record<KraftPackagingType, KraftPackagingMeta> = {
	kraft_heat_sealed: {
		id: "kraft_heat_sealed",
		nameRu: "Крафт-пакет бумажный (термосварка швом >= 8 мм)",
		statutoryShelfLifeDays: 50,
		sealingMethodRu: "Термосварочный аппарат (импульсный запайщик)",
		descriptionRu: "Пакеты из крафт-бумаги плотностью 70 г/м², запечатанные термоклеевым швом",
		standardClauseRu: "СанПиН 3.3686-21 п. 3632 (до 50 суток в одинарном пакете)",
	},
	kraft_self_adhesive: {
		id: "kraft_self_adhesive",
		nameRu: "Крафт-пакет бумажный (самоклеящийся клапан)",
		statutoryShelfLifeDays: 30,
		sealingMethodRu: "Клеевая полоса с защитным лайнером",
		descriptionRu: "Пакеты с липким клапаном (Клинпак, Медтест, DGM Steriguard)",
		standardClauseRu: "СанПиН 3.3686-21 п. 3632 (до 30 суток с самоклеящейся лентой)",
	},
	laminated_heat_sealed: {
		id: "laminated_heat_sealed",
		nameRu: "Комбинированный рулон/пакет пленка/бумага (термосварка)",
		statutoryShelfLifeDays: 180,
		sealingMethodRu: "Термосварочный аппарат с контролем температуры",
		descriptionRu: "Прозрачная многослойная полимерная пленка + медицинская бумага",
		standardClauseRu: "СанПиН 3.3686-21 п. 3632 (до 180 суток при одинарном шве, до 1 года при двойном)",
	},
	crepe_paper_double: {
		id: "crepe_paper_double",
		nameRu: "Крепированная бумага (двойная упаковка)",
		statutoryShelfLifeDays: 30,
		sealingMethodRu: "Складывание конвертом + индикаторная лента",
		descriptionRu: "Листовая крепированная бумага медицинского назначения",
		standardClauseRu: "СанПиН 3.3686-21 п. 3632 (21-30 суток)",
	},
	bix_filter_kspf: {
		id: "bix_filter_kspf",
		nameRu: "Стерилизационная коробка с антибактериальным фильтром (КСПФ)",
		statutoryShelfLifeDays: 20,
		sealingMethodRu: "Замки бикса + хлопчатобумажные / бумажные фильтры",
		descriptionRu: "Металлические биксы с многоразовыми фильтрами",
		standardClauseRu: "СанПиН 3.3686-21 п. 3632 (до 20 суток)",
	},
	unpacked: {
		id: "unpacked",
		nameRu: "Без упаковки (на открытом стерильном лотке)",
		statutoryShelfLifeDays: 0,
		sealingMethodRu: "Без запечатывания",
		descriptionRu: "Использование непосредственно после извлечения из стерилизатора (до 6 ч на стерильном столе)",
		standardClauseRu: "СанПиН 3.3686-21 п. 3634 (непосредственно перед операцией)",
	},
};

export interface StandardTrayPreset {
	readonly id: string;
	readonly category: "therapy" | "surgery" | "orthopedics" | "endodontics" | "hygiene" | "handpieces";
	readonly nameRu: string;
	readonly descriptionRu: string;
	readonly itemsIncluded: readonly string[];
	readonly defaultPackaging: KraftPackagingType;
	readonly defaultRegimeId: SterilizationRegimeCode;
	readonly avgBatchItems: number;
	readonly isCriticalOrSurgical: boolean;
}

export const STATUTORY_TRAY_SETS: readonly StandardTrayPreset[] = [
	{
		id: "tray_therapy_basic",
		category: "therapy",
		nameRu: "Терапевтический смотровой набор",
		descriptionRu: "Зеркало стоматологическое, зонд угловой, пинцет анатомический, гладилка-штопфер",
		itemsIncluded: ["Зеркало стоматологическое", "Зонд угловой", "Пинцет анатомический", "Гладилка-штопфер"],
		defaultPackaging: "kraft_heat_sealed",
		defaultRegimeId: "steam_134_5min",
		avgBatchItems: 120,
		isCriticalOrSurgical: false,
	},
	{
		id: "tray_handpieces_rotary",
		category: "handpieces",
		nameRu: "Турбинные и микромоторные наконечники",
		descriptionRu: "Наконечники турбинные NSK Ti-Max, микромоторные угловые, насадки для сервисной смазки",
		itemsIncluded: ["Наконечник турбинный Ti-Max X600L", "Наконечник микромоторный угловой", "Ключ ротора"],
		defaultPackaging: "kraft_heat_sealed",
		defaultRegimeId: "steam_134_5min",
		avgBatchItems: 24,
		isCriticalOrSurgical: false,
	},
	{
		id: "tray_surgery_implant",
		category: "surgery",
		nameRu: "Хирургический имплантологический набор",
		descriptionRu: "Элеваторы Бейна, щипцы экстракционные, костные распаторы Лукаса, хирургический шовный сет",
		itemsIncluded: ["Элеватор прямой", "Элеватор штыковидный", "Распатор костный", "Кюрета Лукаса", "Ножницы хирургические"],
		defaultPackaging: "laminated_heat_sealed",
		defaultRegimeId: "steam_134_20min_prion",
		avgBatchItems: 45,
		isCriticalOrSurgical: true,
	},
	{
		id: "tray_orthopedics_impressions",
		category: "orthopedics",
		nameRu: "Ортопедический набор и слепочные ложки",
		descriptionRu: "Металлические слепочные ложки, ретракторы OptraGate, ключи динамометрические",
		itemsIncluded: ["Ложки металлические слепочные", "Ретракторы OptraGate", "Ключ динамометрический"],
		defaultPackaging: "kraft_self_adhesive",
		defaultRegimeId: "steam_121_20min",
		avgBatchItems: 35,
		isCriticalOrSurgical: false,
	},
	{
		id: "tray_endodontics_files",
		category: "endodontics",
		nameRu: "Эндодонтический кассетный бокс",
		descriptionRu: "NiTi К-файлы №15-40, спредеры, плаггеры вертикальные, эндодонтическая линейка",
		itemsIncluded: ["NiTi К-файлы №15-40", "Спредер пальцевой", "Плаггер вертикальный", "Эндо-линейка"],
		defaultPackaging: "kraft_heat_sealed",
		defaultRegimeId: "steam_134_5min",
		avgBatchItems: 60,
		isCriticalOrSurgical: false,
	},
	{
		id: "tray_hygiene_periodontal",
		category: "hygiene",
		nameRu: "Пародонтологический набор кюрет",
		descriptionRu: "Кюреты Грейси 1/2, 7/8, 11/12, 13/14, ультразвуковые насадки EMS, ключ динамометрический",
		itemsIncluded: ["Кюреты Грейси 1/2, 7/8, 11/12, 13/14", "Насадки УЗ-скалера EMS", "Динамометрический ключ"],
		defaultPackaging: "kraft_heat_sealed",
		defaultRegimeId: "steam_134_5min",
		avgBatchItems: 40,
		isCriticalOrSurgical: false,
	},
];

export type SterilityStatus = "sterile_valid" | "expiring_soon_7d" | "expired" | "recalled";

export interface SterilityCalculation {
	readonly packDateFormatted: string;
	readonly expDateFormatted: string;
	readonly expDateIso: string;
	readonly daysLifespan: number;
	readonly daysRemaining: number;
	readonly status: SterilityStatus;
	readonly isExpired: boolean;
	readonly isExpiringSoon: boolean;
	readonly humanReadableRemainingRu: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DATA STRUCTURES FOR FORM 257/U, FORM 366/U & AUTO-GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export interface Form257CycleRecord {
	readonly id: string;
	readonly date: string; // YYYY-MM-DD
	readonly time: string; // HH:mm
	readonly cycleNumber: number;
	readonly sterilizerId: string;
	readonly sterilizerCode: string;
	readonly sterilizerBrandModel: string;
	readonly regimeId: SterilizationRegimeCode;
	readonly regimeNameRu: string;
	readonly itemsDescriptionRu: string;
	readonly packsCount: number;
	readonly packagingType: KraftPackagingType;
	readonly actualTemperatureCelsius: number;
	readonly actualPressureBar: number;
	readonly actualExposureMinutes: number;
	readonly indicatorClass: ChemicalIndicatorClassId;
	readonly indicatorTradeNameRu: string;
	readonly chamberPoints: readonly ChamberControlPoint[];
	readonly areAllIndicatorsPassed: boolean;
	readonly cycleStatus: "passed" | "failed";
	readonly failureReasons: readonly string[];
	readonly operatorFullName: string;
	readonly operatorPosition: string;
	readonly electronicSignatureHash: string;
	readonly notes?: string;
	readonly createdAt: string;
}

export interface PsoTestRecord {
	readonly id: string;
	readonly date: string; // YYYY-MM-DD
	readonly time: string; // HH:mm
	readonly instrumentName: string;
	readonly batchItemCount: number;
	readonly testedSampleCount: number;
	readonly minSampleRequired: number;
	readonly isSamplingSufficient: boolean;
	readonly isAzopyramNegative: boolean;
	readonly isPhenolphthaleinNegative: boolean;
	readonly isSudanNegative: boolean;
	readonly detergentBrand: string;
	readonly isBatchApproved: boolean;
	readonly rejectionReason: string | null;
	readonly operatorFullName: string;
	readonly operatorPosition: string;
	readonly electronicSignatureHash: string;
	readonly notes?: string;
	readonly createdAt: string;
}

export interface KraftPackageItem {
	readonly id: string;
	readonly barcode: string;
	readonly batchNumber: string;
	readonly packageSerialNumber: number;
	readonly toolSetNameRu: string;
	readonly itemsIncluded: readonly string[];
	readonly packagingType: KraftPackagingType;
	readonly packagingNameRu: string;
	readonly sterilizerCode: string;
	readonly cycleNumber: number;
	readonly packDate: string; // YYYY-MM-DD
	readonly expDate: string; // YYYY-MM-DD
	readonly daysLifespan: number;
	readonly daysRemaining: number;
	readonly status: SterilityStatus;
	readonly operatorFullName: string;
	readonly indicatorVerified: boolean;
	readonly notes?: string;
	readonly createdAt: string;
}

export interface ClinicRequisites {
	readonly clinicName: string;
	readonly legalEntity: string;
	readonly licenseNumber: string;
	readonly address: string;
	readonly chiefDoctorFullName: string;
	readonly seniorNurseFullName: string;
}

export const DEFAULT_CLINIC_REQUISITES: ClinicRequisites = {
	clinicName: "Стоматологическая клиника «ДЕНТЕ»",
	legalEntity: "ООО «ДЕНТЕ КЛИНИК»",
	licenseNumber: "ЛО41-01137-77/00368412 от 14.10.2021",
	address: "г. Москва, ул. Профсоюзная, д. 45",
	chiefDoctorFullName: "Главный врач",
	seniorNurseFullName: "Главная медсестра",
};

export interface MonthlySanpinGenerationOptions {
	readonly year: number; // e.g. 2026
	readonly month: number; // 1-12
	readonly clinicInfo?: ClinicRequisites;
	readonly primaryOperatorFullName?: string;
	readonly secondaryOperatorFullName?: string;
	readonly includeSaturdays?: boolean;
	readonly includeSundays?: boolean;
	readonly dailyPatientLoadLevel?: "standard" | "high" | "moderate";
}

export interface MonthlySanpinJournalBundle {
	readonly year: number;
	readonly month: number;
	readonly monthFormattedRu: string;
	readonly workingDaysCount: number;
	readonly totalCyclesCount: number;
	readonly totalPsoTestsCount: number;
	readonly totalPacksCount: number;
	readonly cycles: readonly Form257CycleRecord[];
	readonly psoRecords: readonly PsoTestRecord[];
	readonly kraftPackages: readonly KraftPackageItem[];
	readonly clinicInfo: ClinicRequisites;
	readonly csv257: string;
	readonly csv366: string;
	readonly printHtml257: string;
	readonly printHtml366: string;
	readonly combinedDossierHtml: string;
}

export interface DailyShiftSanpinLogBundle {
	readonly date: string;
	readonly shiftNumber: number;
	readonly operatorFullName: string;
	readonly operatorPosition: string;
	readonly electronicSignatureHash: string;
	readonly cycles: readonly Form257CycleRecord[];
	readonly psoRecords: readonly PsoTestRecord[];
	readonly kraftPackages: readonly KraftPackageItem[];
	readonly summaryTextRu: string;
}
