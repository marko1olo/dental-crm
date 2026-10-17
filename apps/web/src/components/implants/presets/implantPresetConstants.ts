import type { FastImplantSystemPreset, MischDensity, ImplantCapType } from "./implantPresetTypes";

export const FAST_IMPLANT_SYSTEM_PRESETS: readonly FastImplantSystemPreset[] = [
	{ brand: "Osstem", model: "TS III SA/CA", defaultDiameterMm: 4.0, defaultLengthMm: 10.0, defaultTorqueNcm: 35, recommendedDrillRpm: 800 },
	{ brand: "Dentium", model: "SuperLine SLA", defaultDiameterMm: 4.5, defaultLengthMm: 10.0, defaultTorqueNcm: 35, recommendedDrillRpm: 800 },
	{ brand: "Straumann", model: "BLX Roxolid SLActive", defaultDiameterMm: 4.0, defaultLengthMm: 10.0, defaultTorqueNcm: 35, recommendedDrillRpm: 800 },
	{ brand: "Nobel Biocare", model: "Nobel Parallel CC", defaultDiameterMm: 4.3, defaultLengthMm: 11.5, defaultTorqueNcm: 35, recommendedDrillRpm: 800 },
	{ brand: "Ankylos", model: "C/X TissueCare", defaultDiameterMm: 4.5, defaultLengthMm: 11.0, defaultTorqueNcm: 35, recommendedDrillRpm: 800 },
	{ brand: "Astra Tech", model: "OsseoSpeed EV", defaultDiameterMm: 4.2, defaultLengthMm: 11.0, defaultTorqueNcm: 35, recommendedDrillRpm: 800 },
	{ brand: "MegaGen", model: "AnyRidge Xpeed", defaultDiameterMm: 4.5, defaultLengthMm: 10.0, defaultTorqueNcm: 35, recommendedDrillRpm: 800 },
	{ brand: "MIS", model: "SEVEN / V3 / C1", defaultDiameterMm: 3.75, defaultLengthMm: 10.0, defaultTorqueNcm: 35, recommendedDrillRpm: 800 },
	{ brand: "Neodent", model: "Helix Grand Morse (GM) Acqua", defaultDiameterMm: 4.0, defaultLengthMm: 10.0, defaultTorqueNcm: 35, recommendedDrillRpm: 800 },
];

export const STANDARD_DIAMETERS = [3.0, 3.3, 3.5, 3.6, 3.75, 4.0, 4.2, 4.3, 4.5, 4.8, 5.0, 5.5];
export const STANDARD_LENGTHS = [6.6, 7.0, 8.0, 8.5, 9.5, 10.0, 11.0, 11.5, 13.0, 14.0, 15.0];
export const QUICK_TORQUE_OPTIONS = [25, 30, 35, 40, 45, 50];

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
