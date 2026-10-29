/**
 * surgeryCatalogData.ts — Единый SSOT каталог амбулаторной хирургии и паспортов имплантатов (DENTE CRM).
 * Содержит 4 канонических сценария (Удаление, Резекция/периостотомия, Синус-лифтинг/НКР, Имплантация),
 * базу имплантационных систем (Osstem, Straumann, Nobel Biocare, Dentium, Ankylos),
 * параметры торка (25–45 Н·см), ISQ, размеры, батчи и Soft Negative Stock (Мандаты 8b, 8e, 8n, 8x, 8y).
 */

export type SurgeryScenarioType =
	| "extraction"
	| "resection_periostotomy"
	| "sinus_gbr"
	| "implant";

export type SurgeryCapType = "fdm" | "plug";
export type MischBoneDensity = "D1" | "D2" | "D3" | "D4";

export interface SurgeryMaterialItem {
	readonly id: string;
	readonly name: string;
	readonly unit: string;
	readonly quantity: number;
	readonly isWarehouseCritical: boolean;
	readonly batchLot?: string;
}

export interface SurgeryScenarioDefinition {
	readonly id: string;
	readonly type: SurgeryScenarioType;
	readonly titleRu: string;
	readonly subtitleRu: string;
	readonly defaultToothFdi: number;
	readonly icd10: string;
	readonly icd10Label: string;
	readonly serviceCode: string;
	readonly serviceNameRu: string;
	readonly defaultPriceRub: number;
	readonly defaultProtocolRu: string;
	readonly defaultRecommendationsRu: string;
	readonly standardMaterials: readonly SurgeryMaterialItem[];
}

export interface SurgeryImplantSystemSpec {
	readonly id: string;
	readonly brandName: string;
	readonly popularLines: readonly string[];
	readonly platformName: string;
	readonly screwdriverType: string;
	readonly screwdriverAliasRu: string;
	readonly minTorqueNcm: number;
	readonly defaultTorqueNcm: number;
	readonly maxSafeTorqueNcm: number;
	readonly isqOptimalRange: string;
	readonly standardDiametersMm: readonly number[];
	readonly standardLengthsMm: readonly number[];
	readonly defaultDiameterMm: number;
	readonly defaultLengthMm: number;
	readonly defaultArticle: string;
	readonly defaultLotNumber: string;
	readonly defaultSerialNumber: string;
	readonly defaultExpirationDate: string;
}

export interface SurgeryWarehouseBatchItem {
	readonly id: string;
	readonly brand: string;
	readonly model: string;
	readonly sku: string;
	readonly lotNumber: string;
	readonly serialNumber: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly availableQuantity: number;
	readonly expirationDate: string;
}

/** 1. БАЗА КАНОНИЧЕСКИХ ИМПЛАНТАЦИОННЫХ СИСТЕМ (SSOT) */
export const SURGERY_IMPLANT_SYSTEMS: readonly SurgeryImplantSystemSpec[] = [
	{
		id: "osstem",
		brandName: "Osstem",
		popularLines: ["TS III SA", "TS III SOI", "TS IV"],
		platformName: "Внутренний конус Морзе 11° с шестигранником",
		screwdriverType: "Hex 1.2 mm",
		screwdriverAliasRu: "Шестигранник 1.2 мм (Osstem)",
		minTorqueNcm: 25,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 45,
		isqOptimalRange: "65–85",
		standardDiametersMm: [3.5, 4.0, 4.5, 5.0],
		standardLengthsMm: [8.5, 10.0, 11.5, 13.0],
		defaultDiameterMm: 4.0,
		defaultLengthMm: 10.0,
		defaultArticle: "TS3S4010S",
		defaultLotNumber: "24C1208",
		defaultSerialNumber: "SN-884210",
		defaultExpirationDate: "2029-06-30",
	},
	{
		id: "straumann",
		brandName: "Straumann",
		popularLines: ["BLX", "Bone Level SLA", "SLActive"],
		platformName: "CrossFit / TorcFit",
		screwdriverType: "Torx / SCS 1.25 mm",
		screwdriverAliasRu: "Torx SCS 1.25 мм (Straumann)",
		minTorqueNcm: 25,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 45,
		isqOptimalRange: "70–85",
		standardDiametersMm: [3.3, 3.75, 4.1, 4.8],
		standardLengthsMm: [8.0, 10.0, 12.0, 14.0],
		defaultDiameterMm: 4.1,
		defaultLengthMm: 10.0,
		defaultArticle: "021.2310",
		defaultLotNumber: "24B0812",
		defaultSerialNumber: "SN-102944",
		defaultExpirationDate: "2029-03-31",
	},
	{
		id: "nobel_biocare",
		brandName: "Nobel Biocare",
		popularLines: ["NobelActive", "NobelReplace CC", "NobelParallel"],
		platformName: "Conical Connection (конусное соединение)",
		screwdriverType: "Unigrip",
		screwdriverAliasRu: "Отвертка Unigrip (Nobel)",
		minTorqueNcm: 30,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 45,
		isqOptimalRange: "70–85",
		standardDiametersMm: [3.5, 4.3, 5.0],
		standardLengthsMm: [8.5, 10.0, 11.5, 13.0],
		defaultDiameterMm: 4.3,
		defaultLengthMm: 10.0,
		defaultArticle: "NP-35115",
		defaultLotNumber: "24A9914",
		defaultSerialNumber: "SN-551042",
		defaultExpirationDate: "2028-12-31",
	},
	{
		id: "dentium",
		brandName: "Dentium",
		popularLines: ["SuperLine", "SimpleLine II", "Implantium"],
		platformName: "Внутренний конус 11° с шестигранником 1.27 мм",
		screwdriverType: "Hex 1.27 mm",
		screwdriverAliasRu: "Шестигранник 1.27 мм (Dentium)",
		minTorqueNcm: 30,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 45,
		isqOptimalRange: "68–85",
		standardDiametersMm: [3.6, 4.0, 4.5, 5.0],
		standardLengthsMm: [8.0, 10.0, 12.0, 14.0],
		defaultDiameterMm: 4.0,
		defaultLengthMm: 10.0,
		defaultArticle: "FX4010",
		defaultLotNumber: "24D0415",
		defaultSerialNumber: "SN-304198",
		defaultExpirationDate: "2029-08-31",
	},
	{
		id: "ankylos",
		brandName: "Ankylos",
		popularLines: ["C/X TissueCare"],
		platformName: "Конус Морзе 5.7° без микрозазора",
		screwdriverType: "Hex 1.0 mm",
		screwdriverAliasRu: "Шестигранник 1.0 мм (Ankylos)",
		minTorqueNcm: 25,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 45,
		isqOptimalRange: "70–85",
		standardDiametersMm: [3.5, 4.5, 5.5],
		standardLengthsMm: [8.0, 9.5, 11.0, 14.0],
		defaultDiameterMm: 4.5,
		defaultLengthMm: 11.0,
		defaultArticle: "A-B110-CX",
		defaultLotNumber: "24E0119",
		defaultSerialNumber: "SN-772019",
		defaultExpirationDate: "2029-01-31",
	},
];

/** 2. СКЛАДСКИЕ БАТЧИ И РАСХОДНИКИ (SOFT NEGATIVE STOCK) */
export const SURGERY_DEFAULT_BATCHES: readonly SurgeryWarehouseBatchItem[] = [
	{ id: "inv-oss-4010", brand: "Osstem", model: "TS III SA", sku: "TS3S4010S", lotNumber: "24C1208", serialNumber: "SN-884210", diameterMm: 4.0, lengthMm: 10.0, availableQuantity: 8, expirationDate: "2029-06-30" },
	{ id: "inv-str-4110", brand: "Straumann", model: "Bone Level SLA", sku: "021.2310", lotNumber: "24B0812", serialNumber: "SN-102944", diameterMm: 4.1, lengthMm: 10.0, availableQuantity: 5, expirationDate: "2029-03-31" },
	{ id: "inv-nob-4310", brand: "Nobel Biocare", model: "NobelActive", sku: "NP-35115", lotNumber: "24A9914", serialNumber: "SN-551042", diameterMm: 4.3, lengthMm: 10.0, availableQuantity: 4, expirationDate: "2028-12-31" },
	{ id: "inv-den-4010", brand: "Dentium", model: "SuperLine", sku: "FX4010", lotNumber: "24D0415", serialNumber: "SN-304198", diameterMm: 4.0, lengthMm: 10.0, availableQuantity: 6, expirationDate: "2029-08-31" },
	{ id: "inv-ank-4511", brand: "Ankylos", model: "C/X", sku: "A-B110-CX", lotNumber: "24E0119", serialNumber: "SN-772019", diameterMm: 4.5, lengthMm: 11.0, availableQuantity: 3, expirationDate: "2029-01-31" },
];

export const SURGERY_GRAFT_CATALOG = [
	{ id: "graft-bio-oss-05", name: "Geistlich Bio-Oss гранулят 0.5 г", unitPriceRub: 8500 },
	{ id: "graft-bio-oss-10", name: "Geistlich Bio-Oss гранулят 1.0 г", unitPriceRub: 14200 },
	{ id: "graft-cerabone-05", name: "Botiss Cerabone гранулят 0.5 г", unitPriceRub: 7800 },
] as const;

export const SURGERY_MEMBRANE_CATALOG = [
	{ id: "memb-bio-gide-1622", name: "Geistlich Bio-Gide резорбируемая 16×22 мм", unitPriceRub: 9800 },
	{ id: "memb-bio-gide-2525", name: "Geistlich Bio-Gide резорбируемая 25×25 мм", unitPriceRub: 15400 },
	{ id: "memb-jason-1520", name: "Botiss Jason нативная перикардиальная 15×20 мм", unitPriceRub: 11200 },
] as const;

export const SURGERY_SUTURE_CATALOG = [
	{ id: "sut-vicryl-40", name: "Ethicon Викрил 4-0 (полиглактин 910)", unitPriceRub: 950 },
	{ id: "sut-prolene-40", name: "Ethicon Пролен 4-0 (полипропилен)", unitPriceRub: 1150 },
	{ id: "sut-mono-50", name: "Монофиламент ПГА-РАПИД 5-0", unitPriceRub: 850 },
] as const;

/** 3. ЧЕТЫРЕ КАНОНИЧЕСКИХ СЦЕНАРИЯ АМБУЛАТОРНОЙ ХИРУРГИИ */
export const SURGERY_SCENARIOS: Record<SurgeryScenarioType, SurgeryScenarioDefinition> = {
	extraction: {
		id: "scen-extraction",
		type: "extraction",
		titleRu: "Удаление зуба",
		subtitleRu: "Простое, сложное с разъединением корней или атипичное",
		defaultToothFdi: 36,
		icd10: "K08.8",
		icd10Label: "Другие уточненные изменения зубов и опорного аппарата",
		serviceCode: "A16.07.001",
		serviceNameRu: "Удаление постоянного зуба (простое / сложное)",
		defaultPriceRub: 4500,
		defaultProtocolRu:
			"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Круговая связка зуба отслоена. Люксация элеватором и щипцами. Атравматичная тракция зуба из альвеолы. Тщательный кюретаж лунки острой ложкой, удаление грануляций. Антисептическая обработка 0.05% хлоргексидином. Местный гемостаз: гемостатическая губка Альвостаз. Наложены узловые швы Викрил 4-0. Гемостаз полный. Рекомендации даны.",
		defaultRecommendationsRu:
			"Марлевый тампон сплюнуть через 20 минут. Не полоскать рот 24 часа. При болях — Нимесил 1 пак. Исключить горячее, баню и нагрузки на 3 дня.",
		standardMaterials: [
			{ id: "mat-art-1", name: "Анестетик Артикаин 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
			{ id: "mat-sponge-1", name: "Губка гемостатическая Альвостаз / Альвожиль", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ id: "mat-sut-1", name: "Шовный материал Ethicon Викрил 4-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
		],
	},
	resection_periostotomy: {
		id: "scen-resection",
		type: "resection_periostotomy",
		titleRu: "Резекция / Периостотомия",
		subtitleRu: "Периостотомия при периостите, резекция верхушки корня (апико)",
		defaultToothFdi: 12,
		icd10: "K04.7",
		icd10Label: "Периапикальный абсцесс без свища (острый периостит)",
		serviceCode: "A16.07.011",
		serviceNameRu: "Периостотомия / Резекция верхушки корня",
		defaultPriceRub: 7500,
		defaultProtocolRu:
			"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Разрез слизистой и надкостницы по переходной складке в проекции корня причинного зуба длиной 2 см до кости. Эвакуация гнойного экссудата. Промывание 0.05% хлоргексидином. В рану введен перчаточный резиновый ленточный дренаж-выпускник для оттока экссудата. Гемостаз полный. Назначена антибиотикотерапия. Контрольный осмотр и смена дренажа завтра.",
		defaultRecommendationsRu:
			"Холод на щеку 15 минут каждые 2 часа в первый день. Дренаж не вытягивать. Антибиотикотерапия (Амоксиклав 1000 мг 2 р/сут). Осмотр завтра.",
		standardMaterials: [
			{ id: "mat-art-2", name: "Анестетик Артикаин 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
			{ id: "mat-blade-1", name: "Лезвие скальпеля стерильное #15", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ id: "mat-drain-1", name: "Дренаж ленточный резиновый йодоформный", unit: "шт.", quantity: 1, isWarehouseCritical: false },
		],
	},
	sinus_gbr: {
		id: "scen-sinus-gbr",
		type: "sinus_gbr",
		titleRu: "Синус-лифтинг & НКР",
		subtitleRu: "Субантральная костная пластика, барьерная мембрана, пины",
		defaultToothFdi: 16,
		icd10: "K08.2",
		icd10Label: "Атрофия беззубого альвеолярного края",
		serviceCode: "A16.07.041",
		serviceNameRu: "Синус-лифтинг открытый (субантральная аугментация) и НКР",
		defaultPriceRub: 35000,
		defaultProtocolRu:
			"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 3.4 мл. Трапециевидный разрез в боковом отделе верхней челюсти, скелетирование передне-латеральной стенки верхнечелюстного синуса. Формирование латерального костного окна пьезотомом. Аккуратная элевация мембраны Шнайдера без перфораций (носоротовой тест отрицательный). В субантральное пространство внесен костный графт Geistlich Bio-Oss (0.5 г). Окно перекрыто резорбируемой коллагеновой мембраной Geistlich Bio-Gide (16×22 мм), фиксировано титановыми пинами. Рана послойно ушита шовным материалом Викрил 4-0 без натяжения. Гемостаз полный.",
		defaultRecommendationsRu:
			"Не сморкаться 14 дней. Капли в нос сосудосуживающие (Тизин / Отривин). Антибиотикотерапия 7 дней. Контрольный осмотр на 3 и 7 сутки.",
		standardMaterials: [
			{ id: "mat-art-3", name: "Анестетик Артикаин 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 2, isWarehouseCritical: false },
			{ id: "mat-graft-1", name: "Костный графт Geistlich Bio-Oss 0.5 г", unit: "упак.", quantity: 1, isWarehouseCritical: true },
			{ id: "mat-memb-1", name: "Мембрана Geistlich Bio-Gide 16×22 мм", unit: "шт.", quantity: 1, isWarehouseCritical: true },
			{ id: "mat-pins-1", name: "Титановые пины костные Bone-Fix", unit: "шт.", quantity: 4, isWarehouseCritical: false },
		],
	},
	implant: {
		id: "scen-implant",
		type: "implant",
		titleRu: "Дентальная имплантация",
		subtitleRu: "Установка дентального имплантата с паспортом изделия",
		defaultToothFdi: 46,
		icd10: "K08.1",
		icd10Label: "Потеря зубов вследствие удаления или травмы",
		serviceCode: "A16.07.054",
		serviceNameRu: "Операция установки дентального имплантата",
		defaultPriceRub: 45000,
		defaultProtocolRu:
			"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Разрез по гребню альвеолярного отростка в области зуба, отслоен слизисто-надкостничный лоскут. Препарирование костного ложа фрезами с обильным охлаждением физраствором. Установлен дентальный имплантат титановый, первичная стабильность (торк) 35 Н·см. Установлен формирователь десны. Рана ушита узловыми швами Викрил 4-0. Гемостаз полный. Паспорт имплантата оформлен и выдан пациенту.",
		defaultRecommendationsRu:
			"Холод на щеку 15 минут каждые 2 часа в первый день. Ванночки с 0.05% хлоргексидином со 2 дня. Щадящая диета 14 дней. Осмотр через 7 дней.",
		standardMaterials: [
			{ id: "mat-art-4", name: "Анестетик Артикаин 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
			{ id: "mat-imp-1", name: "Дентальный имплантат титановый (Osstem)", unit: "шт.", quantity: 1, isWarehouseCritical: true },
			{ id: "mat-cap-1", name: "Формирователь десны (ФДМ)", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ id: "mat-sut-2", name: "Шовный материал Ethicon Викрил 4-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
		],
	},
};

/** 4. СЕРВИСНЫЕ ФУНКЦИИ И SOFT NEGATIVE STOCK (МАНДАТЫ 8e, 8n) */
export function getImplantSystemById(id: string): SurgeryImplantSystemSpec {
	return SURGERY_IMPLANT_SYSTEMS.find((s) => s.id === id || s.brandName.toLowerCase() === id.toLowerCase()) || SURGERY_IMPLANT_SYSTEMS[0]!;
}

export function computeOsteointegrationExpectedDate(dateIso = new Date().toISOString(), toothFdi = 46): string {
	const base = new Date(dateIso);
	const isMandible = toothFdi >= 31 && toothFdi <= 48;
	const months = isMandible ? 3 : 5;
	base.setMonth(base.getMonth() + months);
	return base.toISOString().split("T")[0]!;
}

export function evaluateSurgerySoftOverdraft(materials: readonly SurgeryMaterialItem[], forceDelay = false) {
	const pending = forceDelay ? materials.map((m) => m.name) : [];
	return {
		hasOverdraft: pending.length > 0,
		warningRu: pending.length > 0 ? "Мягкий овердрафт склада" : "Склад в норме",
		detailsRu: pending.length > 0
			? `Расходные материалы (${pending.join(", ")}) списаны в мягкий овердрафт. Операция врача не блокируется.`
			: "Все материалы успешно списаны с подотчетного склада кабинета.",
		pendingItems: pending,
		canProceed: true as const, // МАНДАТ 8e: врач никогда не блокируется!
	};
}
