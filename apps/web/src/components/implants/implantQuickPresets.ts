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
}

/**
 * Парсер штрихкода упаковки имплантата (GS1 DataMatrix / 2D / серийный формат).
 */
export function parseImplantBarcode(barcode: string): ParsedImplantBarcode {
	const raw = barcode.trim();
	if (!raw) return { rawBarcode: "" };

	let article: string | undefined;
	let lot: string | undefined;
	let serial: string | undefined;

	const ai01 = raw.match(/\(01\)(\d+)/) || raw.match(/01(\d{14})/);
	const ai10 = raw.match(/\(10\)([A-Za-z0-9-_]+)/) || raw.match(/10([A-Za-z0-9-_]{4,16})/);
	const ai21 = raw.match(/\(21\)([A-Za-z0-9-_]+)/) || raw.match(/21([A-Za-z0-9-_]{4,16})/);
	const ai240 = raw.match(/\(240\)([A-Za-z0-9-_]+)/);

	if (ai01 || ai10 || ai21 || ai240) {
		if (ai240?.[1]) article = ai240[1];
		else if (ai01?.[1]) article = `REF-${ai01[1].slice(-6)}`;
		if (ai10?.[1]) lot = ai10[1];
		if (ai21?.[1]) serial = ai21[1];
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
	};
}

export interface FastImplantPassportData {
	readonly passportId: string;
	readonly toothFdi: number;
	readonly brand: string;
	readonly model: string;
	readonly catalogArticle?: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly torqueNcm: number;
	readonly lotNumber: string;
	readonly serialNumber: string;
	readonly boneDensity: MischDensity;
	readonly isqDay0?: number;
	readonly capType?: ImplantCapType;
	readonly patientName?: string;
	readonly patientId?: string;
	readonly doctorName?: string;
	readonly doctorId?: string;
	readonly dateIso: string;
	readonly isWarehouseOverdraft?: boolean;
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
}): FastImplantPassportData {
	const preset = FAST_IMPLANT_SYSTEM_PRESETS.find((p) => p.brand === params.brand) ?? FAST_IMPLANT_SYSTEM_PRESETS[0]!;
	const tooth = params.toothFdi || 46;
	const timestampSuffix = Date.now().toString().slice(-6);

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
		torqueNcm: params.torqueNcm ?? 35, // 35 Н·см по умолчанию
		lotNumber: `LOT-${new Date().getFullYear()}-${preset.brand.slice(0, 3).toUpperCase()}-${timestampSuffix}`,
		serialNumber: `SN-${timestampSuffix}`,
		boneDensity: getBoneDensityByToothFdi(tooth),
		isqDay0: params.isqDay0 ?? 72, // 72 ISQ каноническая первичная фиксация (RFA)
		capType: params.capType ?? "fdm", // ФДМ по умолчанию
		patientName: params.patientName ?? "Пациент",
		patientId: params.patientId ?? "PAT-01",
		doctorName: params.doctorName ?? "Хирург-имплантолог",
		doctorId: params.doctorId ?? "DOC-01",
		dateIso: new Date().toISOString(),
		isWarehouseOverdraft: false,
	};
}
