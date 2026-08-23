/**
 * ============================================================================
 * CLINICAL WRITEOFF PRESETS & ORDER 804N DENTAL SERVICE NORMS
 * Стандарты расхода стоматологических материалов, привязанные к номенклатуре
 * медицинских услуг Минздрава РФ (Приказ № 804н), справочник складских партий
 * и типовые нормы списания в кабинете/кресле врача-стоматолога.
 * ============================================================================
 */

import { type Kopecks, parseKopecks } from "@dental/shared";

export type DentalServiceSpecialty =
	| "therapy"
	| "endodontics"
	| "surgery"
	| "implantology"
	| "hygiene"
	| "orthopedics"
	| "general";

export type MaterialMeasurementUnit =
	| "г"
	| "мл"
	| "шт"
	| "пар"
	| "компл"
	| "фл"
	| "карп"
	| "упак";

export type DiscrepancyReasonCode =
	| "standard_consumption"
	| "additional_carpule"
	| "anatomical_complexity"
	| "broken_instrument"
	| "sterile_packaging_breach"
	| "spillage_loss"
	| "sample_testing";

export interface DiscrepancyReasonDefinition {
	readonly code: DiscrepancyReasonCode;
	readonly labelRu: string;
	readonly descriptionRu: string;
	readonly isDefect: boolean;
}

export interface ClinicalMaterialDefinition {
	readonly id: string;
	readonly sku: string;
	readonly nameRu: string;
	readonly category: "composite" | "adhesive" | "endo" | "implant" | "suture" | "anesthesia" | "hygiene" | "ppe" | "disinfection" | "auxiliary" | "surgery";
	readonly unit: MaterialMeasurementUnit;
	readonly okeiCode: string; // ОКЕИ: 166-г, 111-мл, 796-шт, 715-пара, 839-компл
	readonly defaultUnitCostKopecks: Kopecks;
	readonly requiresLotTracking: boolean;
	readonly requiresSerialNumber: boolean;
	readonly standardPackagingRu: string;
	readonly descriptionRu?: string | undefined;
}

export interface ServiceMaterialNormItem {
	readonly materialId: string;
	readonly standardQuantity: number;
	readonly isMandatory: boolean;
	readonly defaultDiscrepancyAllowedPercent: number; // допустимое отклонение в %
	readonly clinicalRationaleRu: string;
}

export interface Order804nServiceNorm {
	readonly serviceCode: string;
	readonly serviceTitle: string;
	readonly specialty: DentalServiceSpecialty;
	readonly descriptionRu: string;
	readonly standardDurationMinutes: number;
	readonly materials: readonly ServiceMaterialNormItem[];
}

export interface CabinetStockBatch {
	readonly batchId: string;
	readonly materialId: string;
	readonly cabinetId: string;
	readonly cabinetNameRu: string;
	readonly lotNumber: string;
	readonly serialNumber?: string | undefined;
	readonly expirationDate: string; // ISO YYYY-MM-DD
	readonly manufactureDate: string;
	readonly quantityAvailable: number;
	readonly criticalThreshold: number;
	readonly unitCostKopecks: Kopecks;
	readonly supplierNameRu: string;
}

export interface ClinicLegalInfo {
	readonly clinicNameRu: string;
	readonly okpoCode: string;
	readonly ogrn: string;
	readonly inn: string;
	readonly kpp: string;
	readonly addressRu: string;
	readonly chiefDoctorFullName: string;
	readonly chiefDoctorPosition: string;
	readonly headNurseFullName: string;
	readonly headNursePosition: string;
}

/**
 * 1. Юридические реквизиты клиники по умолчанию
 */
export const DEFAULT_CLINIC_LEGAL_INFO: ClinicLegalInfo = {
	clinicNameRu: "ООО «Стоматологическая клиника ДЕНТЕ»",
	okpoCode: "49201948",
	ogrn: "1187746123456",
	inn: "7704456789",
	kpp: "770401001",
	addressRu: "г. Москва, ул. Тверская, д. 24, стр. 1",
	chiefDoctorFullName: "Кузнецов Михаил Сергеевич",
	chiefDoctorPosition: "Главный врач",
	headNurseFullName: "Смирнова Анна Викторовна",
	headNursePosition: "Главная медицинская сестра",
};

/**
 * 2. Эталонные причины расхождений и отклонений от технологических норм
 */
export const DISCREPANCY_REASONS: readonly DiscrepancyReasonDefinition[] = [
	{
		code: "standard_consumption",
		labelRu: "Стандартный клинический расход",
		descriptionRu: "Списание точно по норме технологической карты услуги",
		isDefect: false,
	},
	{
		code: "additional_carpule",
		labelRu: "Дополнительная анестезия (чувствительность)",
		descriptionRu: "Повторная карпула анестетика из-за высокого болевого порога пациента",
		isDefect: false,
	},
	{
		code: "anatomical_complexity",
		labelRu: "Сложная анатомия / глубокий дефект",
		descriptionRu: "Увеличенный расход композита/силера при некариозных или атипичных полостях",
		isDefect: false,
	},
	{
		code: "broken_instrument",
		labelRu: "Поломка бора / эндодонтического файла",
		descriptionRu: "Абразивный износ или поломка вращающегося инструмента в процессе лечения",
		isDefect: true,
	},
	{
		code: "sterile_packaging_breach",
		labelRu: "Нарушение стерильности упаковки",
		descriptionRu: "Случайное касание нестерильной зоны до внесения в полость рта",
		isDefect: true,
	},
	{
		code: "spillage_loss",
		labelRu: "Случайная потеря / разлив материала",
		descriptionRu: "Технический разлив или перерасход жидкости при замешивании",
		isDefect: true,
	},
	{
		code: "sample_testing",
		labelRu: "Входной контроль / калибровка дозатора",
		descriptionRu: "Технологическое списание капли материала для проверки отверждения",
		isDefect: false,
	},
];

/**
 * 3. Базовый каталог стоматологических медикаментов и расходных материалов
 */
export const CLINICAL_MATERIALS_CATALOG: readonly ClinicalMaterialDefinition[] = [
	// Композиты и адгезивы
	{
		id: "mat_filtek_ultimate",
		sku: "COMP-FILT-ULT",
		nameRu: "Нанокомпозит Filtek Ultimate (шприц 4 г, 3M ESPE)",
		category: "composite",
		unit: "г",
		okeiCode: "166",
		defaultUnitCostKopecks: parseKopecks("1350.00"), // 1350 ₽ за 1 г
		requiresLotTracking: true,
		requiresSerialNumber: false,
		standardPackagingRu: "шприц 4 г",
		descriptionRu: "Универсальный наногибридный реставрационный композит",
	},
	{
		id: "mat_gradia_direct",
		sku: "COMP-GRAD-DIR",
		nameRu: "Композит светового отверждения Gradia Direct (шприц 4 г, GC)",
		category: "composite",
		unit: "г",
		okeiCode: "166",
		defaultUnitCostKopecks: parseKopecks("1280.00"),
		requiresLotTracking: true,
		requiresSerialNumber: false,
		standardPackagingRu: "шприц 4 г",
		descriptionRu: "Светоотверждаемый микронаполненный гибридный композит",
	},
	{
		id: "mat_single_bond_universal",
		sku: "ADH-SBU-5ML",
		nameRu: "Адгезив Single Bond Universal (флакон 5 мл, 3M)",
		category: "adhesive",
		unit: "мл",
		okeiCode: "111",
		defaultUnitCostKopecks: parseKopecks("1950.00"), // 1950 ₽ за 1 мл
		requiresLotTracking: true,
		requiresSerialNumber: false,
		standardPackagingRu: "флакон 5 мл",
		descriptionRu: "Самопротравливающий адгезив 7-го поколения",
	},
	{
		id: "mat_phosphoric_acid_37",
		sku: "ETCH-GEL-37",
		nameRu: "Протравочный гель 37% фосфорная кислота (шприц 3 мл)",
		category: "adhesive",
		unit: "мл",
		okeiCode: "111",
		defaultUnitCostKopecks: parseKopecks("180.00"), // 180 ₽ за 1 мл
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "шприц 3 мл",
		descriptionRu: "Ортофосфорная кислота для кондиционирования эмали и дентина",
	},
	{
		id: "mat_cofferdam_sheet",
		sku: "COFF-SANC-BLUE",
		nameRu: "Платок коффердама латексный Sanctuary Dental Dam (комплект с клампом)",
		category: "auxiliary",
		unit: "шт",
		okeiCode: "796",
		defaultUnitCostKopecks: parseKopecks("115.00"),
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "упаковка 36 шт",
		descriptionRu: "Абсолютная изоляция зуба от ротовой жидкости и десневой жидкости",
	},
	{
		id: "mat_matrix_sectional_system",
		sku: "MATR-TOR-3D",
		nameRu: "Секционная матричная система контурная 3D + деревянный клин Tor VM",
		category: "auxiliary",
		unit: "компл",
		okeiCode: "839",
		defaultUnitCostKopecks: parseKopecks("95.00"),
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "набор 50 матриц + клинья",
		descriptionRu: "Восстановление анатомического контактного пункта и краевого валика",
	},
	{
		id: "mat_dental_burs_set",
		sku: "BURS-NTI-SET",
		nameRu: "Бор алмазный турбинный терапевтический (NTI / Komet)",
		category: "auxiliary",
		unit: "шт",
		okeiCode: "796",
		defaultUnitCostKopecks: parseKopecks("210.00"),
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "блистер 5 шт",
		descriptionRu: "Препарирование твердых тканей зуба и формирование полости",
	},
	{
		id: "mat_polishing_enhance",
		sku: "POL-ENHANCE-01",
		nameRu: "Полировочная силиконовая головка Enhance / паста Prisma Gloss",
		category: "auxiliary",
		unit: "шт",
		okeiCode: "796",
		defaultUnitCostKopecks: parseKopecks("160.00"),
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "упаковка 40 шт",
		descriptionRu: "Финишная полировка реставраций до сухого зеркального блеска",
	},

	// Эндодонтия
	{
		id: "mat_gutta_percha_points",
		sku: "ENDO-GUTTA-04",
		nameRu: "Гуттаперчевые штифты конусность .04/.06 калиброванные",
		category: "endo",
		unit: "шт",
		okeiCode: "796",
		defaultUnitCostKopecks: parseKopecks("75.00"),
		requiresLotTracking: true,
		requiresSerialNumber: false,
		standardPackagingRu: "коробка 60 шт",
		descriptionRu: "Мастер-штифты для трехмерной обтурации корневых каналов",
	},
	{
		id: "mat_sealer_ah_plus",
		sku: "ENDO-AH-PLUS",
		nameRu: "Силер эпоксидный AH Plus / Эндометазон (паста A+B)",
		category: "endo",
		unit: "г",
		okeiCode: "166",
		defaultUnitCostKopecks: parseKopecks("4900.00"), // 4900 ₽ за 1 г
		requiresLotTracking: true,
		requiresSerialNumber: false,
		standardPackagingRu: "тюбик 15 г",
		descriptionRu: "Двухкомпонентный полимерный герметик корневых каналов",
	},
	{
		id: "mat_hypochlorite_na_3",
		sku: "ENDO-HYPO-3PCT",
		nameRu: "Раствор натрия гипохлорита 3% стабилизированный (флакон 250 мл)",
		category: "endo",
		unit: "мл",
		okeiCode: "111",
		defaultUnitCostKopecks: parseKopecks("12.00"), // 12 ₽ за 1 мл
		requiresLotTracking: true,
		requiresSerialNumber: false,
		standardPackagingRu: "флакон 250 мл",
		descriptionRu: "Основной антисептический ирригант для растворения органики",
	},
	{
		id: "mat_edta_gel_17",
		sku: "ENDO-EDTA-17",
		nameRu: "Гель ЭДТА 17% для хемомеханического расширения каналов",
		category: "endo",
		unit: "мл",
		okeiCode: "111",
		defaultUnitCostKopecks: parseKopecks("240.00"), // 240 ₽ за 1 мл
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "шприц 5 мл",
		descriptionRu: "Хелатный агент для удаления смазанного слоя со стенок канала",
	},
	{
		id: "mat_endo_needle_side_vent",
		sku: "ENDO-NDL-VENT",
		nameRu: "Эндодонтическая игла одноразовая с боковым спилом 30G",
		category: "endo",
		unit: "шт",
		okeiCode: "796",
		defaultUnitCostKopecks: parseKopecks("45.00"),
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "упаковка 100 шт",
		descriptionRu: "Безопасная игла для апикальной ирригации без риска выведения",
	},
	{
		id: "mat_paper_points",
		sku: "ENDO-PAPER-PTS",
		nameRu: "Штифты бумажные абсорбирующие стерильные (пины)",
		category: "endo",
		unit: "шт",
		okeiCode: "796",
		defaultUnitCostKopecks: parseKopecks("18.00"),
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "коробка 200 шт",
		descriptionRu: "Осушение корневого канала перед введением силера",
	},

	// Имплантация и хирургия
	{
		id: "mat_implant_osstem_ts3",
		sku: "IMP-OSST-TS3",
		nameRu: "Дентальный имплантат Osstem TS III SA (Ø4.0 x 10 мм)",
		category: "implant",
		unit: "шт",
		okeiCode: "796",
		defaultUnitCostKopecks: parseKopecks("12500.00"),
		requiresLotTracking: true,
		requiresSerialNumber: true,
		standardPackagingRu: "стерильный блистер",
		descriptionRu: "Титановый винтовой дентальный имплантат (МДЛП серийный номер)",
	},
	{
		id: "mat_healing_abutment",
		sku: "IMP-HEAL-ABUT",
		nameRu: "Заглушка винта / формирователь десны титановый",
		category: "implant",
		unit: "шт",
		okeiCode: "796",
		defaultUnitCostKopecks: parseKopecks("2400.00"),
		requiresLotTracking: true,
		requiresSerialNumber: false,
		standardPackagingRu: "стерильный флакон",
		descriptionRu: "Формирователь десневого контура вокруг платформы имплантата",
	},
	{
		id: "mat_surg_drape_gown_set",
		sku: "SURG-GOWN-SET",
		nameRu: "Стерильный хирургический халат и операционная простыня с липким краем",
		category: "ppe",
		unit: "компл",
		okeiCode: "839",
		defaultUnitCostKopecks: parseKopecks("650.00"),
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "стерильный комплект",
		descriptionRu: "Хирургическое накрытие операционного поля и хирурга",
	},
	{
		id: "mat_suture_vicryl_40",
		sku: "SUT-VICR-40",
		nameRu: "Шовный материал Викрил / Монофил 4-0 с атравматической колющей иглой",
		category: "suture",
		unit: "шт",
		okeiCode: "796",
		defaultUnitCostKopecks: parseKopecks("380.00"),
		requiresLotTracking: true,
		requiresSerialNumber: false,
		standardPackagingRu: "пакет с нитью",
		descriptionRu: "Рассасывающаяся полифиламентная нить для ушивания слизистой",
	},
	{
		id: "mat_surg_blade_15",
		sku: "SURG-BLADE-15",
		nameRu: "Лезвие скальпеля хирургическое №15 Swann-Morton",
		category: "surgery",
		unit: "шт",
		okeiCode: "796",
		defaultUnitCostKopecks: parseKopecks("85.00"),
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "стерильный фольгированный блистер",
		descriptionRu: "Микрохирургическое лезвие для разрезов десны и надкостницы",
	},
	{
		id: "mat_saline_500ml",
		sku: "SURG-SALINE-500",
		nameRu: "Раствор натрия хлорида 0.9% стерильный 500 мл (физраствор для физдиодиспансера)",
		category: "surgery",
		unit: "фл",
		okeiCode: "796",
		defaultUnitCostKopecks: parseKopecks("120.00"),
		requiresLotTracking: true,
		requiresSerialNumber: false,
		standardPackagingRu: "флакон 500 мл",
		descriptionRu: "Стерильное охлаждение костного ложа при препарировании",
	},
	{
		id: "mat_hemostatic_sponge",
		sku: "SURG-SPONGE-ALV",
		nameRu: "Гемостатическая коллагеновая губка Альвостаз / Тахокомб",
		category: "surgery",
		unit: "шт",
		okeiCode: "796",
		defaultUnitCostKopecks: parseKopecks("320.00"),
		requiresLotTracking: true,
		requiresSerialNumber: false,
		standardPackagingRu: "банка 30 шт",
		descriptionRu: "Остановка капиллярного кровотечения и защита кровяного сгустка",
	},

	// Анестезия
	{
		id: "mat_articaine_ultracain",
		sku: "ANES-ULTRA-DS",
		nameRu: "Анестетик артикаиновый 4% с эпинефрином 1:100000 (Ультракаин Д-С) 1.7 мл",
		category: "anesthesia",
		unit: "карп",
		okeiCode: "796",
		defaultUnitCostKopecks: parseKopecks("230.00"),
		requiresLotTracking: true,
		requiresSerialNumber: false,
		standardPackagingRu: "карпула 1.7 мл",
		descriptionRu: "Местный анестетик прямого действия с вазоконстриктором (МДЛП)",
	},
	{
		id: "mat_dental_needle_30g",
		sku: "ANES-NEEDLE-30G",
		nameRu: "Игла карпульная стоматологическая 30G евростандарт 25 мм",
		category: "anesthesia",
		unit: "шт",
		okeiCode: "796",
		defaultUnitCostKopecks: parseKopecks("30.00"),
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "коробка 100 шт",
		descriptionRu: "Стерильная инъекционная игла с силиконовым покрытием",
	},
	{
		id: "mat_topical_anesthesia_gel",
		sku: "ANES-TOPICAL-GEL",
		nameRu: "Гель для аппликационной анестезии Джен-Релиф / Топикал",
		category: "anesthesia",
		unit: "мл",
		okeiCode: "111",
		defaultUnitCostKopecks: parseKopecks("50.00"),
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "баночка 30 мл",
		descriptionRu: "Обезболивание места укола карпульной иглы",
	},

	// СИЗ и базовые расходники приема (СанПиН 3.3686-21)
	{
		id: "mat_saliva_ejector",
		sku: "PPE-SALIVA-EJ",
		nameRu: "Слюноотсос одноразовый стоматологический с гибким наконечником",
		category: "ppe",
		unit: "шт",
		okeiCode: "796",
		defaultUnitCostKopecks: parseKopecks("14.00"),
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "пакет 100 шт",
		descriptionRu: "Эвакуация ротовой жидкости из подъязычной области",
	},
	{
		id: "mat_cotton_rolls",
		sku: "PPE-COTTON-ROLLS",
		nameRu: "Ватные валики стоматологические стерильные №2",
		category: "ppe",
		unit: "шт",
		okeiCode: "796",
		defaultUnitCostKopecks: parseKopecks("4.00"),
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "рулон 500 шт",
		descriptionRu: "Изоляция операционного поля от слюны",
	},
	{
		id: "mat_nitrile_gloves",
		sku: "PPE-NITRILE-GLV",
		nameRu: "Перчатки нитриловые неопудренные текстурированные (пара)",
		category: "ppe",
		unit: "пар",
		okeiCode: "715",
		defaultUnitCostKopecks: parseKopecks("38.00"),
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "коробка 50 пар",
		descriptionRu: "Защита рук медицинского персонала",
	},
	{
		id: "mat_surgical_mask",
		sku: "PPE-SURG-MASK",
		nameRu: "Маска медицинская защитная трехслойная с носовым фиксатором",
		category: "ppe",
		unit: "шт",
		okeiCode: "796",
		defaultUnitCostKopecks: parseKopecks("16.00"),
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "коробка 50 шт",
		descriptionRu: "Защита дыхательных путей врача и ассистента",
	},
	{
		id: "mat_air_flow_powder",
		sku: "HYG-AIRFLOW-POWDER",
		nameRu: "Порошок для воздушно-абразивной обработки Air-Flow Clinpro / EMS Plus",
		category: "hygiene",
		unit: "г",
		okeiCode: "166",
		defaultUnitCostKopecks: parseKopecks("22.00"),
		requiresLotTracking: true,
		requiresSerialNumber: false,
		standardPackagingRu: "флакон 120 г",
		descriptionRu: "Удаление мягкого налета и биопленки с эмали зубов",
	},
	{
		id: "mat_prophy_paste",
		sku: "HYG-PROPHY-PASTE",
		nameRu: "Паста полировочная абразивная Cleanic / Detartrine",
		category: "hygiene",
		unit: "г",
		okeiCode: "166",
		defaultUnitCostKopecks: parseKopecks("42.00"),
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "туба 100 г",
		descriptionRu: "Механическая чистка и полировка эмали циркулярной щеткой",
	},
	{
		id: "mat_optragate",
		sku: "HYG-OPTRAGATE",
		nameRu: "Ретрактор губ и щек мягкий OptraGate (Ivoclar)",
		category: "hygiene",
		unit: "шт",
		okeiCode: "796",
		defaultUnitCostKopecks: parseKopecks("220.00"),
		requiresLotTracking: false,
		requiresSerialNumber: false,
		standardPackagingRu: "упаковка 80 шт",
		descriptionRu: "Комфортный трехмерный доступ к операционному полю",
	},
	{
		id: "mat_fluoride_varnish",
		sku: "HYG-FLUOR-VARNISH",
		nameRu: "Фторсодержащий защитный лак Clinpro White Varnish (флакон 0.5 мл)",
		category: "hygiene",
		unit: "мл",
		okeiCode: "111",
		defaultUnitCostKopecks: parseKopecks("680.00"),
		requiresLotTracking: true,
		requiresSerialNumber: false,
		standardPackagingRu: "унидоза 0.5 мл",
		descriptionRu: "Глубокое фторирование и снижение гиперестезии эмали",
	},
];

/**
 * 4. Технологические карты и нормы расхода материалов по Приказу Минздрава РФ № 804н
 */
export const ORDER_804N_SERVICE_NORMS: readonly Order804nServiceNorm[] = [
	// A16.07.002.001 — Пломбирование зуба композитом светового отверждения
	{
		serviceCode: "A16.07.002.001",
		serviceTitle: "Наложение пломбы из фотополимерного композита при лечении кариозных полостей",
		specialty: "therapy",
		descriptionRu: "Препарирование кариозной полости, адгезивный протокол, послойное внесение композита и финишная полировка",
		standardDurationMinutes: 45,
		materials: [
			{
				materialId: "mat_articaine_ultracain",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 карпула (1.7 мл) местного анестетика артикаинового ряда с вазоконстриктором",
			},
			{
				materialId: "mat_dental_needle_30g",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 карпульная игла 30G евростандарт 25 мм",
			},
			{
				materialId: "mat_cofferdam_sheet",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Платок коффердама для абсолютной изоляции рабочего поля от слюны",
			},
			{
				materialId: "mat_matrix_sectional_system",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Секционная 3D матрица и анатомический клин для формирования контактного пункта",
			},
			{
				materialId: "mat_dental_burs_set",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Алмазный турбинный бор для препарирования кариозной полости",
			},
			{
				materialId: "mat_filtek_ultimate",
				standardQuantity: 0.3,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 30,
				clinicalRationaleRu: "0.3 г наногибридного композита на среднюю кариозную полость I-V классов",
			},
			{
				materialId: "mat_single_bond_universal",
				standardQuantity: 0.05,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 20,
				clinicalRationaleRu: "1 капля самопротравливающего адгезива на браш",
			},
			{
				materialId: "mat_phosphoric_acid_37",
				standardQuantity: 0.1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 20,
				clinicalRationaleRu: "Селективное протравливание эмалевого края",
			},
			{
				materialId: "mat_polishing_enhance",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Финишная обработка контура пломбы",
			},
			{
				materialId: "mat_saliva_ejector",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Эвакуация слюны на время постановки пломбы",
			},
			{
				materialId: "mat_cotton_rolls",
				standardQuantity: 4,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 50,
				clinicalRationaleRu: "Изоляция рабочего поля со стороны щеки и языка",
			},
			{
				materialId: "mat_nitrile_gloves",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 пара нитриловых перчаток врача",
			},
			{
				materialId: "mat_surgical_mask",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 маска защитная трехслойная",
			},
		],
	},

	// A16.07.008 — Пломбирование корневого канала гуттаперчей
	{
		serviceCode: "A16.07.008",
		serviceTitle: "Пломбирование корневого канала зуба гуттаперчевыми штифтами",
		specialty: "endodontics",
		descriptionRu: "Антисептическая обработка, ирригация, калибровка мастер-штифта и постоянная обтурация силером AH Plus",
		standardDurationMinutes: 60,
		materials: [
			{
				materialId: "mat_gutta_percha_points",
				standardQuantity: 3,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 33,
				clinicalRationaleRu: "3 конусных штифта (.04/.06) на 1 корневой канал при латеральной/вертикальной компакции",
			},
			{
				materialId: "mat_sealer_ah_plus",
				standardQuantity: 0.1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 30,
				clinicalRationaleRu: "0.1 г эпоксидного силера AH Plus на 1 корневой канал",
			},
			{
				materialId: "mat_hypochlorite_na_3",
				standardQuantity: 10,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 50,
				clinicalRationaleRu: "10 мл гипохлорита натрия 3% для протокола ультразвуковой активации ирригации",
			},
			{
				materialId: "mat_edta_gel_17",
				standardQuantity: 3,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 30,
				clinicalRationaleRu: "3 мл 17% геля ЭДТА для удаления неорганического смазанного слоя",
			},
			{
				materialId: "mat_endo_needle_side_vent",
				standardQuantity: 2,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "2 эндодонтические иглы с боковым спилом для растворов гипохлорита и ЭДТА",
			},
			{
				materialId: "mat_paper_points",
				standardQuantity: 4,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 50,
				clinicalRationaleRu: "Бумажные пины для идеального осушения перед герметизацией",
			},
		],
	},

	// A16.07.054 — Установка дентального имплантата
	{
		serviceCode: "A16.07.054",
		serviceTitle: "Внутрикостная дентальная имплантация (установка титанового имплантата)",
		specialty: "implantology",
		descriptionRu: "Хирургический протокол формирования костного ложа, установка имплантата, фиксация формирователя десны и наложение швов",
		standardDurationMinutes: 60,
		materials: [
			{
				materialId: "mat_implant_osstem_ts3",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Дентальный имплантат Osstem TS III с индивидуальным серийным номером",
			},
			{
				materialId: "mat_healing_abutment",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Формирователь десны или винт-заглушка на платформу имплантата",
			},
			{
				materialId: "mat_surg_drape_gown_set",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Стерильное операционное накрытие пациента и хирурга",
			},
			{
				materialId: "mat_suture_vicryl_40",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Шовный материал Викрил / Монофил 4-0 для надежной кооптации краев раны",
			},
			{
				materialId: "mat_surg_blade_15",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Стерильное лезвие скальпеля №15 для краевого разреза слизистой",
			},
			{
				materialId: "mat_saline_500ml",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Охлаждающий физиологический раствор для физдиодиспансера",
			},
		],
	},

	// A16.07.004 — Местная анестезия (проводниковая / общая)
	{
		serviceCode: "A16.07.004",
		serviceTitle: "Анестезия местная инфильтрационная / проводниковая",
		specialty: "general",
		descriptionRu: "Обезболивание зоны манипуляции раствором артикаина с адреналином",
		standardDurationMinutes: 10,
		materials: [
			{
				materialId: "mat_articaine_ultracain",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 карпула (1.7 мл) Ультракаина Д-С",
			},
			{
				materialId: "mat_dental_needle_30g",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 карпульная игла 30G евростандарт",
			},
			{
				materialId: "mat_topical_anesthesia_gel",
				standardQuantity: 0.2,
				isMandatory: false,
				defaultDiscrepancyAllowedPercent: 50,
				clinicalRationaleRu: "Аппликационный гель для комфортного вкола иглы",
			},
		],
	},

	// A16.07.030.001 — Анестезия инфильтрационная (Приказ Минздрава РФ № 804н)
	{
		serviceCode: "A16.07.030.001",
		serviceTitle: "Анестезия инфильтрационная в стоматологии (Номенклатура 804н)",
		specialty: "general",
		descriptionRu: "Инфильтрационное обезболивание периапикальной зоны с предварительной аппликационной анестезией",
		standardDurationMinutes: 10,
		materials: [
			{
				materialId: "mat_articaine_ultracain",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 карпула (1.7 мл) артикаина 4% с эпинефрином 1:200 000 (Ультракаин Д-С)",
			},
			{
				materialId: "mat_dental_needle_30g",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 карпульная игла тонкостенная 30G (0.3 x 25 мм)",
			},
			{
				materialId: "mat_topical_anesthesia_gel",
				standardQuantity: 0.2,
				isMandatory: false,
				defaultDiscrepancyAllowedPercent: 50,
				clinicalRationaleRu: "0.2 г аппликационного геля бензокаина/лидокаина (Dis針-Top / Топикал)",
			},
			{
				materialId: "mat_cotton_rolls",
				standardQuantity: 2,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 50,
				clinicalRationaleRu: "2 ватных валика для изоляции и высушивания слизистой перед вколом",
			},
		],
	},

	// A16.07.051 — Профессиональная гигиена полости рта
	{
		serviceCode: "A16.07.051",
		serviceTitle: "Профессиональная гигиена полости рта и зубов (Air-Flow + УЗ)",
		specialty: "hygiene",
		descriptionRu: "Ультразвуковой скейлинг, порошкоструйная чистка Air-Flow, полировка пастой и глубокое фторирование",
		standardDurationMinutes: 50,
		materials: [
			{
				materialId: "mat_air_flow_powder",
				standardQuantity: 25,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 20,
				clinicalRationaleRu: "25 г глицинового порошка Clinpro на полный зубной ряд",
			},
			{
				materialId: "mat_prophy_paste",
				standardQuantity: 3,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 30,
				clinicalRationaleRu: "3 г полировочной пасты Cleanic",
			},
			{
				materialId: "mat_optragate",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Мягкий ретрактор OptraGate",
			},
			{
				materialId: "mat_fluoride_varnish",
				standardQuantity: 0.5,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Флакон 0.5 мл Clinpro White Varnish для реминерализации",
			},
		],
	},

	// A16.07.001.001 — Удаление зуба
	{
		serviceCode: "A16.07.001.001",
		serviceTitle: "Удаление постоянного зуба (атравматичное с ревизией лунки)",
		specialty: "surgery",
		descriptionRu: "Атравматичная люксация, кюретаж лунки, гемостаз коллагеновой губкой и наложение швов",
		standardDurationMinutes: 35,
		materials: [
			{
				materialId: "mat_hemostatic_sponge",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Коллагеновая гемостатическая губка Альвостаз",
			},
			{
				materialId: "mat_suture_vicryl_40",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "1 шов Викрил 4-0 для фиксации десневого края лунки",
			},
			{
				materialId: "mat_surg_blade_15",
				standardQuantity: 1,
				isMandatory: true,
				defaultDiscrepancyAllowedPercent: 0,
				clinicalRationaleRu: "Лезвие скальпеля №15",
			},
		],
	},
];

/**
 * 5. Складские партии материалов в кабинетах (демо-остатки кресел)
 */
export const DENTAL_CABINET_STOCK_PRESETS: readonly CabinetStockBatch[] = [
	{
		batchId: "bat_filtek_2026_01",
		materialId: "mat_filtek_ultimate",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-FLT-8821",
		expirationDate: "2027-11-30",
		manufactureDate: "2024-11-01",
		quantityAvailable: 12.0, // 12 г (3 шприца)
		criticalThreshold: 2.0,
		unitCostKopecks: parseKopecks("1350.00"),
		supplierNameRu: "ООО «3М Россия»",
	},
	{
		batchId: "bat_filtek_expiring_soon",
		materialId: "mat_filtek_ultimate",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-FLT-OLD-19",
		expirationDate: "2026-09-10", // истекает через < 30 дней от августа 2026
		manufactureDate: "2023-09-01",
		quantityAvailable: 1.2,
		criticalThreshold: 2.0,
		unitCostKopecks: parseKopecks("1200.00"),
		supplierNameRu: "ООО «3М Россия»",
	},
	{
		batchId: "bat_sbu_2026_01",
		materialId: "mat_single_bond_universal",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-SBU-4401",
		expirationDate: "2028-04-15",
		manufactureDate: "2025-04-01",
		quantityAvailable: 4.5, // 4.5 мл
		criticalThreshold: 1.0,
		unitCostKopecks: parseKopecks("1950.00"),
		supplierNameRu: "ООО «3М Россия»",
	},
	{
		batchId: "bat_etch_2026_01",
		materialId: "mat_phosphoric_acid_37",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-ETCH-909",
		expirationDate: "2027-08-31",
		manufactureDate: "2025-08-01",
		quantityAvailable: 8.0,
		criticalThreshold: 2.0,
		unitCostKopecks: parseKopecks("180.00"),
		supplierNameRu: "АО «ВладМиВа»",
	},
	{
		batchId: "bat_enhance_2026_01",
		materialId: "mat_polishing_enhance",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-ENH-311",
		expirationDate: "2029-12-31",
		manufactureDate: "2025-01-10",
		quantityAvailable: 25,
		criticalThreshold: 5,
		unitCostKopecks: parseKopecks("160.00"),
		supplierNameRu: "Dentsply Sirona",
	},
	{
		batchId: "bat_cofferdam_2026_01",
		materialId: "mat_cofferdam_sheet",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-COFF-991",
		expirationDate: "2029-06-30",
		manufactureDate: "2024-06-01",
		quantityAvailable: 40,
		criticalThreshold: 10,
		unitCostKopecks: parseKopecks("115.00"),
		supplierNameRu: "Sanctuary Dental",
	},
	{
		batchId: "bat_matrix_2026_01",
		materialId: "mat_matrix_sectional_system",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-MATR-772",
		expirationDate: "2030-01-31",
		manufactureDate: "2025-01-01",
		quantityAvailable: 35,
		criticalThreshold: 8,
		unitCostKopecks: parseKopecks("95.00"),
		supplierNameRu: "ТОР ВМ",
	},
	{
		batchId: "bat_burs_2026_01",
		materialId: "mat_dental_burs_set",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-BURS-441",
		expirationDate: "2031-12-31",
		manufactureDate: "2025-02-01",
		quantityAvailable: 20,
		criticalThreshold: 5,
		unitCostKopecks: parseKopecks("210.00"),
		supplierNameRu: "NTI Kahla GmbH",
	},

	// Эндодонтия
	{
		batchId: "bat_gutta_2026_01",
		materialId: "mat_gutta_percha_points",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-GUT-552",
		expirationDate: "2028-06-30",
		manufactureDate: "2024-06-01",
		quantityAvailable: 45,
		criticalThreshold: 10,
		unitCostKopecks: parseKopecks("75.00"),
		supplierNameRu: "VDW Dental GmbH",
	},
	{
		batchId: "bat_ahplus_2026_01",
		materialId: "mat_sealer_ah_plus",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-AHP-771",
		expirationDate: "2027-10-31",
		manufactureDate: "2024-10-01",
		quantityAvailable: 8.5,
		criticalThreshold: 2.0,
		unitCostKopecks: parseKopecks("4900.00"),
		supplierNameRu: "Dentsply Sirona",
	},
	{
		batchId: "bat_hypo_2026_01",
		materialId: "mat_hypochlorite_na_3",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-HYP-101",
		expirationDate: "2027-01-31",
		manufactureDate: "2026-01-01",
		quantityAvailable: 220,
		criticalThreshold: 50,
		unitCostKopecks: parseKopecks("12.00"),
		supplierNameRu: "АО «Омега-Дент»",
	},
	{
		batchId: "bat_edta_2026_01",
		materialId: "mat_edta_gel_17",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-EDTA-882",
		expirationDate: "2027-05-31",
		manufactureDate: "2025-05-01",
		quantityAvailable: 15,
		criticalThreshold: 3,
		unitCostKopecks: parseKopecks("240.00"),
		supplierNameRu: "АО «ВладМиВа»",
	},
	{
		batchId: "bat_endondl_2026_01",
		materialId: "mat_endo_needle_side_vent",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-NDL-441",
		expirationDate: "2029-03-31",
		manufactureDate: "2024-03-01",
		quantityAvailable: 60,
		criticalThreshold: 10,
		unitCostKopecks: parseKopecks("45.00"),
		supplierNameRu: "Cerkamed",
	},
	{
		batchId: "bat_paper_2026_01",
		materialId: "mat_paper_points",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-PAP-992",
		expirationDate: "2028-12-31",
		manufactureDate: "2024-12-01",
		quantityAvailable: 120,
		criticalThreshold: 20,
		unitCostKopecks: parseKopecks("18.00"),
		supplierNameRu: "VDW Dental GmbH",
	},

	// Имплантация и хирургия (Кабинет №2)
	{
		batchId: "bat_osstem_ts3_sn01",
		materialId: "mat_implant_osstem_ts3",
		cabinetId: "cab_02_surgery",
		cabinetNameRu: "Кабинет №2 (Хирургия)",
		lotNumber: "LOT-OS-2026B1",
		serialNumber: "SN-OSST-7849120",
		expirationDate: "2029-12-31",
		manufactureDate: "2024-12-01",
		quantityAvailable: 1,
		criticalThreshold: 2,
		unitCostKopecks: parseKopecks("12500.00"),
		supplierNameRu: "Osstem Implant Co.",
	},
	{
		batchId: "bat_osstem_ts3_sn02",
		materialId: "mat_implant_osstem_ts3",
		cabinetId: "cab_02_surgery",
		cabinetNameRu: "Кабинет №2 (Хирургия)",
		lotNumber: "LOT-OS-2026B1",
		serialNumber: "SN-OSST-7849121",
		expirationDate: "2029-12-31",
		manufactureDate: "2024-12-01",
		quantityAvailable: 1,
		criticalThreshold: 2,
		unitCostKopecks: parseKopecks("12500.00"),
		supplierNameRu: "Osstem Implant Co.",
	},
	{
		batchId: "bat_abutment_2026_01",
		materialId: "mat_healing_abutment",
		cabinetId: "cab_02_surgery",
		cabinetNameRu: "Кабинет №2 (Хирургия)",
		lotNumber: "LOT-HAB-110",
		expirationDate: "2030-01-31",
		manufactureDate: "2025-01-01",
		quantityAvailable: 8,
		criticalThreshold: 2,
		unitCostKopecks: parseKopecks("2400.00"),
		supplierNameRu: "Osstem Implant Co.",
	},
	{
		batchId: "bat_gown_2026_01",
		materialId: "mat_surg_drape_gown_set",
		cabinetId: "cab_02_surgery",
		cabinetNameRu: "Кабинет №2 (Хирургия)",
		lotNumber: "LOT-GWN-982",
		expirationDate: "2028-09-30",
		manufactureDate: "2025-09-01",
		quantityAvailable: 14,
		criticalThreshold: 3,
		unitCostKopecks: parseKopecks("650.00"),
		supplierNameRu: "ЗАО «Здравмедтех»",
	},
	{
		batchId: "bat_vicryl_2026_01",
		materialId: "mat_suture_vicryl_40",
		cabinetId: "cab_02_surgery",
		cabinetNameRu: "Кабинет №2 (Хирургия)",
		lotNumber: "LOT-VIC-664",
		expirationDate: "2028-05-31",
		manufactureDate: "2024-05-01",
		quantityAvailable: 18,
		criticalThreshold: 4,
		unitCostKopecks: parseKopecks("380.00"),
		supplierNameRu: "Ethicon / Johnson & Johnson",
	},
	{
		batchId: "bat_blade_2026_01",
		materialId: "mat_surg_blade_15",
		cabinetId: "cab_02_surgery",
		cabinetNameRu: "Кабинет №2 (Хирургия)",
		lotNumber: "LOT-BLD-019",
		expirationDate: "2029-08-31",
		manufactureDate: "2024-08-01",
		quantityAvailable: 40,
		criticalThreshold: 10,
		unitCostKopecks: parseKopecks("85.00"),
		supplierNameRu: "Swann-Morton Ltd",
	},
	{
		batchId: "bat_saline_2026_01",
		materialId: "mat_saline_500ml",
		cabinetId: "cab_02_surgery",
		cabinetNameRu: "Кабинет №2 (Хирургия)",
		lotNumber: "LOT-SAL-332",
		expirationDate: "2027-04-30",
		manufactureDate: "2025-04-01",
		quantityAvailable: 12,
		criticalThreshold: 3,
		unitCostKopecks: parseKopecks("120.00"),
		supplierNameRu: "ОАО «Гротекс» (Solopharm)",
	},
	{
		batchId: "bat_sponge_2026_01",
		materialId: "mat_hemostatic_sponge",
		cabinetId: "cab_02_surgery",
		cabinetNameRu: "Кабинет №2 (Хирургия)",
		lotNumber: "LOT-ALV-771",
		expirationDate: "2027-11-30",
		manufactureDate: "2024-11-01",
		quantityAvailable: 22,
		criticalThreshold: 5,
		unitCostKopecks: parseKopecks("320.00"),
		supplierNameRu: "АО «Омега-Дент»",
	},

	// Анестетики (все кабинеты)
	{
		batchId: "bat_ultracain_cab1",
		materialId: "mat_articaine_ultracain",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-ULTRA-2026F",
		expirationDate: "2028-02-28",
		manufactureDate: "2025-02-01",
		quantityAvailable: 48,
		criticalThreshold: 10,
		unitCostKopecks: parseKopecks("230.00"),
		supplierNameRu: "Sanofi Aventis",
	},
	{
		batchId: "bat_needle_cab1",
		materialId: "mat_dental_needle_30g",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-NDL-998",
		expirationDate: "2029-06-30",
		manufactureDate: "2024-06-01",
		quantityAvailable: 95,
		criticalThreshold: 20,
		unitCostKopecks: parseKopecks("30.00"),
		supplierNameRu: "Septodont",
	},
	{
		batchId: "bat_topical_cab1",
		materialId: "mat_topical_anesthesia_gel",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-TOP-112",
		expirationDate: "2027-03-31",
		manufactureDate: "2025-03-01",
		quantityAvailable: 25,
		criticalThreshold: 5,
		unitCostKopecks: parseKopecks("50.00"),
		supplierNameRu: "Jen-Dental",
	},

	// Общие СИЗ
	{
		batchId: "bat_saliva_cab1",
		materialId: "mat_saliva_ejector",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-SE-2026",
		expirationDate: "2030-12-31",
		manufactureDate: "2025-01-01",
		quantityAvailable: 150,
		criticalThreshold: 30,
		unitCostKopecks: parseKopecks("14.00"),
		supplierNameRu: "Euronda",
	},
	{
		batchId: "bat_cotton_cab1",
		materialId: "mat_cotton_rolls",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-CR-2026",
		expirationDate: "2030-12-31",
		manufactureDate: "2025-01-01",
		quantityAvailable: 350,
		criticalThreshold: 50,
		unitCostKopecks: parseKopecks("4.00"),
		supplierNameRu: "Euronda",
	},
	{
		batchId: "bat_gloves_cab1",
		materialId: "mat_nitrile_gloves",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-GLV-882",
		expirationDate: "2029-08-31",
		manufactureDate: "2024-08-01",
		quantityAvailable: 75,
		criticalThreshold: 15,
		unitCostKopecks: parseKopecks("38.00"),
		supplierNameRu: "Top Glove Corp.",
	},
	{
		batchId: "bat_mask_cab1",
		materialId: "mat_surgical_mask",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-MSK-119",
		expirationDate: "2029-05-31",
		manufactureDate: "2024-05-01",
		quantityAvailable: 120,
		criticalThreshold: 20,
		unitCostKopecks: parseKopecks("16.00"),
		supplierNameRu: "ООО «КИТ»",
	},
	{
		batchId: "bat_airflow_cab1",
		materialId: "mat_air_flow_powder",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-AIR-774",
		expirationDate: "2027-10-31",
		manufactureDate: "2024-10-01",
		quantityAvailable: 80,
		criticalThreshold: 25,
		unitCostKopecks: parseKopecks("22.00"),
		supplierNameRu: "3M ESPE",
	},
	{
		batchId: "bat_prophy_cab1",
		materialId: "mat_prophy_paste",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-PST-991",
		expirationDate: "2028-01-31",
		manufactureDate: "2025-01-01",
		quantityAvailable: 45,
		criticalThreshold: 10,
		unitCostKopecks: parseKopecks("42.00"),
		supplierNameRu: "Kerr Dental",
	},
	{
		batchId: "bat_optragate_cab1",
		materialId: "mat_optragate",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-OPT-441",
		expirationDate: "2029-07-31",
		manufactureDate: "2024-07-01",
		quantityAvailable: 30,
		criticalThreshold: 5,
		unitCostKopecks: parseKopecks("220.00"),
		supplierNameRu: "Ivoclar Vivadent",
	},
	{
		batchId: "bat_varnish_cab1",
		materialId: "mat_fluoride_varnish",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		lotNumber: "LOT-VAR-332",
		expirationDate: "2027-06-30",
		manufactureDate: "2025-06-01",
		quantityAvailable: 10,
		criticalThreshold: 2,
		unitCostKopecks: parseKopecks("680.00"),
		supplierNameRu: "3M ESPE",
	},
];

/**
 * Вспомогательные функции поиска в каталоге
 */
export function getClinicalMaterialById(materialId: string): ClinicalMaterialDefinition | undefined {
	return CLINICAL_MATERIALS_CATALOG.find((m) => m.id === materialId);
}

export function getOrder804nServiceNorm(serviceCode: string): Order804nServiceNorm | undefined {
	return ORDER_804N_SERVICE_NORMS.find((s) => s.serviceCode === serviceCode);
}

export function getDiscrepancyReason(code: DiscrepancyReasonCode): DiscrepancyReasonDefinition {
	const found = DISCREPANCY_REASONS.find((r) => r.code === code);
	return found || DISCREPANCY_REASONS[0]!;
}
