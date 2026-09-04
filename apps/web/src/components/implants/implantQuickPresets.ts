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
		model: "TS III CA Ultra-Clean",
		defaultDiameterMm: 4.0,
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
		model: "NobelActive TiUltra",
		defaultDiameterMm: 4.3,
		defaultLengthMm: 11.5,
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
		brand: "MegaGen",
		model: "AnyRidge Xpeed",
		defaultDiameterMm: 4.5,
		defaultLengthMm: 10.0,
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
		brand: "Neodent",
		model: "Helix Grand Morse (GM) Acqua",
		defaultDiameterMm: 4.0,
		defaultLengthMm: 10.0,
		defaultTorqueNcm: 35,
		recommendedDrillRpm: 800,
	},
];

export const STANDARD_DIAMETERS = [3.0, 3.5, 4.0, 4.3, 4.5, 5.0];
export const STANDARD_LENGTHS = [7.0, 8.5, 10.0, 11.5, 13.0, 15.0];
export const QUICK_TORQUE_OPTIONS = [25, 30, 35, 40, 45, 50];

export type MischDensity = "D1" | "D2" | "D3" | "D4";

export const MISCH_DENSITY_NOTES: Record<MischDensity, { title: string; hint: string }> = {
	D1: { title: "D1 — Плотная кость", hint: "Передний отдел н/ч (>1250 HU). Метчик обязателен." },
	D2: { title: "D2 — Плотная + губчатая", hint: "Дистальный отдел н/ч (850–1250 HU). Оптимальная остеоинтеграция." },
	D3: { title: "D3 — Тонкая кортикальная", hint: "Дистальный отдел в/ч (350–850 HU). Недопрепарирование ложа." },
	D4: { title: "D4 — Мягкая губчатая", hint: "Бугор верхней челюсти (<350 HU). Остеотомы Саммерса." },
};

export interface FastImplantPassportData {
	readonly passportId: string;
	readonly toothFdi: number;
	readonly brand: string;
	readonly model: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly torqueNcm: number;
	readonly lotNumber: string;
	readonly serialNumber: string;
	readonly boneDensity: MischDensity;
	readonly isqDay0?: number;
	readonly patientName?: string;
	readonly patientId?: string;
	readonly doctorName?: string;
	readonly dateIso: string;
	readonly isWarehouseOverdraft?: boolean;
}

/**
 * Создание чистого паспорта имплантата без бюрократических задержек.
 */
export function createDefaultPassportRecord(params: {
	toothFdi: number;
	brand?: string;
	diameterMm?: number;
	lengthMm?: number;
	torqueNcm?: number;
	patientName?: string;
	patientId?: string;
	doctorName?: string;
}): FastImplantPassportData {
	const preset = FAST_IMPLANT_SYSTEM_PRESETS.find((p) => p.brand === params.brand) ?? FAST_IMPLANT_SYSTEM_PRESETS[0]!;
	const tooth = params.toothFdi || 46;
	const timestampSuffix = Date.now().toString().slice(-6);

	return {
		passportId: `IMP-PASSPORT-${tooth}-${timestampSuffix}`,
		toothFdi: tooth,
		brand: preset.brand,
		model: preset.model,
		diameterMm: params.diameterMm ?? preset.defaultDiameterMm,
		lengthMm: params.lengthMm ?? preset.defaultLengthMm,
		torqueNcm: params.torqueNcm ?? 35, // 35 Н/см по умолчанию
		lotNumber: `LOT-${new Date().getFullYear()}-${preset.brand.slice(0, 3).toUpperCase()}-${timestampSuffix}`,
		serialNumber: `SN-${timestampSuffix}`,
		boneDensity: tooth > 30 && tooth < 49 ? "D2" : "D3",
		isqDay0: 74,
		patientName: params.patientName ?? "Пациент",
		patientId: params.patientId ?? "PAT-01",
		doctorName: params.doctorName ?? "Хирург-имплантолог",
		dateIso: new Date().toISOString(),
		isWarehouseOverdraft: false,
	};
}
