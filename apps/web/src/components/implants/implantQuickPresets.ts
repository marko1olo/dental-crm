/**
 * implantQuickPresets.ts — Экспресс-пресеты имплантологического паспорта и спецификации.
 * Стандарт: быстрая фиксация (система, диаметр, длина, торк, FDI) БЕЗ требования 10 немедицинских сертификатов.
 */

export interface FastImplantSystemPreset {
	readonly brand: string;
	readonly model: string;
	readonly defaultDiameterMm: number;
	readonly defaultLengthMm: number;
	readonly defaultTorqueNcm: number;
	readonly recommendedDrillRpm: number;
}

export const FAST_IMPLANT_SYSTEM_PRESETS: readonly FastImplantSystemPreset[] = [
	{
		brand: "Osstem",
		model: "TS III SA/CA",
		defaultDiameterMm: 4.0,
		defaultLengthMm: 10.0,
		defaultTorqueNcm: 35,
		recommendedDrillRpm: 800,
	},
	{
		brand: "Dentium",
		model: "SuperLine SLA",
		defaultDiameterMm: 4.5,
		defaultLengthMm: 10.0,
		defaultTorqueNcm: 35,
		recommendedDrillRpm: 800,
	},
	{
		brand: "Straumann",
		model: "BLX Roxolid SLActive",
		defaultDiameterMm: 4.0,
		defaultLengthMm: 10.0,
		defaultTorqueNcm: 35,
		recommendedDrillRpm: 800,
	},
	{
		brand: "Nobel Biocare",
		model: "Nobel Parallel CC",
		defaultDiameterMm: 4.3,
		defaultLengthMm: 11.5,
		defaultTorqueNcm: 35,
		recommendedDrillRpm: 800,
	},
	{
		brand: "Ankylos",
		model: "C/X TissueCare",
		defaultDiameterMm: 4.5,
		defaultLengthMm: 11.0,
		defaultTorqueNcm: 35,
		recommendedDrillRpm: 800,
	},
	{
		brand: "Astra Tech",
		model: "OsseoSpeed EV",
		defaultDiameterMm: 4.2,
		defaultLengthMm: 11.0,
		defaultTorqueNcm: 35,
		recommendedDrillRpm: 800,
	},
	{
		brand: "MegaGen",
		model: "AnyRidge Xpeed",
		defaultDiameterMm: 4.5,
		defaultLengthMm: 10.0,
		defaultTorqueNcm: 35,
		recommendedDrillRpm: 800,
	},
	{
		brand: "MIS",
		model: "SEVEN / V3 / C1",
		defaultDiameterMm: 3.75,
		defaultLengthMm: 10.0,
		defaultTorqueNcm: 35,
		recommendedDrillRpm: 800,
	},
	{
		brand: "Neodent",
		model: "Helix Grand Morse (GM) Acqua",
		defaultDiameterMm: 4.0,
		defaultLengthMm: 10.0,
		defaultTorqueNcm: 35,
		recommendedDrillRpm: 800,
	},
];

export const STANDARD_DIAMETERS = [3.0, 3.3, 3.5, 3.6, 3.75, 4.0, 4.2, 4.3, 4.5, 4.8, 5.0, 5.5];
export const STANDARD_LENGTHS = [6.6, 7.0, 8.0, 8.5, 9.5, 10.0, 11.0, 11.5, 13.0, 14.0, 15.0];
export const QUICK_TORQUE_OPTIONS = [25, 30, 35, 40, 45, 50];

export type MischDensity = "D1" | "D2" | "D3" | "D4";

export type ImplantCapType = "fdm" | "plug";

export const IMPLANT_CAP_TYPE_LABELS: Record<ImplantCapType, { title: string; hint: string }> = {
	fdm: {
		title: "ФДМ (формирователь десны)",
		hint: "Одноэтапный протокол с формированием десневого контура",
	},
	plug: {
		title: "Винт-заглушка (Cover screw)",
		hint: "Двухэтапный протокол с ушиванием раны наглухо",
	},
};

export const MISCH_DENSITY_NOTES: Record<MischDensity, { title: string; hint: string }> = {
	D1: { title: "D1 — Плотная кость", hint: "Передний отдел н/ч (>1250 HU). Метчик обязателен." },
	D2: { title: "D2 — Плотная + губчатая", hint: "Дистальный отдел н/ч (850–1250 HU). Оптимальная остеоинтеграция." },
	D3: { title: "D3 — Тонкая кортикальная", hint: "Дистальный отдел в/ч (350–850 HU). Недопрепарирование ложа." },
	D4: { title: "D4 — Мягкая губчатая", hint: "Бугор верхней челюсти (<350 HU). Остеотомы Саммерса." },
};

/**
 * Анатомическое определение плотности кости по формуле зубов FDI (11..48).
 */
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

export interface ParsedImplantBarcode {
	readonly rawBarcode: string;
	readonly article?: string | undefined;
	readonly lot?: string | undefined;
	readonly serial?: string | undefined;
	readonly expirationDate?: string | undefined;
}

/**
 * Парсер штрихкода упаковки имплантата (GS1 DataMatrix / 2D / серийный формат).
 * Распознает: (01) GTIN, (10) LOT, (17) Срок годности YYMMDD, (21) SN, (240) REF.
 */
export function parseImplantBarcode(barcode: string): ParsedImplantBarcode {
	const raw = barcode.trim();
	if (!raw) return { rawBarcode: "" };

	let article: string | undefined;
	let lot: string | undefined;
	let serial: string | undefined;
	let expirationDate: string | undefined;

	const ai01 = raw.match(/\(01\)(\d+)/) || raw.match(/01(\d{14})/);
	const ai10 = raw.match(/\(10\)([A-Za-z0-9-_]+)/) || raw.match(/10([A-Za-z0-9-_]{4,16})/);
	const ai17 = raw.match(/\(17\)(\d{6})/) || raw.match(/17(\d{6})/);
	const ai21 = raw.match(/\(21\)([A-Za-z0-9-_]+)/) || raw.match(/21([A-Za-z0-9-_]{4,16})/);
	const ai240 = raw.match(/\(240\)([A-Za-z0-9-_]+)/);

	if (ai01 || ai10 || ai17 || ai21 || ai240) {
		if (ai240?.[1]) article = ai240[1];
		else if (ai01?.[1]) article = `REF-${ai01[1].slice(-6)}`;
		if (ai10?.[1]) lot = ai10[1];
		if (ai21?.[1]) serial = ai21[1];
		if (ai17?.[1]) {
			const yy = ai17[1].slice(0, 2);
			const mm = ai17[1].slice(2, 4);
			const dd = ai17[1].slice(4, 6);
			expirationDate = `20${yy}-${mm}-${dd}`;
		}
	} else if (raw.includes("/") || raw.includes(";") || raw.includes("|")) {
		const parts = raw.split(/[/;|]/).map((p) => p.trim());
		if (parts.length >= 3) {
			article = parts[0];
			lot = parts[1];
			serial = parts[2];
		} else if (parts.length === 2) {
			lot = parts[0];
			serial = parts[1];
		}
	} else if (raw.startsWith("LOT-") || raw.startsWith("SN-")) {
		if (raw.startsWith("LOT-")) lot = raw;
		else serial = raw;
	}

	return {
		rawBarcode: raw,
		...(article ? { article } : {}),
		...(lot ? { lot } : {}),
		...(serial ? { serial } : {}),
		...(expirationDate ? { expirationDate } : {}),
	};
}

export interface ParsedStockDimensions {
	readonly brand?: string;
	readonly diameterMm?: number;
	readonly lengthMm?: number;
}

/**
 * Парсер параметров имплантата из наименования складской номенклатуры (Мандаты 8e, 8n).
 * Автоматически извлекает бренд, диаметр (Ø) и длину (L) без ручного набора на клавиатуре.
 * Примеры:
 *  - "Имплантат Osstem TS III SA Ø4.0x10мм" -> { brand: "Osstem", diameterMm: 4.0, lengthMm: 10.0 }
 *  - "Имплантат Nobel Biocare Parallel CC Ø4.3x11.5мм" -> { brand: "Nobel Biocare", diameterMm: 4.3, lengthMm: 11.5 }
 */
export function parseStockDimensions(name: string): ParsedStockDimensions {
	if (!name) return {};
	const lower = name.toLowerCase();
	let brand: string | undefined;
	for (const preset of FAST_IMPLANT_SYSTEM_PRESETS) {
		if (lower.includes(preset.brand.toLowerCase())) {
			brand = preset.brand;
			break;
		}
	}

	// Распознавание диаметра и длины: Ø4.0x10мм, Ø4.3x11.5, D3.5*10, 4.0 x 10 мм
	const dimMatch = name.match(/[ØøD]?\s*(\d+(?:[.,]\d+)?)\s*[xXхХ*×]\s*(\d+(?:[.,]\d+)?)\s*мм?/i);
	let diameterMm: number | undefined;
	let lengthMm: number | undefined;
	if (dimMatch?.[1] && dimMatch?.[2]) {
		const dia = parseFloat(dimMatch[1].replace(",", "."));
		const len = parseFloat(dimMatch[2].replace(",", "."));
		if (!isNaN(dia) && dia > 0) diameterMm = dia;
		if (!isNaN(len) && len > 0) lengthMm = len;
	}

	return {
		...(brand ? { brand } : {}),
		...(diameterMm !== undefined ? { diameterMm } : {}),
		...(lengthMm !== undefined ? { lengthMm } : {}),
	};
}

export interface FastImplantPassportData {
	readonly passportId: string;
	readonly toothFdi: number;
	readonly brand: string;
	readonly model: string;
	readonly catalogArticle?: string | undefined;
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
	readonly boneGraftMaterial?: string | undefined;
	readonly membraneUsed?: string | undefined;
	readonly sutureMaterial?: string | undefined;
}

/**
 * Создание чистого паспорта имплантата без бюрократических задержек.
 */
export function createDefaultPassportRecord(params: {
	toothFdi: number;
	brand?: string;
	catalogArticle?: string;
	diameterMm?: number;
	lengthMm?: number;
	torqueNcm?: number;
	isqDay0?: number;
	capType?: ImplantCapType;
	patientName?: string;
	patientId?: string;
	doctorName?: string;
	doctorId?: string;
	lotNumber?: string;
	serialNumber?: string;
	expirationDate?: string;
	inventoryItemId?: string;
	operationPriceRub?: number;
	implantCostRub?: number;
	consumablesCostRub?: number;
}): FastImplantPassportData {
	const preset = FAST_IMPLANT_SYSTEM_PRESETS.find((p) => p.brand === params.brand) ?? FAST_IMPLANT_SYSTEM_PRESETS[0]!;
	const tooth = params.toothFdi || 46;
	const timestampSuffix = Date.now().toString().slice(-6);

	const torque = params.torqueNcm ?? 35;
	const isq = params.isqDay0 ?? 72;
	const isImmediateLoadingFeasible = torque >= 35 && torque <= 55 && isq >= 70;

	return {
		passportId: `IMP-PASSPORT-${tooth}-${timestampSuffix}`,
		toothFdi: tooth,
		brand: preset.brand,
		model: preset.model,
		catalogArticle:
			params.catalogArticle ??
			(preset.brand === "Osstem"
				? "TS3S4010S"
				: preset.brand === "Dentium"
					? "FX4010"
					: preset.brand === "Straumann"
						? "021.2310"
						: preset.brand === "Ankylos"
							? "A-B110-CX"
							: preset.brand === "Astra Tech"
								? "EV-42110"
								: preset.brand === "Nobel Biocare"
									? "NP-35115"
									: "TS3S4010S"),
		diameterMm: params.diameterMm ?? preset.defaultDiameterMm,
		lengthMm: params.lengthMm ?? preset.defaultLengthMm,
		torqueNcm: torque, // 35 Н·см по умолчанию
		lotNumber:
			params.lotNumber ??
			`LOT-${new Date().getFullYear()}-${preset.brand.slice(0, 3).toUpperCase()}-${timestampSuffix}`,
		serialNumber: params.serialNumber ?? `SN-${timestampSuffix}`,
		expirationDate: params.expirationDate ?? "2028-11-30",
		inventoryItemId: params.inventoryItemId,
		boneDensity: getBoneDensityByToothFdi(tooth),
		isqDay0: isq, // 72 ISQ каноническая первичная фиксация (RFA)
		capType: params.capType ?? "fdm", // ФДМ по умолчанию
		patientName: params.patientName ?? "Пациент",
		patientId: params.patientId ?? "PAT-01",
		doctorName: params.doctorName ?? "Хирург-имплантолог",
		doctorId: params.doctorId ?? "DOC-01",
		dateIso: new Date().toISOString(),
		isWarehouseOverdraft: false,
		operationPriceRub: params.operationPriceRub ?? 45000,
		implantCostRub: params.implantCostRub ?? 12500,
		consumablesCostRub: params.consumablesCostRub ?? 0,
		doctorGrossMarginRub:
			(params.operationPriceRub ?? 45000) -
			((params.implantCostRub ?? 12500) + (params.consumablesCostRub ?? 0)),
		netDoctorIncomeRub: Math.max(
			0,
			(params.operationPriceRub ?? 45000) -
				((params.implantCostRub ?? 12500) + (params.consumablesCostRub ?? 0)),
		),
		isImmediateLoadingFeasible,
	};
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
	readonly unitCostRub: string;
	readonly lotNumber?: string | null;
	readonly expirationDate?: string | null;
	readonly stockQuantity?: string | null;
}

export interface ImplantConsumablesStock {
	readonly grafts: readonly ImplantConsumableItem[];
	readonly membranes: readonly ImplantConsumableItem[];
	readonly sutures: readonly ImplantConsumableItem[];
}

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
		notes: "Корейская имплантационная система Osstem TS III SA (узкая платформа)",
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
		notes: "Корейская имплантационная система Osstem TS III SA (конус Морзе 11°)",
	},
	{
		id: "inv-oss-4510",
		name: "Имплантат Osstem TS III SA Ø4.5x10мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "3.000",
		currentQty: "3.000",
		unitCostRub: "12500.00",
		pricePerUnit: "12500.00",
		sku: "TS3S4510S",
		barcode: "01088061400012341024C131521SN-885419",
		lotNumber: "24C1315",
		expirationDate: "2028-12-31",
		notes: "Корейская имплантационная система Osstem TS III SA (широкая платформа)",
	},
	{
		id: "inv-dent-4010",
		name: "Имплантат Dentium SuperLine SLA Ø4.0x10мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "4.000",
		currentQty: "4.000",
		unitCostRub: "10500.00",
		pricePerUnit: "10500.00",
		sku: "FX4010",
		barcode: "010880918000567810DT-7790121SN-440112",
		lotNumber: "DT-77901",
		expirationDate: "2029-01-31",
		notes: "Дентальный имплантат Dentium SuperLine SLA (регулярная платформа)",
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
		notes: "Дентальный имплантат Dentium SuperLine SLA (двойная резьба)",
	},
	{
		id: "inv-strau-3510",
		name: "Имплантат Straumann BLX Roxolid SLActive Ø3.5x10мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "3.000",
		currentQty: "3.000",
		unitCostRub: "28000.00",
		pricePerUnit: "28000.00",
		sku: "021.2210",
		barcode: "010761314000991210ST-9011221SN-110820",
		lotNumber: "ST-90112",
		expirationDate: "2029-04-30",
		notes: "Швейцарский премиальный имплантат Straumann BLX Roxolid SLActive (RB)",
	},
	{
		id: "inv-strau-4010",
		name: "Имплантат Straumann BLX Roxolid SLActive Ø4.0x10мм",
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
		notes: "Швейцарский премиальный имплантат Straumann BLX Roxolid SLActive",
	},
	{
		id: "inv-nobel-3510",
		name: "Имплантат Nobel Biocare Parallel CC Ø3.5x10мм",
		category: "Имплантология",
		unit: "шт.",
		stockQuantity: "3.000",
		currentQty: "3.000",
		unitCostRub: "24500.00",
		pricePerUnit: "24500.00",
		sku: "NP-35100",
		barcode: "010733190000334410NB-4471921SN-771109",
		lotNumber: "NB-44719",
		expirationDate: "2028-08-31",
		notes: "Имплантат Nobel Biocare Conical Connection NP",
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
		notes: "Имплантат Nobel Biocare Conical Connection (TiUnite поверхность)",
	},
];

export const DEFAULT_CANONICAL_CONSUMABLES: ImplantConsumablesStock = {
	grafts: [
		{
			id: "inv-bio-oss-05",
			name: "Костный графт Geistlich Bio-Oss (0.5г)",
			unitCostRub: "8200.00",
			lotNumber: "BO-8921",
			expirationDate: "2028-06-30",
			stockQuantity: "8.000",
		},
		{
			id: "inv-bio-oss-10",
			name: "Костный графт Geistlich Bio-Oss (1.0г)",
			unitCostRub: "14500.00",
			lotNumber: "BO-9012",
			expirationDate: "2028-10-31",
			stockQuantity: "4.000",
		},
	],
	membranes: [
		{
			id: "inv-bio-gide-1622",
			name: "Коллагеновая мембрана Geistlich Bio-Gide (16x22мм)",
			unitCostRub: "9800.00",
			lotNumber: "BG-3310",
			expirationDate: "2028-08-31",
			stockQuantity: "5.000",
		},
		{
			id: "inv-bio-gide-2530",
			name: "Коллагеновая мембрана Geistlich Bio-Gide (25x30мм)",
			unitCostRub: "16200.00",
			lotNumber: "BG-4420",
			expirationDate: "2028-12-31",
			stockQuantity: "3.000",
		},
	],
	sutures: [
		{
			id: "inv-vicryl-40",
			name: "Шовный материал Ethicon Викрил 4-0 (игла 19мм)",
			unitCostRub: "650.00",
			lotNumber: "VK-2026",
			expirationDate: "2027-12-31",
			stockQuantity: "20.000",
		},
		{
			id: "inv-vicryl-50",
			name: "Шовный материал Ethicon Викрил 5-0 (игла 16мм)",
			unitCostRub: "720.00",
			lotNumber: "VK-2027",
			expirationDate: "2027-11-30",
			stockQuantity: "15.000",
		},
	],
};

