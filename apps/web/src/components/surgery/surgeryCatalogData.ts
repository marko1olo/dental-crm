/**
 * surgeryCatalogData.ts — Единый SSOT каталог амбулаторной хирургии и паспортов имплантатов (DENTE CRM).
 * 4 канонических сценария (Удаление, Резекция/периостотомия, Синус-лифтинг/НКР, Имплантация),
 * чистая номенклатура, списание расходников с Soft Negative Overdraft, SOAP дневники и памятки (Мандаты 8b, 8e, 8n, 8x).
 */

import type { SurgicalServiceItem, SurgicalService804n, SurgicalOperationNorm, SurgicalWarehouseOverdraftStatus } from "@dental/shared";
import { CANONICAL_SURGICAL_OPERATION_NORMS } from "@dental/shared";

export type { SurgicalServiceItem, SurgicalService804n, SurgicalOperationNorm, SurgicalWarehouseOverdraftStatus };
export type SurgeryScenarioType = "extraction" | "resection_periostotomy" | "sinus_gbr" | "implant";
export type ExtractionComplexity = "simple" | "complex" | "impacted_dystopic";
export type SurgicalHemostasisMethod = "alvogyl" | "hemostatic_sponge" | "vicryl_suture" | "tampon";
export type SurgeryCapType = "fdm" | "plug";
export type MischBoneDensity = "D1" | "D2" | "D3" | "D4";

export interface SurgeryMaterialItem { readonly id?: string; readonly name: string; readonly unit: string; readonly quantity: number; readonly isWarehouseCritical?: boolean; readonly batchLot?: string; }
export interface SurgeryScenarioDefinition {
	readonly id: string; readonly type: SurgeryScenarioType; readonly titleRu: string; readonly subtitleRu: string; readonly defaultToothFdi: number; readonly icd10: string; readonly icd10Label: string; readonly serviceCode: string; readonly serviceNameRu: string; readonly defaultPriceRub: number; readonly defaultProtocolRu: string; readonly defaultRecommendationsRu: string; readonly standardMaterials: readonly SurgeryMaterialItem[];
}
export interface SurgeryImplantSystemSpec {
	readonly id: string; readonly brandName: string; readonly popularLines: readonly string[]; readonly platformName: string; readonly screwdriverType: string; readonly screwdriverAliasRu: string; readonly minTorqueNcm: number; readonly defaultTorqueNcm: number; readonly maxSafeTorqueNcm: number; readonly isqOptimalRange: string; readonly standardDiametersMm: readonly number[]; readonly standardLengthsMm: readonly number[]; readonly defaultDiameterMm: number; readonly defaultLengthMm: number; readonly defaultArticle: string; readonly defaultLotNumber: string; readonly defaultSerialNumber: string; readonly defaultExpirationDate: string;
}
export interface SurgeryWarehouseBatchItem {
	readonly id: string; readonly brand: string; readonly model: string; readonly sku: string; readonly lotNumber: string; readonly serialNumber: string; readonly diameterMm: number; readonly lengthMm: number; readonly availableQuantity: number; readonly expirationDate: string;
}
export interface SurgicalMemoParams {
	readonly patientName?: string; readonly toothFdi?: number; readonly doctorName?: string; readonly complexity?: ExtractionComplexity; readonly hasSutures?: boolean; readonly sutureRemovalDays?: number; readonly clinicPhone?: string; readonly implantBrand?: string; readonly capType?: "fdm" | "plug";
}
export type PostExtractionMemoParams = SurgicalMemoParams;
export interface StandardImplantationParams {
	readonly toothFdi?: number; readonly brand?: string; readonly model?: string; readonly diameterMm?: number; readonly lengthMm?: number; readonly torqueNcm?: number; readonly isq?: number; readonly boneDensity?: string; readonly lotNumber?: string; readonly serialNumber?: string; readonly capType?: "fdm" | "plug"; readonly sutureMaterial?: string; readonly postOpXray?: boolean;
}
export interface SurgicalMaterialDeductionResult {
	readonly success: boolean; readonly isOverdraft: boolean; readonly deductedItems: readonly { readonly name: string; readonly unit: string; readonly quantity: number; readonly isOverdraft: boolean }[]; readonly messageRu: string;
}

export const COMMON_SURGERY_TEETH = [46, 36, 16, 26, 48, 38, 18, 28, 11, 21, 14, 24, 34, 44] as const;

export const EXTRACTION_SURGICAL_CODES = {
	SIMPLE: "A16.07.001", COMPLEX_SEPARATION: "A16.07.001.001", IMPACTED_DYSTOPIC: "A16.07.001.002",
	SINUS_LIFT: "A16.07.041.001", BONE_GRAFT: "A16.07.041", CURETTAGE: "A16.07.026",
	SUTURE_VICRYL: "A16.07.097", ANESTHESIA_INFILTRATION: "A11.07.015", ANESTHESIA_CONDUCTION: "A11.07.016",
} as const;
export const EXTRACTION_804N_CODES = EXTRACTION_SURGICAL_CODES;

export const EXTRACTION_COMPLEXITY_OPTIONS = [
	{ id: "simple" as const, nameRu: "Простое удаление", labelRu: "Простое удаление", shortBadge: "Простое", descriptionRu: "Подвижный или однокорневой зуб без разделения корней", code: EXTRACTION_SURGICAL_CODES.SIMPLE, code804n: EXTRACTION_SURGICAL_CODES.SIMPLE, priceRub: 3500 },
	{ id: "complex" as const, nameRu: "Сложное удаление (сепарация корней)", labelRu: "Сложное удаление (сепарация корней)", shortBadge: "Сложное", descriptionRu: "Многокорневой зуб, разъединение корней бором Lindemann", code: EXTRACTION_SURGICAL_CODES.COMPLEX_SEPARATION, code804n: EXTRACTION_SURGICAL_CODES.COMPLEX_SEPARATION, priceRub: 5500 },
	{ id: "impacted_dystopic" as const, nameRu: "Атипичное удаление (8-ка / дистопия)", labelRu: "Атипичное удаление (8-ка / дистопия)", shortBadge: "Атипичное 8-ка", descriptionRu: "Ретинированный зуб мудрости, трепанация кортикальной пластинки", code: EXTRACTION_SURGICAL_CODES.IMPACTED_DYSTOPIC, code804n: EXTRACTION_SURGICAL_CODES.IMPACTED_DYSTOPIC, priceRub: 8500 },
] as const;

export const SURGICAL_HEMOSTASIS_OPTIONS = [
	{ id: "alvogyl" as const, nameRu: "Альвожил (паста/губка)", shortBadge: "Альвожил", descriptionRu: "Антисептический компресс с йодоформом в лунку" },
	{ id: "hemostatic_sponge" as const, nameRu: "Гемостатическая губка", shortBadge: "Губка", descriptionRu: "Коллагеновая губка для надежного гемостаза" },
	{ id: "vicryl_suture" as const, nameRu: "Шов Викрил 4-0", shortBadge: "Викрил 4-0", descriptionRu: "Сближение краев лунки узловыми швами" },
	{ id: "tampon" as const, nameRu: "Давящий марлевый тампон", shortBadge: "Тампон", descriptionRu: "Механическое сдавление марлевым шариком 20 минут" },
] as const;

export const SURGICAL_ANESTHETICS = [
	{ id: "art_100", nameRu: "Обезболивание (Артикаин 1:100 000 1.7 мл)", shortTitle: "Артикаин 1:100к" },
	{ id: "art_200", nameRu: "Обезболивание (Артикаин 1:200 000 1.7 мл)", shortTitle: "Артикаин 1:200к" },
	{ id: "mepi_plain", nameRu: "Обезболивание (Мепивакаин 3% 1.7 мл)", shortTitle: "Мепивакаин без адреналина" },
] as const;

export const DENTAL_IMPLANTATION_NORM_TEXT = "Инфильтрационная анестезия Артикаин 1:100 000 1.7 мл. Разрез по гребню альвеолярного отростка, отслоен слизисто-надкостничный лоскут. Препарирование ложа фрезами с охлаждением физраствором. Установлен дентальный имплантат, первичная торк-стабильность 35 Н·см. Установлен формирователь десны / винт-заглушка. Ушивание раны шовным материалом ПГА 4-0. Гемостаз полный. Рекомендации даны.";
export const SIMPLE_EXTRACTION_NORM_TEXT = "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Круговая связка зуба отслоена. Люксация элеватором и щипцами. Атравматичная тракция зуба из альвеолы. Тщательный кюретаж лунки острой ложкой, удаление грануляций. Антисептическая обработка 0.05% хлоргексидином. Местный гемостаз: гемостатическая губка Альвостаз. Наложены узловые швы Викрил 4-0. Гемостаз полный. Рекомендации даны.";
export const COMPLEX_EXTRACTION_NORM_TEXT = "Инфильтрационная и проводниковая анестезия Sol. Articaini 4% 1:100 000 — 3.4 мл. Разрез слизистой, отслоен лоскут. Сепарация корней бором Lindemann с водяным охлаждением. Атравматичная люксация фрагментов корней элеватором. Тщательный кюретаж лунки, ревизия. Местный гемостаз губкой Альвожил. Рана ушита швами Викрил 4-0. Давящий марлевый тампон. Гемостаз полный. Рекомендации даны.";
export const ATYPICAL_EXTRACTION_NORM_TEXT = "Проводниковая торусальная и инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 3.4 мл. Разрез слизистой в ретромолярной области, выкраивание лоскута. Трепанация кортикальной пластинки, сепарация коронки твердосплавным бором Lindemann с охлаждением физраствором. Атравматичное извлечение фрагментов. Тщательный кюретаж лунки. Лунка заполнена губкой Альвожил. Рана ушита узловыми швами Викрил 4-0. Гемостаз полный. Рекомендации даны.";
export const SINUS_LIFT_GBR_NORM_TEXT = "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 3.4 мл. Трапециевидный разрез в боковом отделе верхней челюсти, скелетирование передне-латеральной стенки пазухи. Формирование латерального окна пьезотомом. Аккуратная элевация мембраны Шнайдера без перфораций. В субантральное пространство внесен костный графт Geistlich Bio-Oss (0.5 г). Окно перекрыто резорбируемой коллагеновой мембраной Geistlich Bio-Gide (16×22 мм), фиксировано титановыми пинами. Рана послойно ушита шовным материалом Викрил 4-0. Гемостаз полный. Рекомендации даны.";
export const CLOSED_SINUS_LIFT_NORM_TEXT = "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Разрез по гребню альвеолярного отростка, отслоен лоскут. Препарирование костного ложа с недоходом до дна пазухи 1 мм. Трансальвеолярная элевация дна синуса остеотомами Саммерса. Проба Вальсальвы отрицательная. Внесение графта Bio-Oss 0.5 г. Установка имплантата с первичной стабильностью 35 Н·см. Ушивание раны Викрил 4-0 без натяжения. Гемостаз полный. Рекомендации даны.";
export const PERIOSTOTOMY_NORM_TEXT = "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Разрез слизистой и надкостницы длиной 2 см по переходной складке в проекции корня причинного зуба до кости. Эвакуация гнойного экссудата. Промывание 0.05% хлоргексидином. В рану введен перчаточный резиновый ленточный дренаж-выпускник. Гемостаз полный. Назначена антибиотикотерапия. Контрольный осмотр и смена дренажа завтра.";
export const APICOECTOMY_NORM_TEXT = "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Трапециевидный разрез слизистой в проекции верхушки корня, отслоен лоскут. Трепанация кортикальной пластинки шаровидным бором. Резекция верхушки корня на 3 мм под углом 90°. Цистэктомия очага. Ретроградное пломбирование МТА (ProRoot). Контроль гемостаза. Ушивание раны узловыми швами Монофиламент 5-0. Рекомендации даны.";
export const PERICORONITIS_NORM_TEXT = "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Иссечение воспаленного слизистого капюшона над коронкой ретинированного зуба скальпелем. Промывание антисептиками (хлоргексидин 0.05%), йодоформная турунда. Гемостаз полный. Рекомендации даны.";
export const SURGERY_IMPLANT_SYSTEMS: readonly SurgeryImplantSystemSpec[] = [
	{ id: "osstem", brandName: "Osstem", popularLines: ["TS III SA", "TS III SOI", "TS IV"], platformName: "Внутренний конус Морзе 11° с шестигранником", screwdriverType: "Hex 1.2 mm", screwdriverAliasRu: "Шестигранник 1.2 мм (Osstem)", minTorqueNcm: 25, defaultTorqueNcm: 35, maxSafeTorqueNcm: 45, isqOptimalRange: "65–85", standardDiametersMm: [3.5, 4.0, 4.5, 5.0], standardLengthsMm: [8.5, 10.0, 11.5, 13.0], defaultDiameterMm: 4.0, defaultLengthMm: 10.0, defaultArticle: "TS3S4010S", defaultLotNumber: "24C1208", defaultSerialNumber: "SN-884210", defaultExpirationDate: "2029-06-30" },
	{ id: "straumann", brandName: "Straumann", popularLines: ["BLX", "Bone Level SLA", "SLActive"], platformName: "CrossFit / TorcFit", screwdriverType: "Torx / SCS 1.25 mm", screwdriverAliasRu: "Torx SCS 1.25 мм (Straumann)", minTorqueNcm: 25, defaultTorqueNcm: 35, maxSafeTorqueNcm: 45, isqOptimalRange: "70–85", standardDiametersMm: [3.3, 3.75, 4.1, 4.8], standardLengthsMm: [8.0, 10.0, 12.0, 14.0], defaultDiameterMm: 4.1, defaultLengthMm: 10.0, defaultArticle: "021.2310", defaultLotNumber: "24B0812", defaultSerialNumber: "SN-102944", defaultExpirationDate: "2029-03-31" },
	{ id: "nobel_biocare", brandName: "Nobel Biocare", popularLines: ["NobelActive", "NobelReplace CC", "NobelParallel"], platformName: "Conical Connection (конусное соединение)", screwdriverType: "Unigrip", screwdriverAliasRu: "Отвертка Unigrip (Nobel)", minTorqueNcm: 30, defaultTorqueNcm: 35, maxSafeTorqueNcm: 45, isqOptimalRange: "70–85", standardDiametersMm: [3.5, 4.3, 5.0], standardLengthsMm: [8.5, 10.0, 11.5, 13.0], defaultDiameterMm: 4.3, defaultLengthMm: 10.0, defaultArticle: "NP-35115", defaultLotNumber: "24A9914", defaultSerialNumber: "SN-551042", defaultExpirationDate: "2028-12-31" },
	{ id: "dentium", brandName: "Dentium", popularLines: ["SuperLine", "SimpleLine II", "Implantium"], platformName: "Внутренний конус 11° с шестигранником 1.27 мм", screwdriverType: "Hex 1.27 mm", screwdriverAliasRu: "Шестигранник 1.27 мм (Dentium)", minTorqueNcm: 30, defaultTorqueNcm: 35, maxSafeTorqueNcm: 45, isqOptimalRange: "68–85", standardDiametersMm: [3.6, 4.0, 4.5, 5.0], standardLengthsMm: [8.0, 10.0, 12.0, 14.0], defaultDiameterMm: 4.0, defaultLengthMm: 10.0, defaultArticle: "FX4010", defaultLotNumber: "24D0415", defaultSerialNumber: "SN-304198", defaultExpirationDate: "2029-08-31" },
	{ id: "ankylos", brandName: "Ankylos", popularLines: ["C/X TissueCare"], platformName: "Конус Морзе 5.7° без микрозазора", screwdriverType: "Hex 1.0 mm", screwdriverAliasRu: "Шестигранник 1.0 мм (Ankylos)", minTorqueNcm: 25, defaultTorqueNcm: 35, maxSafeTorqueNcm: 45, isqOptimalRange: "70–85", standardDiametersMm: [3.5, 4.5, 5.5], standardLengthsMm: [8.0, 9.5, 11.0, 14.0], defaultDiameterMm: 4.5, defaultLengthMm: 11.0, defaultArticle: "A-B110-CX", defaultLotNumber: "24E0119", defaultSerialNumber: "SN-772019", defaultExpirationDate: "2029-01-31" },
];
export const SURGERY_DEFAULT_BATCHES: readonly SurgeryWarehouseBatchItem[] = [
	{ id: "inv-oss-4010", brand: "Osstem", model: "TS III SA", sku: "TS3S4010S", lotNumber: "24C1208", serialNumber: "SN-884210", diameterMm: 4.0, lengthMm: 10.0, availableQuantity: 8, expirationDate: "2029-06-30" },
	{ id: "inv-str-4110", brand: "Straumann", model: "Bone Level SLA", sku: "021.2310", lotNumber: "24B0812", serialNumber: "SN-102944", diameterMm: 4.1, lengthMm: 10.0, availableQuantity: 5, expirationDate: "2029-03-31" },
	{ id: "inv-nob-4310", brand: "Nobel Biocare", model: "NobelActive", sku: "NP-35115", lotNumber: "24A9914", serialNumber: "SN-551042", diameterMm: 4.3, lengthMm: 10.0, availableQuantity: 4, expirationDate: "2028-12-31" },
	{ id: "inv-den-4010", brand: "Dentium", model: "SuperLine", sku: "FX4010", lotNumber: "24D0415", serialNumber: "SN-304198", diameterMm: 4.0, lengthMm: 10.0, availableQuantity: 6, expirationDate: "2029-08-31" },
	{ id: "inv-ank-4511", brand: "Ankylos", model: "C/X", sku: "A-B110-CX", lotNumber: "24E0119", serialNumber: "SN-772019", diameterMm: 4.5, lengthMm: 11.0, availableQuantity: 3, expirationDate: "2029-01-31" },
];
export const SURGERY_GRAFT_CATALOG = [{ id: "graft-bio-oss-05", name: "Geistlich Bio-Oss гранулят 0.5 г", unitPriceRub: 8500 }, { id: "graft-bio-oss-10", name: "Geistlich Bio-Oss гранулят 1.0 г", unitPriceRub: 14200 }, { id: "graft-cerabone-05", name: "Botiss Cerabone гранулят 0.5 г", unitPriceRub: 7800 }] as const;
export const SURGERY_MEMBRANE_CATALOG = [{ id: "memb-bio-gide-1622", name: "Geistlich Bio-Gide резорбируемая 16×22 мм", unitPriceRub: 9800 }, { id: "memb-bio-gide-2525", name: "Geistlich Bio-Gide резорбируемая 25×25 мм", unitPriceRub: 15400 }, { id: "memb-jason-1520", name: "Botiss Jason нативная перикардиальная 15×20 мм", unitPriceRub: 11200 }] as const;
export const SURGERY_SUTURE_CATALOG = [{ id: "sut-vicryl-40", name: "Ethicon Викрил 4-0 (полиглактин 910)", unitPriceRub: 950 }, { id: "sut-prolene-40", name: "Ethicon Пролен 4-0 (полипропилен)", unitPriceRub: 1150 }, { id: "sut-mono-50", name: "Монофиламент ПГА-РАПИД 5-0", unitPriceRub: 850 }] as const;

export const SURGERY_SCENARIOS: Record<SurgeryScenarioType, SurgeryScenarioDefinition> = {
	extraction: {
		id: "scen-extraction", type: "extraction", titleRu: "Удаление зуба", subtitleRu: "Простое, сложное с разъединением корней или атипичное",
		defaultToothFdi: 36, icd10: "K08.8", icd10Label: "Другие уточненные изменения зубов и опорного аппарата", serviceCode: "A16.07.001", serviceNameRu: "Удаление постоянного зуба (простое / сложное)", defaultPriceRub: 4500, defaultProtocolRu: SIMPLE_EXTRACTION_NORM_TEXT, defaultRecommendationsRu: "Марлевый тампон сплюнуть через 20 минут. Не полоскать рот 24 часа. При болях — Нимесил 1 пак. Исключить горячее, баню и нагрузки на 3 дня.",
		standardMaterials: [{ id: "mat-art-1", name: "Анестетик Артикаин 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false }, { id: "mat-sponge-1", name: "Губка гемостатическая Альвостаз / Альвожиль", unit: "шт.", quantity: 1, isWarehouseCritical: false }, { id: "mat-sut-1", name: "Шовный материал Ethicon Викрил 4-0", unit: "шт.", quantity: 1, isWarehouseCritical: false }],
	},
	resection_periostotomy: {
		id: "scen-resection", type: "resection_periostotomy", titleRu: "Резекция / Периостотомия", subtitleRu: "Периостотомия при периостите, резекция верхушки корня (апико)",
		defaultToothFdi: 12, icd10: "K04.7", icd10Label: "Периапикальный абсцесс без свища (острый периостит)", serviceCode: "A16.07.011", serviceNameRu: "Периостотомия / Резекция верхушки корня", defaultPriceRub: 7500, defaultProtocolRu: PERIOSTOTOMY_NORM_TEXT, defaultRecommendationsRu: "Холод на щеку 15 минут каждые 2 часа в первый день. Дренаж не вытягивать. Антибиотикотерапия (Амоксиклав 1000 мг 2 р/сут). Осмотр завтра.",
		standardMaterials: [{ id: "mat-art-2", name: "Анестетик Артикаин 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false }, { id: "mat-blade-1", name: "Лезвие скальпеля стерильное #15", unit: "шт.", quantity: 1, isWarehouseCritical: false }, { id: "mat-drain-1", name: "Дренаж ленточный резиновый йодоформный", unit: "шт.", quantity: 1, isWarehouseCritical: false }],
	},
	sinus_gbr: {
		id: "scen-sinus-gbr", type: "sinus_gbr", titleRu: "Синус-лифтинг & НКР", subtitleRu: "Субантральная костная пластика, барьерная мембрана, пины",
		defaultToothFdi: 16, icd10: "K08.2", icd10Label: "Атрофия беззубого альвеолярного края", serviceCode: "A16.07.041", serviceNameRu: "Синус-лифтинг открытый (субантральная аугментация) и НКР", defaultPriceRub: 35000, defaultProtocolRu: SINUS_LIFT_GBR_NORM_TEXT, defaultRecommendationsRu: "Не сморкаться 14 дней. Капли в нос сосудосуживающие (Тизин / Отривин). Антибиотикотерапия 7 дней. Контрольный осмотр на 3 и 7 сутки.",
		standardMaterials: [{ id: "mat-art-3", name: "Анестетик Артикаин 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 2, isWarehouseCritical: false }, { id: "mat-graft-1", name: "Костный графт Geistlich Bio-Oss 0.5 г", unit: "упак.", quantity: 1, isWarehouseCritical: true }, { id: "mat-memb-1", name: "Мембрана Geistlich Bio-Gide 16×22 мм", unit: "шт.", quantity: 1, isWarehouseCritical: true }, { id: "mat-pins-1", name: "Титановые пины костные Bone-Fix", unit: "шт.", quantity: 4, isWarehouseCritical: false }],
	},
	implant: {
		id: "scen-implant", type: "implant", titleRu: "Дентальная имплантация", subtitleRu: "Установка дентального имплантата с паспортом изделия",
		defaultToothFdi: 46, icd10: "K08.1", icd10Label: "Потеря зубов вследствие удаления или травмы", serviceCode: "A16.07.054", serviceNameRu: "Операция установки дентального имплантата", defaultPriceRub: 45000, defaultProtocolRu: DENTAL_IMPLANTATION_NORM_TEXT, defaultRecommendationsRu: "Холод на щеку 15 минут каждые 2 часа в первый день. Ванночки с 0.05% хлоргексидином со 2 дня. Щадящая диета 14 дней. Осмотр через 7 дней.",
		standardMaterials: [{ id: "mat-art-4", name: "Анестетик Артикаин 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false }, { id: "mat-imp-1", name: "Дентальный имплантат титановый (Osstem)", unit: "шт.", quantity: 1, isWarehouseCritical: true }, { id: "mat-cap-1", name: "Формирователь десны (ФДМ)", unit: "шт.", quantity: 1, isWarehouseCritical: false }, { id: "mat-sut-2", name: "Шовный материал Ethicon Викрил 4-0", unit: "шт.", quantity: 1, isWarehouseCritical: false }],
	},
};

export const SURGICAL_OPERATION_NORMS: readonly SurgicalOperationNorm[] = CANONICAL_SURGICAL_OPERATION_NORMS;
export const CANONICAL_SURGICAL_OPERATION_NORMS_ALIAS = SURGICAL_OPERATION_NORMS;

export function getImplantSystemById(id: string): SurgeryImplantSystemSpec {
	return SURGERY_IMPLANT_SYSTEMS.find((s) => s.id === id || s.brandName.toLowerCase() === id.toLowerCase()) || SURGERY_IMPLANT_SYSTEMS[0]!;
}

export function computeOsteointegrationExpectedDate(dateIso = new Date().toISOString(), toothFdi = 46): string {
	const base = new Date(dateIso);
	const isMandible = toothFdi >= 31 && toothFdi <= 48;
	base.setMonth(base.getMonth() + (isMandible ? 3 : 5));
	return base.toISOString().split("T")[0]!;
}

export function createDefaultPassportRecord(params: {
	toothFdi: number; brand: string; patientName: string; patientId: string; doctorName: string; capType?: SurgeryCapType; torqueNcm?: number;
}) {
	const sys = getImplantSystemById(params.brand);
	return {
		passportId: `PASSPORT-${params.toothFdi}-${Date.now().toString().slice(-6)}`, toothFdi: params.toothFdi, brand: sys.brandName,
		torqueNcm: params.torqueNcm ?? sys.defaultTorqueNcm, capType: params.capType ?? "fdm", lotNumber: sys.defaultLotNumber, serialNumber: sys.defaultSerialNumber, patientName: params.patientName, patientId: params.patientId, doctorName: params.doctorName, diameterMm: sys.defaultDiameterMm, lengthMm: sys.defaultLengthMm, warrantyYears: 10,
	};
}

export function evaluateSurgerySoftOverdraft(materials: readonly { name: string; isWarehouseCritical?: boolean }[], forceDelay = false, specificDelayedItems?: readonly string[]) {
	const pending = specificDelayedItems && specificDelayedItems.length > 0 ? [...specificDelayedItems] : forceDelay ? materials.map((m) => m.name) : [];
	return {
		hasOverdraft: pending.length > 0, warningRu: pending.length > 0 ? "Мягкий овердрафт склада" : "Складской учет в норме",
		detailsRu: pending.length > 0 ? `Расходные материалы (${pending.join(", ")}) списаны в мягкий овердрафт. Операция не блокируется: списание зафиксировано.` : "Все компоненты и стерильные расходники списаны штатно со склада кабинета.",
		pendingItems: pending, canProceed: true as const,
	};
}
export const evaluateWarehouseOverdraft = evaluateSurgerySoftOverdraft;

export async function quickDeductSurgicalMaterials(params: {
	materials: readonly { name: string; unit: string; quantity: number; isWarehouseCritical?: boolean }[];
	hasWarehouseDelay?: boolean; operationTitle?: string; organizationId?: string;
}): Promise<SurgicalMaterialDeductionResult> {
	const isOverdraft = Boolean(params.hasWarehouseDelay);
	const deductedItems = params.materials.map((m) => ({ name: m.name, unit: m.unit, quantity: m.quantity, isOverdraft }));
	const messageRu = isOverdraft ? `Списано ${params.materials.length} поз. под операцию «${params.operationTitle || "Хирургия"}» в мягкий овердрафт без блокировки врача.` : `Материалы операции «${params.operationTitle || "Хирургия"}» (${params.materials.length} поз.) успешно списаны.`;
	if (typeof window !== "undefined") {
		window.dispatchEvent(new CustomEvent("dente-quick-writeoff-surgical-materials", { detail: { materials: deductedItems, isOverdraft, operationTitle: params.operationTitle, timestamp: new Date().toISOString() } }));
	}
	return { success: true, isOverdraft, deductedItems, messageRu };
}

export function buildStandardExtractionProtocolText(params: {
	toothFdi?: number; complexity?: ExtractionComplexity; hemostasis?: readonly SurgicalHemostasisMethod[];
	sutureMaterial?: string; anesthesia?: string; postOpXray?: boolean;
} = {}): string {
	const toothStr = params.toothFdi ? `зуба FDI #${params.toothFdi}` : "зуба";
	const complexity = params.complexity ?? "simple";
	const hemo = params.hemostasis ?? ["alvogyl", "tampon"];
	const suture = params.sutureMaterial || "Викрил 4-0";
	const hemoParts: string[] = [];
	if (hemo.includes("alvogyl")) hemoParts.push("в лунку внесен антисептический компресс Альвожил");
	if (hemo.includes("hemostatic_sponge")) hemoParts.push("лунка заполнена рассасывающейся гемостатической коллагеновой губкой");
	if (hemo.includes("vicryl_suture") || complexity === "complex" || complexity === "impacted_dystopic") hemoParts.push(`края раны сближены, наложены узловые швы (${suture})`);
	if (hemo.includes("tampon")) hemoParts.push("наложен давящий марлевый тампон на 20 минут");
	const hemoText = hemoParts.length > 0 ? `Местный гемостаз: ${hemoParts.join(", ")}.` : "Местный гемостаз: в лунку внесен Альвожил, наложен давящий марлевый тампон.";
	const xrayText = params.postOpXray ? " Выполнен контрольный радиовизиографический снимок: остатков корней и инородных тел в лунке нет." : "";
	if (complexity === "complex") {
		const anesth = params.anesthesia || "Инфильтрационная и проводниковая анестезия Sol. Articaini 4% 1:100 000 — 3.4 мл.";
		return `${anesth} Разрез слизистой в области ${toothStr}, отслоен лоскут. Сепарация корней твердосплавным бором Lindemann с водяным охлаждением физраствором. Атравматичная люксация фрагментов корней элеватором, удаление корней щипцами. Тщательный кюретаж лунки острой ложкой, удаление грануляций. Антисептическая обработка 0.05% раствором хлоргексидина. ${hemoText} Гемостаз полный.${xrayText} Рекомендации даны.`;
	}
	if (complexity === "impacted_dystopic") {
		const anesth = params.anesthesia || "Проводниковая торусальная и инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 3.4 мл.";
		return `${anesth} Разрез слизистой в проекции ретинированного ${toothStr}, выкраивание лоскута. Трепанация кортикальной пластинки, сепарация коронки и корней бором Lindemann с водяным охлаждением. Атравматичная люксация элеватором и извлечение фрагментов. Тщательный кюретаж лунки. Антисептическая обработка 0.05% хлоргексидином. ${hemoText} Гемостаз полный.${xrayText} Рекомендации даны.`;
	}
	const anesth = params.anesthesia || "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл.";
	return `${anesth} Круговая связка ${toothStr} отслоена гладилкой. Наложены щипцы / элеватор, продвинуты под десну, фиксированы. Люксация элеватором и ротация щипцами. Тракция зуба из альвеолы. Тщательный кюретаж лунки острой ложкой, ревизия, удаление грануляций. Антисептическая обработка 0.05% хлоргексидином. ${hemoText} Гемостаз полный.${xrayText} Рекомендации даны.`;
}

export function buildStandardImplantationProtocolText(params: StandardImplantationParams = {}): string {
	const toothStr = params.toothFdi ? `зуба FDI #${params.toothFdi}` : "имплантации";
	const brand = params.brand || "Dentium";
	const model = params.model ? ` ${params.model}` : "";
	const dia = params.diameterMm ?? 4.0;
	const len = params.lengthMm ?? 10.0;
	const torque = params.torqueNcm ?? 35;
	const isq = params.isq ?? 72;
	const densityStr = params.boneDensity ? ` Плотность кости по Misch: ${params.boneDensity}.` : "";
	const lotSnStr = params.lotNumber || params.serialNumber ? ` LOT: ${params.lotNumber || "—"}, SN: ${params.serialNumber || "—"}.` : "";
	const capStr = params.capType === "plug" ? "Установлен винт-заглушка (двухэтапный протокол с ушиванием наглухо)." : "Установлен формирователь десны (ФДМ).";
	const suture = params.sutureMaterial || "Prolene 4-0";
	const xrayStr = params.postOpXray !== false ? " Выполнен контрольный прицельный радиовизиографический снимок: положение имплантата правильное, субкрестально 0.5 мм." : "";
	return `Инфильтрационная анестезия Артикаин 1:100 000 — 1.7 мл. Разрез по гребню альвеолярного отростка в области ${toothStr}, отслоен слизисто-надкостничный лоскут. Препарирование ложа фрезами по хирургическому протоколу ${brand} с обильным охлаждением стерильным 0.9% NaCl (800 об/мин). Установлен дентальный имплантат ${brand}${model} Ø ${dia} × ${len} мм.${densityStr}${lotSnStr} Первичная торк-стабильность ${torque} Н·см, RFA стабильность ISQ ${isq} (высокая первичная фиксация). ${capStr} Мобилизация лоскута, наложены узловые швы ${suture} без натяжения. Гемостаз полный.${xrayStr} Рекомендации выданы.`;
}

export function getExtractionSurgicalServices(params: {
	complexity: ExtractionComplexity; toothFdi?: number; hemostasis?: readonly SurgicalHemostasisMethod[]; sutureMaterial?: string;
}): readonly SurgicalServiceItem[] {
	const tooth = params.toothFdi; const comp = params.complexity; const hemo = params.hemostasis || [];
	const primaryCode = comp === "complex" ? EXTRACTION_SURGICAL_CODES.COMPLEX_SEPARATION : comp === "impacted_dystopic" ? EXTRACTION_SURGICAL_CODES.IMPACTED_DYSTOPIC : EXTRACTION_SURGICAL_CODES.SIMPLE;
	const primaryName = comp === "complex" ? "Удаление зуба сложное с разъединением корней" : comp === "impacted_dystopic" ? "Операция удаления ретинированного / дистопированного зуба" : "Удаление постоянного зуба (простое)";
	const primaryPrice = comp === "complex" ? 6000 : comp === "impacted_dystopic" ? 9500 : 3500;
	const items: SurgicalServiceItem[] = [
		{ code: primaryCode, nameRu: primaryName, name: primaryName, priceRub: primaryPrice, quantity: 1, suggestedPriceRub: primaryPrice, toothNumber: tooth, stageKind: "stage_2_surgery" as const, isPrimary: true },
		{ code: EXTRACTION_SURGICAL_CODES.CURETTAGE, nameRu: "Кюретаж лунки удаленного зуба (ревизия и гемостаз)", name: "Кюретаж лунки удаленного зуба (ревизия и гемостаз)", priceRub: 1200, quantity: 1, suggestedPriceRub: 1200, toothNumber: tooth, stageKind: "stage_2_surgery" as const },
	];
	if (comp === "complex" || comp === "impacted_dystopic" || hemo.includes("vicryl_suture")) {
		const sutName = params.sutureMaterial || "Викрил 4-0";
		items.push({ code: EXTRACTION_SURGICAL_CODES.SUTURE_VICRYL, nameRu: `Наложение шва на слизистую оболочку рта (${sutName})`, name: `Наложение шва на слизистую оболочку рта (${sutName})`, priceRub: 1500, quantity: 1, suggestedPriceRub: 1500, toothNumber: tooth, stageKind: "stage_2_surgery" as const });
	}
	const isCond = comp === "impacted_dystopic";
	items.push({
		code: isCond ? EXTRACTION_SURGICAL_CODES.ANESTHESIA_CONDUCTION : EXTRACTION_SURGICAL_CODES.ANESTHESIA_INFILTRATION,
		nameRu: isCond ? "Проводниковая (торусальная) анестезия (Артикаин)" : "Инфильтрационная анестезия (Артикаин 1:100 000)",
		name: isCond ? "Проводниковая (торусальная) анестезия (Артикаин)" : "Инфильтрационная анестезия (Артикаин 1:100 000)",
		priceRub: isCond ? 1200 : 900, quantity: 1, suggestedPriceRub: isCond ? 1200 : 900, toothNumber: tooth, stageKind: "stage_2_surgery" as const,
	});
	return items;
}
export const getExtractionServices = getExtractionSurgicalServices;
export const getExtractionServices804n = getExtractionSurgicalServices;

export function getSinusGbrSurgicalServices(params: { isClosedSinus: boolean; toothFdi?: number; membrane?: string; hasPins?: boolean }): readonly SurgicalServiceItem[] {
	const tooth = params.toothFdi;
	return [
		params.isClosedSinus
			? { code: EXTRACTION_SURGICAL_CODES.SINUS_LIFT, nameRu: "Синус-лифтинг закрытый", name: "Синус-лифтинг закрытый", priceRub: 18000, quantity: 1, suggestedPriceRub: 18000, toothNumber: tooth, stageKind: "stage_2_surgery" as const, isPrimary: true }
			: { code: EXTRACTION_SURGICAL_CODES.BONE_GRAFT, nameRu: "Костная пластика (синус-лифтинг & НКР)", name: "Костная пластика (синус-лифтинг & НКР)", priceRub: 35000, quantity: 1, suggestedPriceRub: 35000, toothNumber: tooth, stageKind: "stage_2_surgery" as const, isPrimary: true },
		{ code: EXTRACTION_SURGICAL_CODES.SUTURE_VICRYL, nameRu: "Шов ПГА/Викрил 4-0", name: "Шов ПГА/Викрил 4-0", priceRub: 1500, quantity: 1, suggestedPriceRub: 1500, toothNumber: tooth, stageKind: "stage_2_surgery" as const },
		{ code: EXTRACTION_SURGICAL_CODES.ANESTHESIA_INFILTRATION, nameRu: "Инфильтрационная анестезия", name: "Инфильтрационная анестезия", priceRub: 900, quantity: 1, suggestedPriceRub: 900, toothNumber: tooth, stageKind: "stage_2_surgery" as const },
	];
}
export const getSinusGbrServices = getSinusGbrSurgicalServices;
export const getSinusGbrServices804n = getSinusGbrSurgicalServices;

export function buildPostExtractionMemoText(params: SurgicalMemoParams = {}): string {
	const toothStr = params.toothFdi ? ` (зуб #${params.toothFdi})` : "";
	const greeting = params.patientName ? `Уважаемый(ая) ${params.patientName}!\n\n` : "";
	const suturesStr = params.hasSutures || params.complexity === "complex" || params.complexity === "impacted_dystopic"
		? `\n7. ШВЫ: Наложены швы. Снятие швов через ${params.sutureRemovalDays ?? "7-10"} дней. Не трогать швы языком и зубочистками.` : "";
	return (
		`${greeting}ПАМЯТКА ПАЦИЕНТУ ПОСЛЕ УДАЛЕНИЯ ЗУБА${toothStr}\n\nДля благополучного заживления лунки строго соблюдайте следующие правила:\n\n` +
		"1. МАРЛЕВЫЙ ТАМПОН: Сплюнуть через 20 минут после окончания операции.\n2. ХОЛОД: Прикладывать сухой холод к щеке на 15 минут с перерывами 30-40 минут в первые 2-3 часа.\n" +
		"3. НЕ ГРЕТЬ: Категорически запрещено греть щеку, прикладывать компрессы, посещать баню, сауну и принимать горячую ванну 3 дня.\n" +
		"4. НЕ ПОЛОСКАТЬ: Не полоскать полость рта в первые 24 часа, чтобы не вымыть кровяной сгусток из лунки. Не пить через трубочку, не сплевывать активно.\n" +
		"5. ПИТАНИЕ: Прием пищи через 2 часа после операции (когда полностью отойдет анестезия). Исключить твердое, горячее и острое на 3 дня. Жевать на противоположной стороне.\n" +
		"6. ОБЕЗБОЛИВАНИЕ: При болях принять назначенный препарат (Нимесил 1 пакетик или Ибупрофен 400 мг) после еды." + suturesStr +
		"\n\nПри продолжающемся кровотечении, нарастающем отеке или температуре выше 38°C немедленно обратитесь в клинику." +
		(params.doctorName ? `\nЛечащий врач: ${params.doctorName}` : "") + (params.clinicPhone ? `\nТелефон клиники: ${params.clinicPhone}` : "")
	).trim();
}

export function buildPostImplantMemoText(params: SurgicalMemoParams = {}): string {
	const toothStr = params.toothFdi ? ` (область зуба #${params.toothFdi})` : "";
	const brandStr = params.implantBrand ? ` [${params.implantBrand}]` : "";
	const greeting = params.patientName ? `Уважаемый(ая) ${params.patientName}!\n\n` : "";
	const capStr = params.capType === "plug" ? "Установлен винт-заглушка с ушиванием раны наглухо. Формирователь десны будет установлен на втором этапе через 3-4 месяца." : "Установлен формирователь десны (ФДМ). Не накусывать на него твердую пищу и не расшатывать языком.";
	return (
		`${greeting}ПАМЯТКА ПАЦИЕНТУ ПОСЛЕ УСТАНОВКИ ИМПЛАНТАТА${toothStr}${brandStr}\n\nДля успешной остеоинтеграции имплантата строго соблюдайте рекомендации:\n\n` +
		"1. ХОЛОД: Прикладывать сухой холод к щеке в проекции операции на 15 минут с перерывами 30 минут в течение первых суток.\n" +
		"2. АНТИСЕПТИЧЕСКИЙ РЕЖИМ: С первых суток делать пассивные ротовые ванночки раствором хлоргексидина 0.05% по 1 минуте 3 раза в день после еды (не полоскать активно!).\n" +
		"3. ДИЕТА: Щадящая теплая мягкая пища на 7-10 дней. Категорически исключить жевание на оперированной стороне. Запрещены семечки, орехи, сухари.\n" +
		"4. ФИЗИЧЕСКИЙ ПОКОЙ: Исключить занятия спортом, подъем тяжестей, посещение бани, сауны, бассейна и авиаперелеты на 7 дней.\n" +
		"5. ГИГИЕНА: Зубы чистить мягкой щеткой со 2-го дня, аккуратно обходя оперированную зону.\n" +
		`6. ШВЫ И ФОРМИРОВАТЕЛЬ: ${capStr} Наложены швы. Снятие швов через 10-14 дней.\n` +
		"7. МЕДИКАМЕНТЫ: Принимать назначенные антибактериальные и противовоспалительные препараты строго по рецептурной схеме.\n\n" +
		"При появлении пульсирующей боли, выраженного отека или повышении температуры немедленно свяжитесь с клиникой." +
		(params.doctorName ? `\nЛечащий хирург-имплантолог: ${params.doctorName}` : "") + (params.clinicPhone ? `\nТелефон клиники: ${params.clinicPhone}` : "")
	).trim();
}

export function buildPostSinusGbrMemoText(params: SurgicalMemoParams = {}): string {
	const toothStr = params.toothFdi ? ` (область зуба #${params.toothFdi})` : "";
	const greeting = params.patientName ? `Уважаемый(ая) ${params.patientName}!\n\n` : "";
	return (
		`${greeting}ПАМЯТКА ПАЦИЕНТУ ПОСЛЕ СИНУС-ЛИФТИНГА И КОСТНОЙ ПЛАСТИКИ${toothStr}\n\nДля сохранения целостности мембраны Шнайдера и костного графта соблюдайте строгий режим:\n\n` +
		"1. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО СМОРКАТЬСЯ: Не сморкаться в течение 14 дней! При чихании открывать рот, не зажимая нос.\n" +
		"2. ЗАПРЕТ ПЕРЕПАДОВ ДАВЛЕНИЯ: Запрещены авиаперелеты, дайвинг, ныряние, надувание шаров и питье через соломинку 14 дней.\n" +
		"3. ХОЛОД: Сухой холод к щеке на 15 минут каждые 1-2 часа в первый день.\n" +
		"4. КАПЛИ В НОС: Применять сосудосуживающие назальные капли по схеме врача 5-7 дней для обеспечения дренажа соустья пазухи.\n" +
		"5. АНТИБАКТЕРИАЛЬНАЯ ТЕРАПИЯ: Полный курс антибиотикотерапии без перерывов.\n" +
		"6. ДИЕТА И ПОКОЙ: Исключить горячее, алкоголь, жесткую пищу, сауну и баню на 14 дней. Не надувать щеки.\n7. ШВЫ: Снятие швов через 12-14 дней.\n\n" +
		"При появлении заложенности пазухи, кровянистых выделений из носа или лихорадки срочно свяжитесь с хирургом." +
		(params.doctorName ? `\nЛечащий хирург: ${params.doctorName}` : "") + (params.clinicPhone ? `\nТелефон клиники: ${params.clinicPhone}` : "")
	).trim();
}

export function buildPostPeriostotomyMemoText(params: SurgicalMemoParams = {}): string {
	const toothStr = params.toothFdi ? ` (область зуба #${params.toothFdi})` : "";
	const greeting = params.patientName ? `Уважаемый(ая) ${params.patientName}!\n\n` : "";
	return (
		`${greeting}ПАМЯТКА ПАЦИЕНТУ ПОСЛЕ ПЕРИОСТОТОМИИ (ВСКРЫТИЯ ВОСПАЛЕНИЯ)${toothStr}\n\nПравила реабилитации после дренирования воспалительного очага:\n\n` +
		"1. ДРЕНАЖ: В рану установлен резиновый ленточный дренаж для оттока экссудата. Категорически запрещено извлекать или трогать его языком!\n" +
		"2. НЕ ГРЕТЬ ЩЕКУ: Запрещены компрессы, грелки, теплые шарфы, баня и горячий душ! Тепло провоцирует распространение гноя.\n" +
		"3. РОТОВЫЕ ВАННОЧКИ: Теплый раствор антисептика (хлоргексидин 0.05% или мирамистин) держать во рту на стороне разреза по 1-2 мин 5 раз в день.\n" +
		"4. ХОЛОД: Сухой холод к щеке на 15 минут с перерывами 40 минут в первые сутки.\n5. МЕДИКАМЕНТЫ: Прием антибиотиков и противовоспалительных строго по схеме.\n" +
		"6. ОБЯЗАТЕЛЬНАЯ ЯВКА: Завтра явка на осмотр, ревизию раны и смену/удаление дренажа.\n\n" +
		"При нарастании отека, затруднении глотания или открывания рта — экстренный визит в клинику." +
		(params.doctorName ? `\nЛечащий врач: ${params.doctorName}` : "") + (params.clinicPhone ? `\nТелефон клиники: ${params.clinicPhone}` : "")
	).trim();
}

export function buildSurgicalPostOpMemoText(scenario: SurgeryScenarioType, params: SurgicalMemoParams = {}): string {
	switch (scenario) {
		case "implant": return buildPostImplantMemoText(params);
		case "sinus_gbr": return buildPostSinusGbrMemoText(params);
		case "resection_periostotomy": return buildPostPeriostotomyMemoText(params);
		case "extraction": default: return buildPostExtractionMemoText(params);
	}
}

export function buildSurgicalDiaryEntry(params: {
	patientName?: string; doctorName?: string; toothFdi?: number; protocolText: string;
	recommendations?: string; implantDetails?: { brand: string; diameterMm: number; lengthMm: number; torqueNcm: number; lot?: string };
}): string {
	const toothStr = params.toothFdi ? `Зуб FDI #${params.toothFdi}` : "Область вмешательства";
	const nowStr = new Date().toLocaleDateString("ru-RU");
	const implantBlock = params.implantDetails ? `\nСПЕЦИФИКАЦИЯ ИМПЛАНТАТА:\nСистема: ${params.implantDetails.brand} Ø ${params.implantDetails.diameterMm} x ${params.implantDetails.lengthMm} мм\nТорк: ${params.implantDetails.torqueNcm} Н·см\n` + (params.implantDetails.lot ? `LOT: ${params.implantDetails.lot}\n` : "") : "";
	const recoBlock = params.recommendations ? `\nНАЗНАЧЕНИЯ И РЕКОМЕНДАЦИИ:\n${params.recommendations}` : "";
	return `ХИРУРГИЧЕСКИЙ ПРОТОКОЛ ОПЕРАЦИИ (${toothStr})\nДата: ${nowStr} · Врач: ${params.doctorName || "Хирург"}\n\nХОД ОПЕРАЦИИ:\n${params.protocolText.trim()}\n${implantBlock}${recoBlock}`;
}

export function getSurgicalCatalogServices(norm: SurgicalOperationNorm, toothFdi?: number): readonly SurgicalServiceItem[] {
	const effectiveTooth = toothFdi ?? norm.defaultToothFdi;
	const catalog = norm.catalogServices || norm.order804nServices;
	if (catalog && catalog.length > 0) return catalog.map((s) => ({ ...s, toothNumber: effectiveTooth }));
	const code = norm.serviceCode || norm.code804n;
	const title = norm.serviceTitle || norm.service804nTitle || norm.title;
	return code ? [{ code, nameRu: title, name: title, priceRub: 3500, quantity: 1, suggestedPriceRub: 3500, toothNumber: effectiveTooth, stageKind: "stage_2_surgery", isPrimary: true }] : [];
}
export const getSurgicalServices804n = getSurgicalCatalogServices;

export function dispatchSurgicalServicesToInvoice(params: {
	norm?: SurgicalOperationNorm; toothFdi?: number; customServices?: readonly SurgicalServiceItem[];
	onAddToInvoice?: (services: readonly SurgicalServiceItem[]) => void;
}): readonly SurgicalServiceItem[] {
	const effectiveTooth = params.toothFdi ?? params.norm?.defaultToothFdi;
	const services = params.customServices && params.customServices.length > 0
		? params.customServices.map((s) => ({ ...s, toothNumber: s.toothNumber ?? effectiveTooth }))
		: params.norm ? getSurgicalCatalogServices(params.norm, effectiveTooth) : [];
	params.onAddToInvoice?.(services);
	if (typeof window !== "undefined" && services.length > 0) {
		window.dispatchEvent(new CustomEvent("dente-add-services-to-invoice", { detail: { services, toothFdi: effectiveTooth } }));
		window.dispatchEvent(new CustomEvent("dente:cart-add-items", { detail: { items: services.map((s) => ({ code: s.code, name: s.nameRu || s.name, priceRub: s.priceRub, quantity: s.quantity || 1, toothNumber: effectiveTooth })) } }));
	}
	return services;
}
