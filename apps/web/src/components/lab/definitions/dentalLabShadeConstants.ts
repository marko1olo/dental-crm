/**
 * dentalLabShadeConstants.ts — Шкалы расцветок VITA Classical, Bleach, опалесценции и культи.
 */

export const VITA_CLASSICAL_SHADES = [
	"A1", "A2", "A3", "A3.5", "A4",
	"B1", "B2", "B3", "B4",
	"C1", "C2", "C3", "C4",
	"D2", "D3", "D4",
] as const;

export const VITA_BLEACH_SHADES = [
	"BL1", "BL2", "BL3", "BL4",
	"0M1", "0M2", "0M3",
] as const;

export const ENAMEL_TRANSLUCENCY_OPTIONS = [
	{ id: "HT", labelRu: "HT — Высокая прозрачность (High Translucency)" },
	{ id: "MT", labelRu: "MT — Средняя прозрачность (Medium Translucency)" },
	{ id: "LT", labelRu: "LT — Низкая прозрачность (Low Translucency)" },
	{ id: "MO", labelRu: "MO — Опалесцентная средняя (Medium Opacity)" },
	{ id: "HO", labelRu: "HO — Высокая опаковость (High Opacity, маскировка)" },
] as const;

export const STUMP_NATURAL_DIE_SHADES = [
	{ id: "ND1", labelRu: "ND1 (Светлая витальная культя)" },
	{ id: "ND2", labelRu: "ND2 (Нормальная эмаль/дентин)" },
	{ id: "ND3", labelRu: "ND3 (Умеренно темный дентин)" },
	{ id: "ND4", labelRu: "ND4 (Депульпированный зуб)" },
	{ id: "ND5", labelRu: "ND5 (Теплый коричневый оттенок)" },
	{ id: "ND6", labelRu: "ND6 (Темный дисколорит)" },
	{ id: "ND7", labelRu: "ND7 (Выраженный дисколорит / резорцин)" },
	{ id: "ND8", labelRu: "ND8 (Металлическая культевая вкладка Co-Cr)" },
	{ id: "ND9", labelRu: "ND9 (Титановый темный абатмент)" },
] as const;
