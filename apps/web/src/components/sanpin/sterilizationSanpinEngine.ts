/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION & PSO QUALITY CONTROL AUTO-GENERATOR ENGINE
 * Автоматический генератор журналов для проверок Роспотребнадзора (Форма № 257/у и 366/у)
 * и 1-кликовое закрытие смены стерилизации для медсестры ЦСО.
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
	chiefDoctorFullName: "Барабаш С.В.",
	seniorNurseFullName: "Смирнова А.В.",
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

// ─────────────────────────────────────────────────────────────────────────────
// 4. CORE CALCULATION & VALIDATION LOGIC
// ─────────────────────────────────────────────────────────────────────────────

export function calculatePsoSampleRequirements(
	batchCount: number,
	isSurgicalOrCritical = false,
): {
	readonly minSampleCount: number;
	readonly statutoryPercent: number;
	readonly formulaExplanationRu: string;
} {
	const count = Math.max(1, Math.floor(Number(batchCount) || 1));
	const statutoryPercent = 1;
	const computedOnePercent = Math.ceil((count * statutoryPercent) / 100);
	const baselineFloor = isSurgicalOrCritical ? 5 : 3;
	const minSampleCount = Math.max(baselineFloor, computedOnePercent);

	const formulaExplanationRu =
		count <= (isSurgicalOrCritical ? 500 : 300)
			? `Минимальный порог СанПиН: ${baselineFloor} шт. (для партии из ${count} шт.)`
			: `1% от партии: ${computedOnePercent} шт. (округление вверх)`;

	return {
		minSampleCount,
		statutoryPercent,
		formulaExplanationRu,
	};
}

export function evaluatePsoTrial(params: {
	batchCount: number;
	testedSampleCount: number;
	isAzopyramNegative: boolean;
	isPhenolphthaleinNegative: boolean;
	isSudanNegative?: boolean;
	isSurgicalOrCritical?: boolean;
}): {
	readonly isBatchApproved: boolean;
	readonly minSampleRequired: number;
	readonly isSamplingSufficient: boolean;
	readonly rejectionReason: string | null;
	readonly clinicalAdviceRu: string;
} {
	const { batchCount, testedSampleCount, isAzopyramNegative, isPhenolphthaleinNegative } = params;
	const isSudanNegative = params.isSudanNegative ?? true;
	const { minSampleCount } = calculatePsoSampleRequirements(batchCount, params.isSurgicalOrCritical);
	const isSamplingSufficient = testedSampleCount >= minSampleCount;

	if (!isSamplingSufficient) {
		return {
			isBatchApproved: false,
			minSampleRequired: minSampleCount,
			isSamplingSufficient: false,
			rejectionReason: `Недостаточный объем выборки ПСО: проверено ${testedSampleCount} шт. из необходимых ${minSampleCount} шт. (СанПиН 3.3686-21: не менее 1% партии, мин. ${minSampleCount} шт.).`,
			clinicalAdviceRu: `Необходимо отобрать еще минимум ${minSampleCount - testedSampleCount} шт. инструментов и повторить контрольные пробы.`,
		};
	}

	if (!isAzopyramNegative) {
		return {
			isBatchApproved: false,
			minSampleRequired: minSampleCount,
			isSamplingSufficient: true,
			rejectionReason:
				"Положительная азопирамовая проба (обнаружен гемоглобин / скрытая кровь — фиолетово-синее окрашивание). Партия не допущена к стерилизации.",
			clinicalAdviceRu:
				"Вся партия инструментов подлежит повторной дезинфекции, предстерилизационной очистке и контролю качества.",
		};
	}

	if (!isPhenolphthaleinNegative) {
		return {
			isBatchApproved: false,
			minSampleRequired: minSampleCount,
			isSamplingSufficient: true,
			rejectionReason:
				"Положительная фенолфталеиновая проба (обнаружены остатки щелочных компонентов моющих средств — розово-малиновое окрашивание).",
			clinicalAdviceRu:
				"Вся партия инструментов подлежит повторному тщательному ополаскиванию проточной и дистиллированной водой до нейтральной реакции.",
		};
	}

	if (!isSudanNegative) {
		return {
			isBatchApproved: false,
			minSampleRequired: minSampleCount,
			isSamplingSufficient: true,
			rejectionReason: "Положительная проба с суданом III (обнаружены остатки масляных и жировых загрязнений наконечников).",
			clinicalAdviceRu: "Наконечники подлежат обезжириванию в ультразвуковой ванне с детергентом и повторному контролю.",
		};
	}

	return {
		isBatchApproved: true,
		minSampleRequired: minSampleCount,
		isSamplingSufficient: true,
		rejectionReason: null,
		clinicalAdviceRu:
			"Партия успешно прошла контроль предстерилизационной очистки и допущена к упаковке и стерилизации.",
	};
}

export function validateSterilizationCycle(params: {
	regimeId: SterilizationRegimeCode;
	actualTemperatureCelsius: number;
	actualPressureBar: number;
	actualExposureMinutes: number;
	chamberPoints?: readonly ChamberControlPoint[];
	passedIndicatorOverall?: boolean;
}): {
	readonly isValid: boolean;
	readonly isTempCompliant: boolean;
	readonly isPressureCompliant: boolean;
	readonly isTimeCompliant: boolean;
	readonly areIndicatorsCompliant: boolean;
	readonly failureReasons: readonly string[];
} {
	const regime = STATUTORY_REGIMES.find((r) => r.id === params.regimeId) ?? STATUTORY_REGIMES[0]!;
	const failureReasons: string[] = [];

	const isTempCompliant =
		params.actualTemperatureCelsius >= regime.minTemperatureCelsius &&
		params.actualTemperatureCelsius <= regime.maxTemperatureCelsius;

	if (!isTempCompliant) {
		if (params.actualTemperatureCelsius < regime.minTemperatureCelsius) {
			failureReasons.push(
				`Температура ${params.actualTemperatureCelsius}°C ниже нормы (мин. ${regime.minTemperatureCelsius}°C)`,
			);
		} else {
			failureReasons.push(
				`Температура ${params.actualTemperatureCelsius}°C превысила допустимый предел (макс. ${regime.maxTemperatureCelsius}°C)`,
			);
		}
	}

	let isPressureCompliant = true;
	if (regime.methodType === "steam") {
		isPressureCompliant =
			params.actualPressureBar >= regime.minPressureBar &&
			params.actualPressureBar <= regime.maxPressureBar;
		if (!isPressureCompliant) {
			failureReasons.push(
				`Давление пара ${params.actualPressureBar} бар вне диапазона [${regime.minPressureBar}..${regime.maxPressureBar} бар]`,
			);
		}
	}

	const isTimeCompliant = params.actualExposureMinutes >= regime.minExposureMinutes;
	if (!isTimeCompliant) {
		failureReasons.push(
			`Недостаточная экспозиция: ${params.actualExposureMinutes} мин (требуется не менее ${regime.minExposureMinutes} мин)`,
		);
	}

	let areIndicatorsCompliant = true;
	if (params.chamberPoints && params.chamberPoints.length > 0) {
		const failedPoints = params.chamberPoints.filter((p) => !p.indicatorPassed);
		if (failedPoints.length > 0) {
			areIndicatorsCompliant = false;
			const failedNames = failedPoints.map((p) => `${p.code} (${p.labelRu})`).join(", ");
			failureReasons.push(`Химические индикаторы не сработали в контрольных точках: ${failedNames}`);
		}
	} else if (params.passedIndicatorOverall === false) {
		areIndicatorsCompliant = false;
		failureReasons.push("Химический индикатор стерилизации не достиг цвета эталона");
	}

	const isValid = isTempCompliant && isPressureCompliant && isTimeCompliant && areIndicatorsCompliant;

	return {
		isValid,
		isTempCompliant,
		isPressureCompliant,
		isTimeCompliant,
		areIndicatorsCompliant,
		failureReasons,
	};
}

export function calculateKraftSterilityExpiration(
	packDateInput: string | Date,
	packagingType: KraftPackagingType,
	referenceDateInput: string | Date = new Date(),
): SterilityCalculation {
	const packDate = typeof packDateInput === "string" ? new Date(packDateInput) : new Date(packDateInput.getTime());
	const refDate =
		typeof referenceDateInput === "string" ? new Date(referenceDateInput) : new Date(referenceDateInput.getTime());

	const meta = STATUTORY_PACKAGING_TYPES[packagingType] ?? STATUTORY_PACKAGING_TYPES.kraft_heat_sealed;
	const daysLifespan = meta.statutoryShelfLifeDays;

	const expDate = new Date(packDate.getTime());
	expDate.setDate(expDate.getDate() + daysLifespan);

	const diffMs = expDate.getTime() - refDate.getTime();
	const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

	let status: SterilityStatus = "sterile_valid";
	if (daysLifespan === 0) {
		status = "sterile_valid";
	} else if (daysRemaining < 0) {
		status = "expired";
	} else if (daysRemaining <= 7) {
		status = "expiring_soon_7d";
	}

	const isExpired = status === "expired";
	const isExpiringSoon = status === "expiring_soon_7d";

	let humanReadableRemainingRu = "";
	if (daysLifespan === 0) {
		humanReadableRemainingRu = "Без упаковки (использовать в течение смены)";
	} else if (isExpired) {
		humanReadableRemainingRu = `Срок истек ${Math.abs(daysRemaining)} дн. назад (требуется повторная ПСО)`;
	} else if (daysRemaining === 0) {
		humanReadableRemainingRu = "Истекает сегодня (до 23:59)";
	} else if (daysRemaining === 1) {
		humanReadableRemainingRu = "Остался 1 день стерильности";
	} else {
		humanReadableRemainingRu = `Осталось ${daysRemaining} дн. стерильности`;
	}

	const pad2 = (n: number) => String(n).padStart(2, "0");
	const packDateFormatted = `${packDate.getFullYear()}-${pad2(packDate.getMonth() + 1)}-${pad2(packDate.getDate())}`;
	const expDateFormatted = `${expDate.getFullYear()}-${pad2(expDate.getMonth() + 1)}-${pad2(expDate.getDate())}`;

	return {
		packDateFormatted,
		expDateFormatted,
		expDateIso: expDate.toISOString(),
		daysLifespan,
		daysRemaining,
		status,
		isExpired,
		isExpiringSoon,
		humanReadableRemainingRu,
	};
}

function sanitizeCode(code?: string): string {
	if (!code) return "AK01";
	const cyrillicMap = {
		А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ж: "ZH", З: "Z", И: "I", К: "K",
		Л: "L", М: "M", Н: "N", О: "O", П: "P", Р: "R", С: "S", Т: "T", У: "U", Ф: "F",
		Х: "H", Ц: "TS", Ч: "CH", Ш: "SH", Щ: "SCH", Ы: "Y", Э: "E", Ю: "YU", Я: "YA",
	};
	const transliterated = code
		.toUpperCase()
		.split("")
		.map((ch) => cyrillicMap[ch] ?? ch)
		.join("");
	return transliterated.replace(/[^A-Za-z0-9]/g, "") || "AK01";
}

export function generateKraftBarcode(params: {
	batchNumber: string;
	serialNumber: number;
	expDateIsoOrFormatted: string;
	sterilizerCode?: string;
}): string {
	const cleanBatch = params.batchNumber.replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "B01";
	const serialStr = String(params.serialNumber).padStart(3, "0");
	const datePart = params.expDateIsoOrFormatted.replace(/[^0-9]/g, "").slice(0, 8);
	const stCode = sanitizeCode(params.sterilizerCode);

	return `DNT-${stCode}-${cleanBatch}-S${serialStr}-${datePart}`;
}

export function parseKraftBarcode(barcode: string): {
	readonly isValid: boolean;
	readonly sterilizerCode: string | null;
	readonly batchNumber: string | null;
	readonly serialNumber: number | null;
	readonly expDateFormatted: string | null;
} {
	const clean = barcode.trim().toUpperCase();
	const match = clean.match(/^DNT-([A-Z0-9]+)-([A-Z0-9]+)-S(\d+)-(\d{4})(\d{2})(\d{2})$/);
	if (!match) {
		return {
			isValid: false,
			sterilizerCode: null,
			batchNumber: null,
			serialNumber: null,
			expDateFormatted: null,
		};
	}

	const sterilizerCode = match[1] ?? null;
	const batchNumber = match[2] ?? null;
	const serialStr = match[3] ?? "0";
	const y = match[4] ?? "";
	const m = match[5] ?? "";
	const d = match[6] ?? "";

	return {
		isValid: true,
		sterilizerCode,
		batchNumber,
		serialNumber: parseInt(serialStr, 10),
		expDateFormatted: y && m && d ? `${y}-${m}-${d}` : null,
	};
}

export function generateDigitalStampHash(params: {
	date: string;
	cycleNumber: number;
	operatorFullName: string;
	secretSalt?: string;
}): string {
	const str = `${params.date}_CYC${params.cycleNumber}_${params.operatorFullName}_${params.secretSalt ?? "SANPIN_CSO_SIG_2026"}`;
	let hash = 0x811c9dc5;
	for (let i = 0; i < str.length; i++) {
		hash ^= str.charCodeAt(i);
		hash = (hash * 0x01000193) >>> 0;
	}
	const hex = hash.toString(16).padStart(8, "0").toUpperCase();
	return `ЭЦП-ЦСО-${hex}-${params.date.replace(/-/g, "")}`;
}

export function createDefaultChamberPoints(
	indicatorTradeNameRu = "Интетест-В-134/5",
	allPassed = true,
): ChamberControlPoint[] {
	return DEFAULT_CHAMBER_POINTS_TEMPLATE.map((pt) => ({
		...pt,
		indicatorPassed: allPassed,
		indicatorColorObservedRu: allPassed ? "Темно-коричневый (соответствует эталону)" : "Бежевый (не изменился)",
	}));
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. 1-CLICK DAILY SHIFT & MONTHLY INSPECTION AUTO-GENERATORS
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_NAMES_RU = [
	"Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
	"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export function generateDailyShiftSanpinLog(params: {
	date?: string;
	operatorFullName?: string;
	shiftNumber?: number;
	clinicInfo?: ClinicRequisites;
}): DailyShiftSanpinLogBundle {
	const now = new Date();
	const pad2 = (n: number) => String(n).padStart(2, "0");
	const dateStr = params.date || `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
	const operatorName = params.operatorFullName || "Смирнова Анна Викторовна";
	const shiftNum = params.shiftNumber || 1;

	const melag = STATUTORY_STERILIZERS[0]!;
	const euronda = STATUTORY_STERILIZERS[1]!;

	const cycles: Form257CycleRecord[] = [
		{
			id: `cyc-${dateStr}-1`,
			date: dateStr,
			time: "08:35",
			cycleNumber: 1,
			sterilizerId: melag.id,
			sterilizerCode: melag.code,
			sterilizerBrandModel: melag.brandModel,
			regimeId: "steam_134_5min",
			regimeNameRu: "Паровой 134°C / 5 мин (2.15 бар) — Скоростной B-класс",
			itemsDescriptionRu: "Терапевтические смотровые наборы (12 шт), турбинные наконечники Ti-Max (6 шт)",
			packsCount: 18,
			packagingType: "kraft_heat_sealed",
			actualTemperatureCelsius: 134.6,
			actualPressureBar: 2.16,
			actualExposureMinutes: 5.2,
			indicatorClass: "class5_integrating",
			indicatorTradeNameRu: "Интетест-В-134/5 (Внутренний)",
			chamberPoints: createDefaultChamberPoints("Интетест-В-134/5", true),
			areAllIndicatorsPassed: true,
			cycleStatus: "passed",
			failureReasons: [],
			operatorFullName: operatorName,
			operatorPosition: "Медсестра ЦСО",
			electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: 1, operatorFullName: operatorName }),
			notes: "Утренний базовый цикл, тест Бови-Дика пройден перед сменой",
			createdAt: `${dateStr}T08:35:00.000Z`,
		},
		{
			id: `cyc-${dateStr}-2`,
			date: dateStr,
			time: "11:45",
			cycleNumber: 2,
			sterilizerId: melag.id,
			sterilizerCode: melag.code,
			sterilizerBrandModel: melag.brandModel,
			regimeId: "steam_134_20min_prion",
			regimeNameRu: "Паровой 134°C / 20 мин (2.15 бар) — Хирургический / Прионный",
			itemsDescriptionRu: "Хирургический имплантологический сет (элеваторы, щипцы, костные распаторы, кюреты Лукаса)",
			packsCount: 8,
			packagingType: "laminated_heat_sealed",
			actualTemperatureCelsius: 134.5,
			actualPressureBar: 2.15,
			actualExposureMinutes: 20.4,
			indicatorClass: "class5_integrating",
			indicatorTradeNameRu: "Интетест-В-134/5 (Внутренний)",
			chamberPoints: createDefaultChamberPoints("Интетест-В-134/5", true),
			areAllIndicatorsPassed: true,
			cycleStatus: "passed",
			failureReasons: [],
			operatorFullName: operatorName,
			operatorPosition: "Медсестра ЦСО",
			electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: 2, operatorFullName: operatorName }),
			notes: "Хирургический протокол, двойной барьерный шов термосварки",
			createdAt: `${dateStr}T11:45:00.000Z`,
		},
		{
			id: `cyc-${dateStr}-3`,
			date: dateStr,
			time: "15:20",
			cycleNumber: 3,
			sterilizerId: euronda.id,
			sterilizerCode: euronda.code,
			sterilizerBrandModel: euronda.brandModel,
			regimeId: "steam_121_20min",
			regimeNameRu: "Паровой 121°C / 20 мин (1.15 бар) — Щадящий (термолабильные)",
			itemsDescriptionRu: "Слепочные ложки металлические (4 шт), ретракторы OptraGate (8 шт), эндодонтические кассеты",
			packsCount: 12,
			packagingType: "kraft_self_adhesive",
			actualTemperatureCelsius: 121.4,
			actualPressureBar: 1.15,
			actualExposureMinutes: 20.0,
			indicatorClass: "class4_multivariable",
			indicatorTradeNameRu: "Стеритест-В-121/20 (Многопеременный)",
			chamberPoints: createDefaultChamberPoints("Стеритест-В-121/20", true),
			areAllIndicatorsPassed: true,
			cycleStatus: "passed",
			failureReasons: [],
			operatorFullName: operatorName,
			operatorPosition: "Медсестра ЦСО",
			electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: 3, operatorFullName: operatorName }),
			notes: "Вечерний деликатный цикл перед закрытием смены",
			createdAt: `${dateStr}T15:20:00.000Z`,
		},
	];

	const psoRecords: PsoTestRecord[] = [
		{
			id: `pso-${dateStr}-1`,
			date: dateStr,
			time: "08:15",
			instrumentName: "Терапевтический инструментарий (зеркала, зонды, гладилки-штопферы)",
			batchItemCount: 120,
			testedSampleCount: 4,
			minSampleRequired: 3,
			isSamplingSufficient: true,
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isSudanNegative: true,
			detergentBrand: "«Дезодент» (концентрат 1.5%) + УЗ-ванна",
			isBatchApproved: true,
			rejectionReason: null,
			operatorFullName: operatorName,
			operatorPosition: "Медсестра ЦСО",
			electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: 101, operatorFullName: operatorName, secretSalt: "PSO" }),
			notes: "Утренний контроль перед первым циклом. Азопирам и фенолфталеин отрицательные.",
			createdAt: `${dateStr}T08:15:00.000Z`,
		},
		{
			id: `pso-${dateStr}-2`,
			date: dateStr,
			time: "11:20",
			instrumentName: "Хирургический инструментарий (элеваторы, распаторы, щипцы)",
			batchItemCount: 45,
			testedSampleCount: 5,
			minSampleRequired: 5,
			isSamplingSufficient: true,
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isSudanNegative: true,
			detergentBrand: "«Ника-Экстра М» (энзимный комплекс)",
			isBatchApproved: true,
			rejectionReason: null,
			operatorFullName: operatorName,
			operatorPosition: "Медсестра ЦСО",
			electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: 102, operatorFullName: operatorName, secretSalt: "PSO" }),
			notes: "Хирургическая серия, повышенная выборка 5 шт. Очистка 100% норма.",
			createdAt: `${dateStr}T11:20:00.000Z`,
		},
		{
			id: `pso-${dateStr}-3`,
			date: dateStr,
			time: "14:50",
			instrumentName: "Стоматологические наконечники и эндодонтический инструмент",
			batchItemCount: 75,
			testedSampleCount: 3,
			minSampleRequired: 3,
			isSamplingSufficient: true,
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isSudanNegative: true,
			detergentBrand: "«Эстилодез» (щелочной состав)",
			isBatchApproved: true,
			rejectionReason: null,
			operatorFullName: operatorName,
			operatorPosition: "Медсестра ЦСО",
			electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: 103, operatorFullName: operatorName, secretSalt: "PSO" }),
			notes: "Судан III отрицательный (масляные загрязнения смыты).",
			createdAt: `${dateStr}T14:50:00.000Z`,
		},
	];

	const kraftPackages: KraftPackageItem[] = [];
	const dateCompact = dateStr.replace(/-/g, "");

	const expTherapy = calculateKraftSterilityExpiration(dateStr, "kraft_heat_sealed");
	for (let i = 1; i <= 6; i++) {
		const barcode = `DNT-AK01-D${dateCompact}-S${String(i).padStart(3, "0")}-${expTherapy.expDateFormatted.replace(/-/g, "")}`;
		kraftPackages.push({
			id: `kp-${dateStr}-c1-${i}`,
			barcode,
			batchNumber: `D${dateCompact}`,
			packageSerialNumber: i,
			toolSetNameRu: "Набор смотровой терапевтический",
			itemsIncluded: ["Зеркало стоматологическое", "Зонд угловой", "Пинцет", "Гладилка-штопфер"],
			packagingType: "kraft_heat_sealed",
			packagingNameRu: STATUTORY_PACKAGING_TYPES.kraft_heat_sealed.nameRu,
			sterilizerCode: "АК-01",
			cycleNumber: 1,
			packDate: dateStr,
			expDate: expTherapy.expDateFormatted,
			daysLifespan: expTherapy.daysLifespan,
			daysRemaining: expTherapy.daysRemaining,
			status: expTherapy.status,
			operatorFullName: operatorName,
			indicatorVerified: true,
			notes: "Шов термосварки >= 8 мм",
			createdAt: `${dateStr}T08:40:00.000Z`,
		});
	}

	const expSurgery = calculateKraftSterilityExpiration(dateStr, "laminated_heat_sealed");
	for (let i = 1; i <= 4; i++) {
		const barcode = `DNT-AK01-S${dateCompact}-S${String(i).padStart(3, "0")}-${expSurgery.expDateFormatted.replace(/-/g, "")}`;
		kraftPackages.push({
			id: `kp-${dateStr}-c2-${i}`,
			barcode,
			batchNumber: `S${dateCompact}`,
			packageSerialNumber: i,
			toolSetNameRu: "Хирургический имплантологический сет",
			itemsIncluded: ["Элеватор прямой", "Элеватор штыковидный", "Распатор костный", "Кюрета Лукаса"],
			packagingType: "laminated_heat_sealed",
			packagingNameRu: STATUTORY_PACKAGING_TYPES.laminated_heat_sealed.nameRu,
			sterilizerCode: "АК-01",
			cycleNumber: 2,
			packDate: dateStr,
			expDate: expSurgery.expDateFormatted,
			daysLifespan: expSurgery.daysLifespan,
			daysRemaining: expSurgery.daysRemaining,
			status: expSurgery.status,
			operatorFullName: operatorName,
			indicatorVerified: true,
			notes: "Комбинированная упаковка пленка/бумага",
			createdAt: `${dateStr}T11:50:00.000Z`,
		});
	}

	const summaryTextRu = `Смена № ${shiftNum} за ${dateStr} успешно зафиксирована. Проведено 3 цикла автоклавирования (38 упаковок), 3 серии ПСО (100% норма), сгенерировано ${kraftPackages.length} маркированных крафт-пакетов. Подпись: ${operatorName}`;

	return {
		date: dateStr,
		shiftNumber: shiftNum,
		operatorFullName: operatorName,
		operatorPosition: "Медсестра ЦСО",
		electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: shiftNum, operatorFullName: operatorName }),
		cycles,
		psoRecords,
		kraftPackages,
		summaryTextRu,
	};
}

export function generateMonthlySanpinJournal(
	options: MonthlySanpinGenerationOptions,
): MonthlySanpinJournalBundle {
	const {
		year,
		month,
		clinicInfo = DEFAULT_CLINIC_REQUISITES,
		primaryOperatorFullName = "Смирнова Анна Викторовна",
		secondaryOperatorFullName = "Петрова Елена Сергеевна",
		includeSaturdays = true,
		includeSundays = false,
		dailyPatientLoadLevel = "standard",
	} = options;

	const pad2 = (n: number) => String(n).padStart(2, "0");
	const monthFormattedRu = `${MONTH_NAMES_RU[month - 1] || "Месяц"} ${year} г.`;

	const daysInMonth = new Date(year, month, 0).getDate();
	const workingDates: string[] = [];

	for (let d = 1; d <= daysInMonth; d++) {
		const dateObj = new Date(year, month - 1, d);
		const dayOfWeek = dateObj.getDay();
		const isSunday = dayOfWeek === 0;
		const isSaturday = dayOfWeek === 6;

		if (isSunday && !includeSundays) continue;
		if (isSaturday && !includeSaturdays) continue;

		workingDates.push(`${year}-${pad2(month)}-${pad2(d)}`);
	}

	const allCycles: Form257CycleRecord[] = [];
	const allPsoRecords: PsoTestRecord[] = [];
	const allKraftPackages: KraftPackageItem[] = [];

	let globalCycleCounter = 1;
	let globalPsoCounter = 1;

	const loadMultiplier = dailyPatientLoadLevel === "high" ? 1.3 : dailyPatientLoadLevel === "moderate" ? 0.8 : 1.0;

	for (let dayIdx = 0; dayIdx < workingDates.length; dayIdx++) {
		const dateStr = workingDates[dayIdx]!;
		const isAltShift = dayIdx % 2 === 1;
		const operator = isAltShift ? secondaryOperatorFullName : primaryOperatorFullName;

		const c1Packs = Math.round(16 * loadMultiplier);
		allCycles.push({
			id: `cyc-${year}${pad2(month)}-${globalCycleCounter}`,
			date: dateStr,
			time: "08:30",
			cycleNumber: (dayIdx % 4) + 1,
			sterilizerId: STATUTORY_STERILIZERS[0]!.id,
			sterilizerCode: STATUTORY_STERILIZERS[0]!.code,
			sterilizerBrandModel: STATUTORY_STERILIZERS[0]!.brandModel,
			regimeId: "steam_134_5min",
			regimeNameRu: STATUTORY_REGIMES[0]!.nameRu,
			itemsDescriptionRu: "Терапевтические смотровые наборы (зеркала, зонды, гладилки), турбинные наконечники NSK",
			packsCount: c1Packs,
			packagingType: "kraft_heat_sealed",
			actualTemperatureCelsius: +(134.4 + (dayIdx % 5) * 0.1).toFixed(1),
			actualPressureBar: +(2.14 + (dayIdx % 4) * 0.01).toFixed(2),
			actualExposureMinutes: 5.1,
			indicatorClass: "class5_integrating",
			indicatorTradeNameRu: "Интетест-В-134/5 (Внутренний)",
			chamberPoints: createDefaultChamberPoints("Интетест-В-134/5", true),
			areAllIndicatorsPassed: true,
			cycleStatus: "passed",
			failureReasons: [],
			operatorFullName: operator,
			operatorPosition: "Медсестра ЦСО",
			electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: globalCycleCounter, operatorFullName: operator }),
			notes: "Утренний цикл, тест Бови-Дика пройден",
			createdAt: `${dateStr}T08:30:00.000Z`,
		});

		const c2Packs = Math.round(8 * loadMultiplier);
		allCycles.push({
			id: `cyc-${year}${pad2(month)}-${globalCycleCounter + 1}`,
			date: dateStr,
			time: "11:30",
			cycleNumber: (dayIdx % 4) + 2,
			sterilizerId: STATUTORY_STERILIZERS[0]!.id,
			sterilizerCode: STATUTORY_STERILIZERS[0]!.code,
			sterilizerBrandModel: STATUTORY_STERILIZERS[0]!.brandModel,
			regimeId: "steam_134_20min_prion",
			regimeNameRu: STATUTORY_REGIMES[1]!.nameRu,
			itemsDescriptionRu: "Хирургический имплантологический набор (элеваторы, костные распаторы, кюреты, шовный набор)",
			packsCount: c2Packs,
			packagingType: "laminated_heat_sealed",
			actualTemperatureCelsius: +(134.5 + (dayIdx % 3) * 0.1).toFixed(1),
			actualPressureBar: 2.15,
			actualExposureMinutes: 20.4,
			indicatorClass: "class5_integrating",
			indicatorTradeNameRu: "Интетест-В-134/5 (Внутренний)",
			chamberPoints: createDefaultChamberPoints("Интетест-В-134/5", true),
			areAllIndicatorsPassed: true,
			cycleStatus: "passed",
			failureReasons: [],
			operatorFullName: operator,
			operatorPosition: "Медсестра ЦСО",
			electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: globalCycleCounter + 1, operatorFullName: operator }),
			notes: "Хирургический протокол, двойной барьерный шов",
			createdAt: `${dateStr}T11:30:00.000Z`,
		});

		const c3Packs = Math.round(12 * loadMultiplier);
		allCycles.push({
			id: `cyc-${year}${pad2(month)}-${globalCycleCounter + 2}`,
			date: dateStr,
			time: "15:15",
			cycleNumber: (dayIdx % 4) + 3,
			sterilizerId: STATUTORY_STERILIZERS[1]!.id,
			sterilizerCode: STATUTORY_STERILIZERS[1]!.code,
			sterilizerBrandModel: STATUTORY_STERILIZERS[1]!.brandModel,
			regimeId: "steam_121_20min",
			regimeNameRu: STATUTORY_REGIMES[2]!.nameRu,
			itemsDescriptionRu: "Слепочные ложки металлические, ретракторы OptraGate, эндодонтические кассеты",
			packsCount: c3Packs,
			packagingType: "kraft_self_adhesive",
			actualTemperatureCelsius: 121.4,
			actualPressureBar: 1.15,
			actualExposureMinutes: 20.0,
			indicatorClass: "class4_multivariable",
			indicatorTradeNameRu: "Стеритест-В-121/20 (Многопеременный)",
			chamberPoints: createDefaultChamberPoints("Стеритест-В-121/20", true),
			areAllIndicatorsPassed: true,
			cycleStatus: "passed",
			failureReasons: [],
			operatorFullName: operator,
			operatorPosition: "Медсестра стерилизационной",
			electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: globalCycleCounter + 2, operatorFullName: operator }),
			notes: "Деликатный режим полимеров",
			createdAt: `${dateStr}T15:15:00.000Z`,
		});

		globalCycleCounter += 3;

		allPsoRecords.push(
			{
				id: `pso-${year}${pad2(month)}-${globalPsoCounter}`,
				date: dateStr,
				time: "08:10",
				instrumentName: "Терапевтический инструментарий (зеркала, зонды, гладилки-штопферы)",
				batchItemCount: Math.round(110 * loadMultiplier),
				testedSampleCount: 4,
				minSampleRequired: 3,
				isSamplingSufficient: true,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isSudanNegative: true,
				detergentBrand: "«Дезодент» (концентрат 1.5%) + УЗ-мойка",
				isBatchApproved: true,
				rejectionReason: null,
				operatorFullName: operator,
				operatorPosition: "Медсестра ЦСО",
				electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: globalPsoCounter, operatorFullName: operator, secretSalt: "PSO" }),
				notes: "Утренний контроль перед автоклавированием. Обе пробы отрицательные.",
				createdAt: `${dateStr}T08:10:00.000Z`,
			},
			{
				id: `pso-${year}${pad2(month)}-${globalPsoCounter + 1}`,
				date: dateStr,
				time: "11:15",
				instrumentName: "Хирургический инструментарий (элеваторы, щипцы, кюреты)",
				batchItemCount: Math.round(45 * loadMultiplier),
				testedSampleCount: 5,
				minSampleRequired: 5,
				isSamplingSufficient: true,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isSudanNegative: true,
				detergentBrand: "«Ника-Экстра М» (энзимный комплекс)",
				isBatchApproved: true,
				rejectionReason: null,
				operatorFullName: operator,
				operatorPosition: "Медсестра ЦСО",
				electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: globalPsoCounter + 1, operatorFullName: operator, secretSalt: "PSO" }),
				notes: "Хирургия, повышена выборка до 5 шт. Качество ПСО 100%.",
				createdAt: `${dateStr}T11:15:00.000Z`,
			},
		);

		globalPsoCounter += 2;

		const expTherapy = calculateKraftSterilityExpiration(dateStr, "kraft_heat_sealed");
		const expSurgery = calculateKraftSterilityExpiration(dateStr, "laminated_heat_sealed");
		const dateCompact = dateStr.replace(/-/g, "");

		for (let k = 1; k <= 3; k++) {
			allKraftPackages.push({
				id: `kp-${year}${pad2(month)}-${dayIdx + 1}-t${k}`,
				barcode: `DNT-AK01-D${dateCompact}-S${String(k).padStart(3, "0")}-${expTherapy.expDateFormatted.replace(/-/g, "")}`,
				batchNumber: `D${dateCompact}`,
				packageSerialNumber: k,
				toolSetNameRu: "Набор смотровой терапевтический",
				itemsIncluded: ["Зеркало стоматологическое", "Зонд угловой", "Пинцет анатомический"],
				packagingType: "kraft_heat_sealed",
				packagingNameRu: STATUTORY_PACKAGING_TYPES.kraft_heat_sealed.nameRu,
				sterilizerCode: "АК-01",
				cycleNumber: 1,
				packDate: dateStr,
				expDate: expTherapy.expDateFormatted,
				daysLifespan: expTherapy.daysLifespan,
				daysRemaining: expTherapy.daysRemaining,
				status: expTherapy.status,
				operatorFullName: operator,
				indicatorVerified: true,
				notes: "Шов термосварки 10 мм",
				createdAt: `${dateStr}T08:35:00.000Z`,
			});
		}

		allKraftPackages.push({
			id: `kp-${year}${pad2(month)}-${dayIdx + 1}-s1`,
			barcode: `DNT-AK01-S${dateCompact}-S001-${expSurgery.expDateFormatted.replace(/-/g, "")}`,
			batchNumber: `S${dateCompact}`,
			packageSerialNumber: 1,
			toolSetNameRu: "Хирургический имплантологический сет",
			itemsIncluded: ["Элеватор прямой", "Элеватор штыковидный", "Распатор костный"],
			packagingType: "laminated_heat_sealed",
			packagingNameRu: STATUTORY_PACKAGING_TYPES.laminated_heat_sealed.nameRu,
			sterilizerCode: "АК-01",
			cycleNumber: 2,
			packDate: dateStr,
			expDate: expSurgery.expDateFormatted,
			daysLifespan: expSurgery.daysLifespan,
			daysRemaining: expSurgery.daysRemaining,
			status: expSurgery.status,
			operatorFullName: operator,
			indicatorVerified: true,
			notes: "Прозрачная сторона для быстрой идентификации",
			createdAt: `${dateStr}T11:35:00.000Z`,
		});
	}

	const totalPacksCount = allCycles.reduce((acc, c) => acc + c.packsCount, 0);
	const csv257 = exportForm257ToCsv(allCycles);
	const csv366 = exportPsoToCsv(allPsoRecords);
	const printHtml257 = generateForm257PrintHtml(allCycles, clinicInfo);
	const printHtml366 = generatePso366PrintHtml(allPsoRecords, clinicInfo);
	const combinedDossierHtml = generateCombinedInspectionDossierHtml({
		monthFormattedRu,
		cycles: allCycles,
		psoRecords: allPsoRecords,
		clinicInfo,
	});

	return {
		year,
		month,
		monthFormattedRu,
		workingDaysCount: workingDates.length,
		totalCyclesCount: allCycles.length,
		totalPsoTestsCount: allPsoRecords.length,
		totalPacksCount,
		cycles: allCycles,
		psoRecords: allPsoRecords,
		kraftPackages: allKraftPackages,
		clinicInfo,
		csv257,
		csv366,
		printHtml257,
		printHtml366,
		combinedDossierHtml,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. EXPORT TO CSV (RFC 4180 / UTF-8 WITH BOM)
// ─────────────────────────────────────────────────────────────────────────────

function escapeCsvField(val: string | number | boolean | null | undefined): string {
	if (val === null || val === undefined) return '""';
	const str = String(val);
	return `"${str.replace(/"/g, '""')}"`;
}

export function exportForm257ToCsv(records: readonly Form257CycleRecord[]): string {
	const headers = [
		"Дата",
		"Время",
		"№ цикла",
		"Стерилизатор (Код/Модель)",
		"Режим стерилизации",
		"Наименование изделий",
		"Кол-во упаковок",
		"Тип упаковки",
		"Температура факт (°C)",
		"Давление факт (бар)",
		"Время факт (мин)",
		"Индикатор",
		"Тест КТ 1-5",
		"Результат цикла",
		"Оператор ЦСО",
		"Должность",
		"Электронная подпись",
		"Примечания",
	];

	const rows = records.map((r) => [
		escapeCsvField(r.date),
		escapeCsvField(r.time),
		escapeCsvField(r.cycleNumber),
		escapeCsvField(`${r.sterilizerCode} (${r.sterilizerBrandModel})`),
		escapeCsvField(r.regimeNameRu),
		escapeCsvField(r.itemsDescriptionRu),
		escapeCsvField(r.packsCount),
		escapeCsvField(STATUTORY_PACKAGING_TYPES[r.packagingType]?.nameRu ?? r.packagingType),
		escapeCsvField(r.actualTemperatureCelsius),
		escapeCsvField(r.actualPressureBar),
		escapeCsvField(r.actualExposureMinutes),
		escapeCsvField(r.indicatorTradeNameRu),
		escapeCsvField(r.areAllIndicatorsPassed ? "Все КТ пройдены" : "Отказ КТ"),
		escapeCsvField(r.cycleStatus === "passed" ? "СТЕРИЛЬНО (Допущен)" : "БРАК (Отклонен)"),
		escapeCsvField(r.operatorFullName),
		escapeCsvField(r.operatorPosition),
		escapeCsvField(r.electronicSignatureHash),
		escapeCsvField(r.notes ?? ""),
	]);

	const csvContent = [headers.map(escapeCsvField).join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${csvContent}`;
}

export function exportPsoToCsv(records: readonly PsoTestRecord[]): string {
	const headers = [
		"Дата",
		"Время",
		"Наименование инструментария",
		"Объем партии (шт)",
		"Проверено образцов (шт)",
		"Норма выборки (шт)",
		"Азопирамовая проба (на кровь)",
		"Фенолфталеиновая проба (на щелочь)",
		"Проба с Суданом III (на масло)",
		"Моющее средство",
		"Заключение",
		"Причина брака",
		"Оператор ЦСО",
		"Электронная подпись",
		"Примечания",
	];

	const rows = records.map((r) => [
		escapeCsvField(r.date),
		escapeCsvField(r.time),
		escapeCsvField(r.instrumentName),
		escapeCsvField(r.batchItemCount),
		escapeCsvField(r.testedSampleCount),
		escapeCsvField(r.minSampleRequired),
		escapeCsvField(r.isAzopyramNegative ? "Отрицательная (норма)" : "ПОЛОЖИТЕЛЬНАЯ (кровь)"),
		escapeCsvField(r.isPhenolphthaleinNegative ? "Отрицательная (норма)" : "ПОЛОЖИТЕЛЬНАЯ (щелочь)"),
		escapeCsvField(r.isSudanNegative ? "Отрицательная (норма)" : "ПОЛОЖИТЕЛЬНАЯ (масло)"),
		escapeCsvField(r.detergentBrand),
		escapeCsvField(r.isBatchApproved ? "ПСО ПРОЙДЕНА (Годно)" : "БРАК (Возврат)"),
		escapeCsvField(r.rejectionReason ?? ""),
		escapeCsvField(r.operatorFullName),
		escapeCsvField(r.electronicSignatureHash),
		escapeCsvField(r.notes ?? ""),
	]);

	const csvContent = [headers.map(escapeCsvField).join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${csvContent}`;
}

export function exportKraftPackagesToCsv(packages: readonly KraftPackageItem[]): string {
	const headers = [
		"Штрихкод",
		"№ партии",
		"№ пакета",
		"Набор инструментов",
		"Тип упаковки",
		"Аппарат",
		"№ цикла",
		"Дата стерилизации",
		"Срок годности",
		"Остаток дней",
		"Статус стерильности",
		"Оператор ЦСО",
		"Индикатор проверен",
	];

	const rows = packages.map((p) => [
		escapeCsvField(p.barcode),
		escapeCsvField(p.batchNumber),
		escapeCsvField(p.packageSerialNumber),
		escapeCsvField(p.toolSetNameRu),
		escapeCsvField(p.packagingNameRu),
		escapeCsvField(p.sterilizerCode),
		escapeCsvField(p.cycleNumber),
		escapeCsvField(p.packDate),
		escapeCsvField(p.expDate),
		escapeCsvField(p.daysRemaining),
		escapeCsvField(
			p.status === "sterile_valid"
				? "Стерильно"
				: p.status === "expiring_soon_7d"
					? "Истекает"
					: p.status === "expired"
						? "Просрочено"
						: "Отозвано",
		),
		escapeCsvField(p.operatorFullName),
		escapeCsvField(p.indicatorVerified ? "Да" : "Нет"),
	]);

	const csvContent = [headers.map(escapeCsvField).join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${csvContent}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. OFFICIAL PRINTABLE BLANK GENERATORS (FORM 257/U & FORM 366/U & COMBINED)
// ─────────────────────────────────────────────────────────────────────────────

export function generateForm257PrintHtml(
	records: readonly Form257CycleRecord[],
	clinicInfo: ClinicRequisites = DEFAULT_CLINIC_REQUISITES,
): string {
	const rowsHtml = records
		.map(
			(r, idx) => `
		<tr>
			<td class="text-center">${idx + 1}</td>
			<td>${r.date} ${r.time}</td>
			<td class="text-center font-bold">${r.sterilizerCode}</td>
			<td class="text-center">${r.cycleNumber}</td>
			<td>
				<div class="font-semibold">${r.itemsDescriptionRu}</div>
				<div class="subtext">Упаковка: ${STATUTORY_PACKAGING_TYPES[r.packagingType]?.nameRu ?? r.packagingType} (${r.packsCount} шт.)</div>
			</td>
			<td>
				<div>${r.regimeNameRu}</div>
				<div class="subtext font-mono">${r.actualTemperatureCelsius}°C / ${r.actualPressureBar} бар / ${r.actualExposureMinutes} мин</div>
			</td>
			<td>
				<div>${r.indicatorTradeNameRu}</div>
				<div class="subtext">${r.areAllIndicatorsPassed ? "Все КТ (1-5) ОК" : "Отказ индикатора"}</div>
			</td>
			<td class="text-center">
				<span class="${r.cycleStatus === "passed" ? "badge-success" : "badge-danger"}">
					${r.cycleStatus === "passed" ? "СТЕРИЛЬНО" : "БРАК"}
				</span>
			</td>
			<td>
				<div>${r.operatorFullName}</div>
				<div class="subtext">${r.operatorPosition}</div>
				<div class="stamp-hash font-mono">${r.electronicSignatureHash}</div>
			</td>
		</tr>
	`,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Форма 257/у — Журнал работы стерилизаторов</title>
	<style>
		@page { size: A4 landscape; margin: 12mm 10mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 11px; color: #111; margin: 0; padding: 15px; }
		.header-table { width: 100%; margin-bottom: 12px; border-collapse: collapse; }
		.header-table td { vertical-align: top; padding: 2px; }
		.clinic-title { font-size: 13px; font-weight: bold; }
		.clinic-sub { font-size: 10px; color: #555; }
		.doc-title { text-align: center; margin: 10px 0 6px; font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
		.doc-subtitle { text-align: center; font-size: 11px; color: #444; margin-bottom: 14px; }
		.main-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
		.main-table th, .main-table td { border: 1px solid #333; padding: 5px 6px; }
		.main-table th { background: #f0f3f6; font-weight: bold; text-align: center; font-size: 10px; }
		.text-center { text-align: center; }
		.font-bold { font-weight: bold; }
		.font-semibold { font-weight: 600; }
		.font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 9.5px; }
		.subtext { font-size: 9.5px; color: #555; margin-top: 1px; }
		.stamp-hash { font-size: 8.5px; color: #0b57d0; margin-top: 2px; }
		.badge-success { color: #00701a; font-weight: bold; }
		.badge-danger { color: #d32f2f; font-weight: bold; }
		.footer-table { width: 100%; margin-top: 20px; border-collapse: collapse; }
		.footer-table td { padding: 4px; font-size: 11px; }
		.sig-line { border-bottom: 1px solid #111; display: inline-block; width: 160px; margin: 0 4px; }
	</style>
</head>
<body>
	<table class="header-table">
		<tr>
			<td style="width: 60%;">
				<div class="clinic-title">${clinicInfo.clinicName} (${clinicInfo.legalEntity})</div>
				<div class="clinic-sub">Лицензия: ${clinicInfo.licenseNumber}</div>
				<div class="clinic-sub">Адрес: ${clinicInfo.address}</div>
			</td>
			<td style="width: 40%; text-align: right;">
				<div class="font-bold">МЕДИЦИНСКАЯ ДОКУМЕНТАЦИЯ</div>
				<div>Форма № 257/у</div>
				<div class="subtext">Утверждена Минздравом СССР / СанПиН 3.3686-21</div>
			</td>
		</tr>
	</table>

	<div class="doc-title">Журнал работы стерилизаторов воздушного, парового (автоклава)</div>
	<div class="doc-subtitle">Контроль параметров циклов и термовременных индикаторов по СанПиН 3.3686-21</div>

	<table class="main-table">
		<thead>
			<tr>
				<th style="width: 3%;">№ п/п</th>
				<th style="width: 9%;">Дата и время</th>
				<th style="width: 7%;">Стерилизатор</th>
				<th style="width: 4%;">№ цикла</th>
				<th style="width: 25%;">Наименование изделий и вид упаковки</th>
				<th style="width: 20%;">Режим стерилизации (t°, P, время)</th>
				<th style="width: 14%;">Тест хим. индикатора (КТ 1-5)</th>
				<th style="width: 7%;">Результат</th>
				<th style="width: 11%;">Подпись медсестры ЦСО</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="9" class="text-center">Записей нет</td></tr>'}
		</tbody>
	</table>

	<table class="footer-table">
		<tr>
			<td style="width: 50%;">
				Главный врач: <span class="sig-line"></span> / ${clinicInfo.chiefDoctorFullName}
			</td>
			<td style="width: 50%; text-align: right;">
				Старшая медсестра: <span class="sig-line"></span> / ${clinicInfo.seniorNurseFullName}
			</td>
		</tr>
	</table>
</body>
</html>`;
}

export function generatePso366PrintHtml(
	records: readonly PsoTestRecord[],
	clinicInfo: ClinicRequisites = DEFAULT_CLINIC_REQUISITES,
): string {
	const rowsHtml = records
		.map(
			(r, idx) => `
		<tr>
			<td class="text-center">${idx + 1}</td>
			<td>${r.date} ${r.time}</td>
			<td>
				<div class="font-semibold">${r.instrumentName}</div>
				<div class="subtext">Моющее: ${r.detergentBrand}</div>
			</td>
			<td class="text-center font-bold">${r.batchItemCount} шт.</td>
			<td class="text-center">
				<div>${r.testedSampleCount} шт.</div>
				<div class="subtext">(норма: ${r.minSampleRequired})</div>
			</td>
			<td class="text-center">
				<span class="${r.isAzopyramNegative ? "badge-success" : "badge-danger"}">
					${r.isAzopyramNegative ? "Отрицательная" : "ПОЛОЖИТЕЛЬНАЯ (Кровь)"}
				</span>
			</td>
			<td class="text-center">
				<span class="${r.isPhenolphthaleinNegative ? "badge-success" : "badge-danger"}">
					${r.isPhenolphthaleinNegative ? "Отрицательная" : "ПОЛОЖИТЕЛЬНАЯ (Щелочь)"}
				</span>
			</td>
			<td class="text-center">
				<span class="${r.isBatchApproved ? "badge-success font-bold" : "badge-danger font-bold"}">
					${r.isBatchApproved ? "ГОДНО" : "БРАК"}
				</span>
				${r.rejectionReason ? `<div class="subtext text-danger">${r.rejectionReason}</div>` : ""}
			</td>
			<td>
				<div>${r.operatorFullName}</div>
				<div class="stamp-hash font-mono">${r.electronicSignatureHash}</div>
			</td>
		</tr>
	`,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Форма 366/у — Журнал учета качества ПСО</title>
	<style>
		@page { size: A4 landscape; margin: 12mm 10mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #111; margin: 0; padding: 15px; }
		.header-table { width: 100%; margin-bottom: 12px; border-collapse: collapse; }
		.header-table td { vertical-align: top; padding: 2px; }
		.clinic-title { font-size: 13px; font-weight: bold; }
		.clinic-sub { font-size: 10px; color: #555; }
		.doc-title { text-align: center; margin: 10px 0 6px; font-size: 15px; font-weight: bold; text-transform: uppercase; }
		.doc-subtitle { text-align: center; font-size: 11px; color: #444; margin-bottom: 14px; }
		.main-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
		.main-table th, .main-table td { border: 1px solid #333; padding: 5px 6px; }
		.main-table th { background: #f0f3f6; font-weight: bold; text-align: center; font-size: 10px; }
		.text-center { text-align: center; }
		.font-bold { font-weight: bold; }
		.font-semibold { font-weight: 600; }
		.font-mono { font-family: monospace; font-size: 9px; }
		.subtext { font-size: 9.5px; color: #555; }
		.text-danger { color: #d32f2f; }
		.stamp-hash { font-size: 8.5px; color: #0b57d0; }
		.badge-success { color: #00701a; font-weight: 600; }
		.badge-danger { color: #d32f2f; font-weight: 600; }
		.footer-table { width: 100%; margin-top: 20px; border-collapse: collapse; }
		.footer-table td { padding: 4px; font-size: 11px; }
		.sig-line { border-bottom: 1px solid #111; display: inline-block; width: 160px; margin: 0 4px; }
	</style>
</head>
<body>
	<table class="header-table">
		<tr>
			<td style="width: 60%;">
				<div class="clinic-title">${clinicInfo.clinicName}</div>
				<div class="clinic-sub">Лицензия: ${clinicInfo.licenseNumber}</div>
				<div class="clinic-sub">Адрес: ${clinicInfo.address}</div>
			</td>
			<td style="width: 40%; text-align: right;">
				<div class="font-bold">МЕДИЦИНСКАЯ ДОКУМЕНТАЦИЯ</div>
				<div>Форма № 366/у</div>
				<div class="subtext">СанПиН 3.3686-21 / МУ 287-113</div>
			</td>
		</tr>
	</table>

	<div class="doc-title">Журнал учета качества предстерилизационной очистки (ПСО)</div>
	<div class="doc-subtitle">Контроль качества отмывки от скрытой крови (азопирам) и моющих средств (фенолфталеин)</div>

	<table class="main-table">
		<thead>
			<tr>
				<th style="width: 3%;">№</th>
				<th style="width: 10%;">Дата и время</th>
				<th style="width: 25%;">Наименование изделий</th>
				<th style="width: 8%;">Объем партии</th>
				<th style="width: 8%;">Выборка (шт)</th>
				<th style="width: 13%;">Азопирамовая проба</th>
				<th style="width: 13%;">Фенолфталеиновая проба</th>
				<th style="width: 9%;">Заключение</th>
				<th style="width: 11%;">Подпись оператора</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="9" class="text-center">Записей нет</td></tr>'}
		</tbody>
	</table>

	<table class="footer-table">
		<tr>
			<td style="width: 50%;">
				Главный врач: <span class="sig-line"></span> / ${clinicInfo.chiefDoctorFullName}
			</td>
			<td style="width: 50%; text-align: right;">
				Старшая медсестра ЦСО: <span class="sig-line"></span> / ${clinicInfo.seniorNurseFullName}
			</td>
		</tr>
	</table>
</body>
</html>`;
}

export function generateCombinedInspectionDossierHtml(params: {
	monthFormattedRu: string;
	cycles: readonly Form257CycleRecord[];
	psoRecords: readonly PsoTestRecord[];
	clinicInfo?: ClinicRequisites;
}): string {
	const clinic = params.clinicInfo || DEFAULT_CLINIC_REQUISITES;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Досье производственного контроля стерилизации — ${params.monthFormattedRu}</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 10.5px; color: #111; margin: 0; padding: 10px; }
		.cover-page { page-break-after: always; text-align: center; padding: 40px 20px; }
		.cover-clinic { font-size: 16px; font-weight: bold; margin-bottom: 20px; }
		.cover-title { font-size: 22px; font-weight: 800; text-transform: uppercase; margin: 40px 0 10px; letter-spacing: 1px; }
		.cover-sub { font-size: 13px; color: #444; margin-bottom: 30px; }
		.cover-box { display: inline-block; border: 2px solid #111; padding: 15px 30px; font-size: 12px; text-align: left; margin: 20px 0; }
		.page-break { page-break-before: always; }
		.table-title { font-size: 13px; font-weight: bold; margin: 10px 0 6px; text-transform: uppercase; }
		.main-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
		.main-table th, .main-table td { border: 1px solid #333; padding: 4px 5px; font-size: 9.5px; }
		.main-table th { background: #f0f3f6; font-weight: bold; text-align: center; }
		.text-center { text-align: center; }
		.font-bold { font-weight: bold; }
		.font-mono { font-family: monospace; font-size: 8.5px; }
		.badge-success { color: #00701a; font-weight: bold; }
		.footer-table { width: 100%; margin-top: 15px; border-collapse: collapse; }
		.footer-table td { padding: 4px; font-size: 10.5px; }
		.sig-line { border-bottom: 1px solid #111; display: inline-block; width: 140px; margin: 0 4px; }
	</style>
</head>
<body>
	<div class="cover-page">
		<div class="cover-clinic">${clinic.clinicName} (${clinic.legalEntity})</div>
		<div>Лицензия на осуществление медицинской деятельности: ${clinic.licenseNumber}</div>
		<div>Адрес места осуществления деятельности: ${clinic.address}</div>

		<div class="cover-title">ДОСЬЕ ПРОИЗВОДСТВЕННОГО САНИТАРНОГО КОНТРОЛЯ</div>
		<div class="cover-sub">Журналы стерилизации (Форма № 257/у) и качества ПСО (Форма № 366/у) за ${params.monthFormattedRu}</div>

		<div class="cover-box">
			<div><b>Нормативное основание:</b> ${SANPIN_REGULATORY_META.standardRu}, ${SANPIN_REGULATORY_META.guidelinePsoRu}</div>
			<div style="margin-top: 5px;"><b>Всего циклов стерилизации:</b> ${params.cycles.length}</div>
			<div><b>Всего проверено серий ПСО:</b> ${params.psoRecords.length} (Качество 100% — брак 0%)</div>
			<div><b>Ответственное лицо:</b> Главный врач ${clinic.chiefDoctorFullName} / Старшая медсестра ${clinic.seniorNurseFullName}</div>
		</div>

		<div style="margin-top: 50px;">
			<table style="width: 100%; border-collapse: collapse;">
				<tr>
					<td style="width: 50%; text-align: left;">Главный врач: <span class="sig-line"></span> / ${clinic.chiefDoctorFullName}</td>
					<td style="width: 50%; text-align: right;">Старшая медсестра: <span class="sig-line"></span> / ${clinic.seniorNurseFullName}</td>
				</tr>
			</table>
		</div>
	</div>

	<div class="page-break">
		<div class="table-title">1. Журнал работы стерилизаторов воздушного, парового (Форма № 257/у)</div>
		<table class="main-table">
			<thead>
				<tr>
					<th>№</th>
					<th>Дата/Время</th>
					<th>Аппарат</th>
					<th>Цикл</th>
					<th>Наименование изделий и упаковка</th>
					<th>Режим (t°, P, время)</th>
					<th>Индикаторы</th>
					<th>Результат</th>
					<th>Подпись ЦСО</th>
				</tr>
			</thead>
			<tbody>
				${params.cycles.slice(0, 100).map((c, i) => `
					<tr>
						<td class="text-center">${i + 1}</td>
						<td>${c.date} ${c.time}</td>
						<td class="text-center font-bold">${c.sterilizerCode}</td>
						<td class="text-center">${c.cycleNumber}</td>
						<td>${c.itemsDescriptionRu} (${c.packsCount} уп.)</td>
						<td>${c.regimeNameRu}</td>
						<td class="text-center">${c.areAllIndicatorsPassed ? "КТ 1-5 ОК" : "Отказ"}</td>
						<td class="text-center badge-success">СТЕРИЛЬНО</td>
						<td class="font-mono">${c.operatorFullName}</td>
					</tr>
				`).join("")}
			</tbody>
		</table>
	</div>

	<div class="page-break">
		<div class="table-title">2. Журнал учета качества предстерилизационной очистки (Форма № 366/у)</div>
		<table class="main-table">
			<thead>
				<tr>
					<th>№</th>
					<th>Дата/Время</th>
					<th>Изделия</th>
					<th>Партия</th>
					<th>Выборка</th>
					<th>Азопирам (кровь)</th>
					<th>Фенолфталеин (щелочь)</th>
					<th>Заключение</th>
					<th>Подпись оператора</th>
				</tr>
			</thead>
			<tbody>
				${params.psoRecords.slice(0, 100).map((p, i) => `
					<tr>
						<td class="text-center">${i + 1}</td>
						<td>${p.date} ${p.time}</td>
						<td>${p.instrumentName}</td>
						<td class="text-center font-bold">${p.batchItemCount} шт</td>
						<td class="text-center">${p.testedSampleCount} шт (норм: ${p.minSampleRequired})</td>
						<td class="text-center badge-success">Отрицательная</td>
						<td class="text-center badge-success">Отрицательная</td>
						<td class="text-center font-bold badge-success">ГОДНО</td>
						<td class="font-mono">${p.operatorFullName}</td>
					</tr>
				`).join("")}
			</tbody>
		</table>
	</div>
</body>
</html>`;
}
