/**
 * implantQuickPresets.ts — Пресеты, анатомические нормы и паспорта имплантации (DENTE CRM).
 * Реализует 1-кликовую физиологическую норму и автономию хирурга (Мандаты 8e, 8n, 8x, 8ap).
 */

export type MischDensity = "D1" | "D2" | "D3" | "D4";
export type ImplantCapType = "fdm" | "plug";

export interface FastImplantSystemPreset {
	readonly brand: string;
	readonly model: string;
	readonly defaultDiameterMm: number;
	readonly defaultLengthMm: number;
	readonly defaultTorqueNcm: number;
	readonly recommendedDrillRpm: number;
}

export interface ParsedImplantBarcode {
	readonly rawBarcode: string;
	readonly article?: string | undefined;
	readonly lot?: string | undefined;
	readonly serial?: string | undefined;
	readonly expirationDate?: string | undefined;
}

export interface ImplantWarehouseStockItem {
	readonly id: string;
	readonly name: string;
	readonly category: string;
	readonly unit: string;
	readonly stockQuantity: string;
	readonly currentQty: string;
	readonly unitCostRub: string;
	readonly pricePerUnit: string;
	readonly sku?: string | null;
	readonly barcode?: string | null;
	readonly lotNumber?: string | null;
	readonly expirationDate?: string | null;
	readonly notes?: string | null;
}

export interface ImplantConsumableItem {
	readonly id: string;
	readonly name: string;
	readonly unitCostRub: string | number;
	readonly lotNumber?: string | null;
	readonly expirationDate?: string | null;
	readonly stockQuantity?: string | null;
}

export interface ImplantConsumablesStock {
	readonly grafts: readonly ImplantConsumableItem[];
	readonly membranes: readonly ImplantConsumableItem[];
	readonly sutures: readonly ImplantConsumableItem[];
}

export interface FastImplantPassportData {
	readonly passportId: string;
	readonly toothFdi: number;
	readonly brand: string;
	readonly model: string;
	readonly catalogArticle: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly torqueNcm: number;
	readonly lotNumber: string;
	readonly serialNumber: string;
	readonly boneDensity: MischDensity;
	readonly isqDay0?: number | undefined;
	readonly capType?: ImplantCapType | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly dateIso: string;
	readonly isWarehouseOverdraft?: boolean | undefined;
	readonly inventoryItemId?: string | undefined;
	readonly expirationDate?: string | undefined;
	readonly operationPriceRub?: number | undefined;
	readonly implantCostRub?: number | undefined;
	readonly consumablesCostRub?: number | undefined;
	readonly doctorGrossMarginRub?: number | undefined;
	readonly netDoctorIncomeRub?: number | undefined;
	readonly isImmediateLoadingFeasible?: boolean | undefined;
	readonly osteointegrationExpectedDate?: string | undefined;
	readonly boneGraftMaterial?: string | undefined;
	readonly membraneUsed?: string | undefined;
	readonly sutureMaterial?: string | undefined;
}

export interface AnatomicalImplantDefaults {
	readonly toothFdi: number;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly torqueNcm: number;
	readonly boneDensity: MischDensity;
	readonly capType: ImplantCapType;
	readonly isqDay0: number;
	readonly sutureMaterial: string;
}

export const FAST_IMPLANT_SYSTEM_PRESETS: readonly FastImplantSystemPreset[] = [
	{ brand: "Osstem", model: "TS III SA", defaultDiameterMm: 4.0, defaultLengthMm: 10.0, defaultTorqueNcm: 35, recommendedDrillRpm: 800 },
	{ brand: "Dentium", model: "SuperLine SLA", defaultDiameterMm: 4.5, defaultLengthMm: 10.0, defaultTorqueNcm: 35, recommendedDrillRpm: 800 },
	{ brand: "Straumann", model: "BLX Roxolid SLActive", defaultDiameterMm: 3.75, defaultLengthMm: 10.0, defaultTorqueNcm: 35, recommendedDrillRpm: 800 },
	{ brand: "Nobel Biocare", model: "Parallel CC TiUltra", defaultDiameterMm: 4.3, defaultLengthMm: 11.5, defaultTorqueNcm: 35, recommendedDrillRpm: 800 },
	{ brand: "Ankylos", model: "C/X TissueCare", defaultDiameterMm: 4.5, defaultLengthMm: 11.0, defaultTorqueNcm: 35, recommendedDrillRpm: 800 },
	{ brand: "Astra Tech", model: "OsseoSpeed EV", defaultDiameterMm: 4.2, defaultLengthMm: 11.0, defaultTorqueNcm: 35, recommendedDrillRpm: 800 },
	{ brand: "MIS", model: "SEVEN / V3", defaultDiameterMm: 4.2, defaultLengthMm: 10.0, defaultTorqueNcm: 35, recommendedDrillRpm: 800 },
];

export const STANDARD_DIAMETERS = [3.0, 3.3, 3.5, 3.75, 4.0, 4.2, 4.3, 4.5, 5.0, 5.5, 6.0] as const;
export const STANDARD_LENGTHS = [7.0, 8.0, 8.5, 10.0, 11.0, 11.5, 12.0, 13.0, 14.0, 15.0] as const;

export const MISCH_DENSITY_NOTES: Record<MischDensity, { labelRu: string; hint: string }> = {
	D1: { labelRu: "D1 Плотная кортикальная", hint: "Передний отдел нижней челюсти. Рекомендуется нарезка резьбы (метчик)." },
	D2: { labelRu: "D2 Плотная губчатая с толстым кортикалом", hint: "Боковой отдел нижней челюсти. Идеальная плотность для немедленной нагрузки." },
	D3: { labelRu: "D3 Тонкий кортикал с пористой губчатой костью", hint: "Передний и боковой отдел верхней челюсти. Стандартное сверление." },
	D4: { labelRu: "D4 Мягкая пористая кость", hint: "Бугор верхней челюсти. Рекомендуется недопрепарирование (under-drilling)." },
};

export function getBoneDensityByToothFdi(toothFdi: number): MischDensity {
	if (toothFdi >= 11 && toothFdi <= 28) {
		if ([17, 18, 27, 28].includes(toothFdi)) return "D4";
		return "D3";
	}
	if (toothFdi >= 31 && toothFdi <= 48) {
		if ([31, 32, 33, 41, 42, 43].includes(toothFdi)) return "D1";
		if ([37, 38, 47, 48].includes(toothFdi)) return "D3";
		return "D2";
	}
	return "D2";
}

export function getAnatomicalImplantDefaults(toothFdi: number): AnatomicalImplantDefaults {
	const tooth = toothFdi || 46;
	const boneDensity = getBoneDensityByToothFdi(tooth);
	const toothNum = tooth % 10;
	const isUpper = tooth >= 11 && tooth <= 28;

	// Моляры (16..18, 26..28, 36..38, 46..48): стандартно 4.5 x 10 мм
	if (toothNum === 6 || toothNum === 7 || toothNum === 8) {
		return {
			toothFdi: tooth,
			diameterMm: 4.5,
			lengthMm: 10.0,
			torqueNcm: 35,
			boneDensity,
			capType: "fdm",
			isqDay0: 72,
			sutureMaterial: "Викрил 4-0",
		};
	}

	// Премоляры (14, 15, 24, 25, 34, 35, 44, 45): стандартно 4.0 x 10 мм
	if (toothNum === 4 || toothNum === 5) {
		return {
			toothFdi: tooth,
			diameterMm: 4.0,
			lengthMm: 10.0,
			torqueNcm: 35,
			boneDensity,
			capType: "fdm",
			isqDay0: 72,
			sutureMaterial: "Викрил 4-0",
		};
	}

	// Верхние резцы (11, 21, 12, 22): 3.5 x 12.0 мм
	if (isUpper && (toothNum === 1 || toothNum === 2)) {
		return {
			toothFdi: tooth,
			diameterMm: 3.5,
			lengthMm: 12.0,
			torqueNcm: 35,
			boneDensity,
			capType: "fdm",
			isqDay0: 72,
			sutureMaterial: "Викрил 4-0",
		};
	}

	// Клыки (13, 23, 33, 43): 4.0 x 11.5 мм
	if (toothNum === 3) {
		return {
			toothFdi: tooth,
			diameterMm: 4.0,
			lengthMm: 11.5,
			torqueNcm: 35,
			boneDensity,
			capType: "fdm",
			isqDay0: 72,
			sutureMaterial: "Викрил 4-0",
		};
	}

	// Нижние резцы (31, 32, 41, 42): 3.5 x 10.0 мм
	return {
		toothFdi: tooth,
		diameterMm: 3.5,
		lengthMm: 10.0,
		torqueNcm: 35,
		boneDensity,
		capType: "fdm",
		isqDay0: 72,
		sutureMaterial: "Викрил 4-0",
	};
}

export function computeOsteointegrationDate(dateIso: string, toothFdi: number): string {
	const d = new Date(dateIso || Date.now());
	const isUpperJaw = (toothFdi >= 11 && toothFdi <= 28) || (toothFdi >= 51 && toothFdi <= 65);
	const monthsToAdd = isUpperJaw ? 4 : 3;
	d.setMonth(d.getMonth() + monthsToAdd);
	return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export function createDefaultPassportRecord(params: {
	toothFdi?: number;
	brand?: string;
	diameterMm?: number;
	lengthMm?: number;
	torqueNcm?: number;
	boneDensity?: MischDensity;
	isqDay0?: number;
	capType?: ImplantCapType;
	patientName?: string;
	patientId?: string;
	doctorName?: string;
	doctorId?: string;
	lotNumber?: string;
	serialNumber?: string;
	catalogArticle?: string;
	expirationDate?: string;
	inventoryItemId?: string;
	operationPriceRub?: number;
	implantCostRub?: number;
	consumablesCostRub?: number;
}): FastImplantPassportData {
	const tooth = params.toothFdi || 46;
	const preset = FAST_IMPLANT_SYSTEM_PRESETS.find((p) => p.brand === params.brand) ?? FAST_IMPLANT_SYSTEM_PRESETS[0]!;
	const timestampSuffix = Date.now().toString().slice(-6);
	const torque = params.torqueNcm ?? 35;
	const isq = params.isqDay0 ?? 72;
	const isImmediateLoadingFeasible = torque >= 35 && torque <= 55 && isq >= 70;
	const article = params.catalogArticle ?? (preset.brand === "Osstem" ? "TS3S4010S" : preset.brand === "Dentium" ? "FX4010" : preset.brand === "Straumann" ? "021.2310" : preset.brand === "Ankylos" ? "A-B110-CX" : preset.brand === "Astra Tech" ? "EV-42110" : preset.brand === "Nobel Biocare" ? "NP-35115" : "TS3S4010S");

	const dateIso = new Date().toISOString();
	const osteointegrationExpectedDate = computeOsteointegrationDate(dateIso, tooth);

	return {
		passportId: `IMP-PASSPORT-${tooth}-${timestampSuffix}`,
		toothFdi: tooth,
		brand: preset.brand,
		model: preset.model,
		catalogArticle: article,
		diameterMm: params.diameterMm ?? preset.defaultDiameterMm,
		lengthMm: params.lengthMm ?? preset.defaultLengthMm,
		torqueNcm: torque,
		lotNumber: params.lotNumber ?? `LOT-${new Date().getFullYear()}-${preset.brand.slice(0, 3).toUpperCase()}-${timestampSuffix}`,
		serialNumber: params.serialNumber ?? `SN-${timestampSuffix}`,
		expirationDate: params.expirationDate ?? "2028-11-30",
		inventoryItemId: params.inventoryItemId,
		boneDensity: params.boneDensity ?? getBoneDensityByToothFdi(tooth),
		isqDay0: isq,
		capType: params.capType ?? "fdm",
		patientName: params.patientName ?? "Пациент",
		patientId: params.patientId ?? "PAT-01",
		doctorName: params.doctorName ?? "Хирург-имплантолог",
		doctorId: params.doctorId ?? "DOC-01",
		dateIso,
		osteointegrationExpectedDate,
		isWarehouseOverdraft: false,
		operationPriceRub: params.operationPriceRub ?? 45000,
		implantCostRub: params.implantCostRub ?? 12500,
		consumablesCostRub: params.consumablesCostRub ?? 0,
		doctorGrossMarginRub: (params.operationPriceRub ?? 45000) - ((params.implantCostRub ?? 12500) + (params.consumablesCostRub ?? 0)),
		netDoctorIncomeRub: Math.max(0, (params.operationPriceRub ?? 45000) - ((params.implantCostRub ?? 12500) + (params.consumablesCostRub ?? 0))),
		isImmediateLoadingFeasible,
	};
}

export function createFastImplantPreset(brandName: string, toothFdi = 46): FastImplantPassportData {
	return createDefaultPassportRecord({ brand: brandName, toothFdi });
}

export function parseStockDimensions(name: string): {
	brand?: string;
	diameterMm?: number;
	lengthMm?: number;
} {
	const result: { brand?: string; diameterMm?: number; lengthMm?: number } = {};

	if (/osstem/i.test(name)) result.brand = "Osstem";
	else if (/dentium/i.test(name)) result.brand = "Dentium";
	else if (/straumann/i.test(name)) result.brand = "Straumann";
	else if (/nobel/i.test(name)) result.brand = "Nobel Biocare";
	else if (/ankylos/i.test(name)) result.brand = "Ankylos";
	else if (/astra/i.test(name)) result.brand = "Astra Tech";
	else if (/megagen|anyridge/i.test(name)) result.brand = "MegaGen";
	else if (/neodent/i.test(name)) result.brand = "Neodent";

	const sizeMatch = name.match(/Ø\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
	if (sizeMatch && sizeMatch[1] && sizeMatch[2]) {
		result.diameterMm = parseFloat(sizeMatch[1]);
		result.lengthMm = parseFloat(sizeMatch[2]);
	}
	return result;
}

export const DEFAULT_CANONICAL_CONSUMABLES: ImplantConsumablesStock = {
	grafts: [
		{ id: "inv-bio-oss-05", name: "Костный графт Geistlich Bio-Oss (0.5г)", unitCostRub: "8200.00", lotNumber: "BO-8921", expirationDate: "2028-06-30", stockQuantity: "8.000" },
		{ id: "inv-bio-oss-10", name: "Костный графт Geistlich Bio-Oss (1.0г)", unitCostRub: "14500.00", lotNumber: "BO-9012", expirationDate: "2028-10-31", stockQuantity: "4.000" },
	],
	membranes: [
		{ id: "inv-bio-gide-1622", name: "Коллагеновая мембрана Geistlich Bio-Gide (16x22мм)", unitCostRub: "9800.00", lotNumber: "BG-3310", expirationDate: "2028-08-31", stockQuantity: "5.000" },
		{ id: "inv-bio-gide-2530", name: "Коллагеновая мембрана Geistlich Bio-Gide (25x30мм)", unitCostRub: "16200.00", lotNumber: "BG-4420", expirationDate: "2028-12-31", stockQuantity: "3.000" },
	],
	sutures: [
		{ id: "inv-vicryl-40", name: "Шовный материал Ethicon Викрил 4-0 (игла 19мм)", unitCostRub: "650.00", lotNumber: "VK-2026", expirationDate: "2027-12-31", stockQuantity: "20.000" },
		{ id: "inv-vicryl-50", name: "Шовный материал Ethicon Викрил 5-0 (игла 16мм)", unitCostRub: "720.00", lotNumber: "VK-2027", expirationDate: "2027-11-30", stockQuantity: "15.000" },
	],
};

export const DEFAULT_CANONICAL_IMPLANT_STOCK: readonly ImplantWarehouseStockItem[] = [
	{
		id: "inv-oss-3510",
		name: "Имплантат Osstem TS III SA Ø3.5x10мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "4.000",
		currentQty: "4.000",
		unitCostRub: "12500.00",
		pricePerUnit: "12500.00",
		sku: "TS3S3510S",
		barcode: "01088061400012341024C110221SN-883102",
		lotNumber: "24C1102",
		expirationDate: "2028-10-31",
	},
	{
		id: "inv-oss-4010",
		name: "Имплантат Osstem TS III SA Ø4.0x10мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "5.000",
		currentQty: "5.000",
		unitCostRub: "12500.00",
		pricePerUnit: "12500.00",
		sku: "TS3S4010S",
		barcode: "01088061400012341024C120821SN-884210",
		lotNumber: "24C1208",
		expirationDate: "2028-11-30",
	},
	{
		id: "inv-dt-4010",
		name: "Имплантат Dentium SuperLine SLA Ø4.0x10мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "4.000",
		currentQty: "4.000",
		unitCostRub: "10500.00",
		pricePerUnit: "10500.00",
		sku: "FX4010",
		barcode: "010880918000567810DT-7810121SN-441201",
		lotNumber: "DT-78101",
		expirationDate: "2029-01-31",
	},
	{
		id: "inv-dent-4510",
		name: "Имплантат Dentium SuperLine SLA Ø4.5x10мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "6.000",
		currentQty: "6.000",
		unitCostRub: "10500.00",
		pricePerUnit: "10500.00",
		sku: "FX4510",
		barcode: "010880918000567810DT-7810221SN-441290",
		lotNumber: "DT-78102",
		expirationDate: "2029-01-31",
	},
	{
		id: "inv-strau-3510",
		name: "Имплантат Straumann BLX Roxolid SLActive Ø3.5x10мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "4.000",
		currentQty: "4.000",
		unitCostRub: "28000.00",
		pricePerUnit: "28000.00",
		sku: "021.2310",
		barcode: "010761314000991210ST-9021421SN-110934",
		lotNumber: "ST-90214",
		expirationDate: "2029-05-31",
	},
	{
		id: "inv-nobel-4311",
		name: "Имплантат Nobel Biocare Parallel CC Ø4.3x11.5мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "3.000",
		currentQty: "3.000",
		unitCostRub: "24500.00",
		pricePerUnit: "24500.00",
		sku: "NP-35115",
		barcode: "010733190000334410NB-4482121SN-772819",
		lotNumber: "NB-44821",
		expirationDate: "2028-09-30",
	},
	{
		id: "inv-ak-4511",
		name: "Имплантат Ankylos C/X TissueCare Ø4.5x11мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "3.000",
		currentQty: "3.000",
		unitCostRub: "18500.00",
		pricePerUnit: "18500.00",
		sku: "A-B110-CX",
		barcode: "010401234500077710AK-5510221SN-770415",
		lotNumber: "AK-55102",
		expirationDate: "2029-04-30",
	},
	{
		id: "inv-at-4211",
		name: "Имплантат Astra Tech OsseoSpeed EV Ø4.2x11мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "2.000",
		currentQty: "2.000",
		unitCostRub: "22000.00",
		pricePerUnit: "22000.00",
		sku: "EV-42110",
		barcode: "010739123400066610AT-3310821SN-660199",
		lotNumber: "AT-33108",
		expirationDate: "2029-07-31",
	},
	{
		id: "inv-mg-4510",
		name: "Имплантат MegaGen AnyRidge Xpeed Ø4.5x10мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "3.000",
		currentQty: "3.000",
		unitCostRub: "14500.00",
		pricePerUnit: "14500.00",
		sku: "AR4510",
		barcode: "010880912300011110MG-2201921SN-550912",
		lotNumber: "MG-22019",
		expirationDate: "2029-03-31",
	},
];
