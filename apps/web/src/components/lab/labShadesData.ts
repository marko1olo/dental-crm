/**
 * labShadesData.ts — VITA Classical, 3D-Master, Bleach Shades, Natural Die Stump Shades & Stratification Presets.
 */

export const VITA_CLASSICAL_SHADES = [
	// Group A (Reddish-brownish)
	"A1", "A2", "A3", "A3.5", "A4",
	// Group B (Reddish-yellowish)
	"B1", "B2", "B3", "B4",
	// Group C (Greyish)
	"C1", "C2", "C3", "C4",
	// Group D (Reddish-grey)
	"D2", "D3", "D4",
] as const;

export const VITA_BLEACH_SHADES = [
	"BL1", "BL2", "BL3", "BL4",
	"0M1", "0M2", "0M3",
] as const;

export const VITA_3D_MASTER_SHADES = [
	// Group 1 (Lightest)
	"1M1", "1M2",
	// Group 2
	"2L1.5", "2L2.5", "2M1", "2M2", "2M3", "2R1.5", "2R2.5",
	// Group 3 (Medium)
	"3L1.5", "3L2.5", "3M1", "3M2", "3M3", "3R1.5", "3R2.5",
	// Group 4
	"4L1.5", "4L2.5", "4M1", "4M2", "4M3", "4R1.5", "4R2.5",
	// Group 5 (Darkest)
	"5M1", "5M2", "5M3",
] as const;

export interface VitaClassicalGroup {
	readonly id: "A" | "B" | "C" | "D";
	readonly name: string;
	readonly toneRu: string;
	readonly descRu: string;
	readonly shades: readonly string[];
}

export const VITA_CLASSICAL_GROUPS: readonly VitaClassicalGroup[] = [
	{
		id: "A",
		name: "Группа A",
		toneRu: "Красновато-коричневый тон",
		descRu: "Основной естественный дентинный оттенок (80% клинических случаев)",
		shades: ["A1", "A2", "A3", "A3.5", "A4"],
	},
	{
		id: "B",
		name: "Группа B",
		toneRu: "Красновато-желтый тон",
		descRu: "Светлые и теплые желтоватые зубы высокой светлоты",
		shades: ["B1", "B2", "B3", "B4"],
	},
	{
		id: "C",
		name: "Группа C",
		toneRu: "Серый тон",
		descRu: "Холодные сероватые и приглушенные оттенки дентина",
		shades: ["C1", "C2", "C3", "C4"],
	},
	{
		id: "D",
		name: "Группа D",
		toneRu: "Красновато-серый тон",
		descRu: "Теплый серый тон с красновато-розовым подтоном",
		shades: ["D2", "D3", "D4"],
	},
] as const;

export interface Vita3dMasterGroup {
	readonly level: number;
	readonly name: string;
	readonly descRu: string;
	readonly shades: readonly string[];
}

export const VITA_3D_MASTER_GROUPS: readonly Vita3dMasterGroup[] = [
	{
		level: 1,
		name: "Уровень 1 (L1)",
		descRu: "Ультрасветлые естественные зубы",
		shades: ["1M1", "1M2"],
	},
	{
		level: 2,
		name: "Уровень 2 (L2)",
		descRu: "Светлые зубы (L-желтоватый, M-нейтральный, R-красноватый)",
		shades: ["2L1.5", "2L2.5", "2M1", "2M2", "2M3", "2R1.5", "2R2.5"],
	},
	{
		level: 3,
		name: "Уровень 3 (L3)",
		descRu: "Средняя светлота — золотой клинический стандарт",
		shades: ["3L1.5", "3L2.5", "3M1", "3M2", "3M3", "3R1.5", "3R2.5"],
	},
	{
		level: 4,
		name: "Уровень 4 (L4)",
		descRu: "Зрелый дентин повышенной насыщенности (Chroma)",
		shades: ["4L1.5", "4L2.5", "4M1", "4M2", "4M3", "4R1.5", "4R2.5"],
	},
	{
		level: 5,
		name: "Уровень 5 (L5)",
		descRu: "Максимальная насыщенность и глубина цвета",
		shades: ["5M1", "5M2", "5M3"],
	},
] as const;

export interface BleachShadeItem {
	readonly id: string;
	readonly name: string;
	readonly system: "3d_bleach" | "ivoclar";
	readonly descRu: string;
}

export const VITA_BLEACH_SHADES_CLASSIFIED: readonly BleachShadeItem[] = [
	{ id: "0M1", name: "0M1", system: "3d_bleach", descRu: "VITA 3D Bleach — максимальная белизна" },
	{ id: "0M2", name: "0M2", system: "3d_bleach", descRu: "VITA 3D Bleach — ультрасветлый оттенок" },
	{ id: "0M3", name: "0M3", system: "3d_bleach", descRu: "VITA 3D Bleach — мягкий отбеленный" },
	{ id: "BL1", name: "BL1", system: "ivoclar", descRu: "Ivoclar Bleach BL1 — белоснежный Hollywood" },
	{ id: "BL2", name: "BL2", system: "ivoclar", descRu: "Ivoclar Bleach BL2 — экстра-светлый отбеленный" },
	{ id: "BL3", name: "BL3", system: "ivoclar", descRu: "Ivoclar Bleach BL3 — естественный отбеленный" },
	{ id: "BL4", name: "BL4", system: "ivoclar", descRu: "Ivoclar Bleach BL4 — мягкий осветленный" },
] as const;

export interface StratificationZones {
	cervical: string;
	body: string;
	incisal: string;
}

/**
 * Returns clinical 3-zone shade stratification preset based on primary shade.
 * Cervical is generally +0.5 to +1 tone darker/warmer,
 * Body is the primary dentin shade,
 * Incisal is translucent or 1 tone lighter for enamel halo effect.
 */
export function getStratificationPreset(
	primaryShade: string,
	mode: "natural" | "monochrome" | "youth_translucent" = "natural",
): StratificationZones {
	const shade = (primaryShade || "A2").trim();
	if (mode === "monochrome") {
		return { cervical: shade, body: shade, incisal: shade };
	}
	if (mode === "youth_translucent") {
		return {
			cervical: shade,
			body: shade,
			incisal: shade === "A1" || shade === "B1" ? "0M1" : "A1",
		};
	}
	const naturalMap: Record<string, { cervical: string; incisal: string }> = {
		A1: { cervical: "A2", incisal: "0M2" },
		A2: { cervical: "A3", incisal: "A1" },
		A3: { cervical: "A3.5", incisal: "A2" },
		"A3.5": { cervical: "A4", incisal: "A3" },
		A4: { cervical: "A4", incisal: "A3.5" },
		B1: { cervical: "B2", incisal: "0M2" },
		B2: { cervical: "B3", incisal: "B1" },
		B3: { cervical: "B4", incisal: "B2" },
		B4: { cervical: "B4", incisal: "B3" },
		C1: { cervical: "C2", incisal: "C1" },
		C2: { cervical: "C3", incisal: "C1" },
		C3: { cervical: "C4", incisal: "C2" },
		C4: { cervical: "C4", incisal: "C3" },
		D2: { cervical: "D3", incisal: "D2" },
		D3: { cervical: "D4", incisal: "D2" },
		D4: { cervical: "D4", incisal: "D3" },
		"0M1": { cervical: "0M2", incisal: "0M1" },
		"0M2": { cervical: "0M3", incisal: "0M1" },
		"0M3": { cervical: "1M1", incisal: "0M2" },
		"1M1": { cervical: "1M2", incisal: "0M1" },
		"2M2": { cervical: "2M3", incisal: "2M1" },
		"3M2": { cervical: "3M3", incisal: "3M1" },
	};
	const matched = naturalMap[shade];
	if (matched) {
		return { cervical: matched.cervical, body: shade, incisal: matched.incisal };
	}
	return { cervical: shade, body: shade, incisal: shade };
}

export interface ShadeSwatchInfo {
	bg: string;
	border: string;
	desc: string;
	group?: string;
}

export const SHADE_SWATCH_MAP: Record<string, ShadeSwatchInfo> = {
	// VITA Classical A (Reddish-Brownish) — exact hex from DentTechnician vita_palette.json
	A1: { bg: "#F3E2C8", border: "#d8c5a8", desc: "Светлый красновато-коричневый", group: "Группа A" },
	A2: { bg: "#EBD7BB", border: "#d0bc9e", desc: "Средний естественный", group: "Группа A" },
	A3: { bg: "#E2CBAE", border: "#c7af91", desc: "Насыщенный дентинный", group: "Группа A" },
	"A3.5": { bg: "#D8C2A4", border: "#bda585", desc: "Темный пришеечный", group: "Группа A" },
	A4: { bg: "#CFA98F", border: "#b38c71", desc: "Интенсивный коричневый", group: "Группа A" },

	// VITA Classical B (Yellowish) — exact hex from DentTechnician vita_palette.json
	B1: { bg: "#F1E6CF", border: "#d5c9b0", desc: "Светлый желтоватый", group: "Группа B" },
	B2: { bg: "#E6D9BE", border: "#c9bba0", desc: "Средний желтоватый", group: "Группа B" },
	B3: { bg: "#DACAAE", border: "#bcae91", desc: "Насыщенный желтый", group: "Группа B" },
	B4: { bg: "#CDBA9C", border: "#af9d7e", desc: "Темный желтоватый", group: "Группа B" },

	// VITA Classical C (Greyish) — exact hex from DentTechnician vita_palette.json
	C1: { bg: "#E9DEC6", border: "#ccc0a8", desc: "Светлый сероватый", group: "Группа C" },
	C2: { bg: "#E0D2B8", border: "#c3b499", desc: "Средний серый", group: "Группа C" },
	C3: { bg: "#D6C6AA", border: "#b8a78a", desc: "Насыщенный серый", group: "Группа C" },
	C4: { bg: "#C7B596", border: "#a99778", desc: "Темный серо-коричневый", group: "Группа C" },

	// VITA Classical D (Reddish-Grey) — exact hex from DentTechnician vita_palette.json
	D2: { bg: "#E7DCC6", border: "#cbbea8", desc: "Светлый красно-серый", group: "Группа D" },
	D3: { bg: "#DACDB5", border: "#bdae95", desc: "Средний красно-серый", group: "Группа D" },
	D4: { bg: "#CBBCA2", border: "#ad9d82", desc: "Темный красно-серый", group: "Группа D" },

	// Bleach Shades — exact hex from DentTechnician vita_palette.json
	BL1: { bg: "#FFF7EE", border: "#e2dad0", desc: "Ультра-белый отбеленный (Hollywood)", group: "Bleach" },
	BL2: { bg: "#FEF1E3", border: "#e1d4c5", desc: "Экстра-светлый отбеленный", group: "Bleach" },
	BL3: { bg: "#FDEAD6", border: "#dfcbb7", desc: "Мягкий отбеленный", group: "Bleach" },
	BL4: { bg: "#FBE1C6", border: "#ddc2a6", desc: "Натуральный отбеленный", group: "Bleach" },
	"0M1": { bg: "#fcfbfa", border: "#e5e3dc", desc: "3D Bleach 0M1", group: "Bleach" },
	"0M2": { bg: "#f9f7f1", border: "#dfdcd2", desc: "3D Bleach 0M2", group: "Bleach" },
	"0M3": { bg: "#f6f2e8", border: "#d9d4c5", desc: "3D Bleach 0M3", group: "Bleach" },


	// VITA 3D-Master
	"1M1": { bg: "#f7f2ea", border: "#ded6ca", desc: "L1 Chroma 1", group: "3D Group 1" },
	"1M2": { bg: "#f2e9dc", border: "#d5c9b8", desc: "L1 Chroma 2", group: "3D Group 1" },
	"2L1.5": { bg: "#f2ebd9", border: "#d6cdb5", desc: "L2 Желтоватый 1.5", group: "3D Group 2" },
	"2L2.5": { bg: "#ece0c6", border: "#cdc0a1", desc: "L2 Желтоватый 2.5", group: "3D Group 2" },
	"2M1": { bg: "#f3ede2", border: "#d8cfc0", desc: "L2 Нейтральный 1", group: "3D Group 2" },
	"2M2": { bg: "#ece3d3", border: "#cfc3b0", desc: "L2 Нейтральный 2", group: "3D Group 2" },
	"2M3": { bg: "#e4d6bf", border: "#c5b59b", desc: "L2 Нейтральный 3", group: "3D Group 2" },
	"2R1.5": { bg: "#f4ebe2", border: "#d9cdbf", desc: "L2 Красноватый 1.5", group: "3D Group 2" },
	"2R2.5": { bg: "#eddccf", border: "#d0bcad", desc: "L2 Красноватый 2.5", group: "3D Group 2" },
	"3L1.5": { bg: "#e9dfc7", border: "#cdc1a3", desc: "L3 Желтоватый 1.5", group: "3D Group 3" },
	"3L2.5": { bg: "#dfd2b2", border: "#c0b08b", desc: "L3 Желтоватый 2.5", group: "3D Group 3" },
	"3M1": { bg: "#e9e1d1", border: "#cdc3b0", desc: "L3 Нейтральный 1", group: "3D Group 3" },
	"3M2": { bg: "#e1d6c1", border: "#c3b59c", desc: "L3 Нейтральный 2", group: "3D Group 3" },
	"3M3": { bg: "#d7c8ac", border: "#b6a484", desc: "L3 Нейтральный 3", group: "3D Group 3" },
	"3R1.5": { bg: "#e9dcce", border: "#cebdbc", desc: "L3 Красноватый 1.5", group: "3D Group 3" },
	"3R2.5": { bg: "#decbba", border: "#bfa994", desc: "L3 Красноватый 2.5", group: "3D Group 3" },
	"4L1.5": { bg: "#dfd0b2", border: "#c1b08f", desc: "L4 Желтоватый 1.5", group: "3D Group 4" },
	"4L2.5": { bg: "#d3bf9c", border: "#b29b74", desc: "L4 Желтоватый 2.5", group: "3D Group 4" },
	"4M1": { bg: "#ded2bf", border: "#bfb19b", desc: "L4 Нейтральный 1", group: "3D Group 4" },
	"4M2": { bg: "#d5c5ad", border: "#b4a185", desc: "L4 Нейтральный 2", group: "3D Group 4" },
	"4M3": { bg: "#c9b496", border: "#a68e6c", desc: "L4 Нейтральный 3", group: "3D Group 4" },
	"4R1.5": { bg: "#dfcdbd", border: "#c0ab99", desc: "L4 Красноватый 1.5", group: "3D Group 4" },
	"4R2.5": { bg: "#d3bca8", border: "#b29881", desc: "L4 Красноватый 2.5", group: "3D Group 4" },
	"5M1": { bg: "#cfbe9f", border: "#ac9875", desc: "L5 Нейтральный 1", group: "3D Group 5" },
	"5M2": { bg: "#c2ae8b", border: "#9e8760", desc: "L5 Нейтральный 2", group: "3D Group 5" },
	"5M3": { bg: "#b59e76", border: "#8e754b", desc: "L5 Нейтральный 3", group: "3D Group 5" },

	// Stump Shades (ND1–ND9)
	ND1: { bg: "#f9f8f4", border: "#e0ded6", desc: "Ультра-светлая отбеленная культя", group: "Культя" },
	ND2: { bg: "#f3ede0", border: "#d7cebc", desc: "Светлая витальная культя (A1/B1)", group: "Культя" },
	ND3: { bg: "#ebdcc9", border: "#cdbc9f", desc: "Средняя витальная культя (A2/B2)", group: "Культя" },
	ND4: { bg: "#dec6ab", border: "#bda281", desc: "Насыщенная витальная культя (A3/A3.5)", group: "Культя" },
	ND5: { bg: "#d1b392", border: "#af8e68", desc: "Легко дисколорированная культя", group: "Культя" },
	ND6: { bg: "#bf9e7d", border: "#9c7a57", desc: "Потемневшая депульпированная культя", group: "Культя" },
	ND7: { bg: "#9b8d80", border: "#7b6c5f", desc: "Темная дисколорированная серая культя", group: "Культя" },
	ND8: { bg: "#6d5d52", border: "#4f4137", desc: "Сильно пигментированная девитальная", group: "Культя" },
	ND9: { bg: "#949ba2", border: "#6c737c", desc: "Металлическая вкладка / титановый абатмент", group: "Культя" },
};

export const STUMP_NATURAL_DIE_SHADES = [
	{ id: "ND1", name: "ND1 — Отбеленная / Ультра-светлая культя", desc: "Для виниров на отбеленных зубах" },
	{ id: "ND2", name: "ND2 — Светлая витальная культя (A1/B1)", desc: "Естественный дентин высокой светлоты" },
	{ id: "ND3", name: "ND3 — Средняя витальная культя (A2/B2)", desc: "Стандартный витальный зуб" },
	{ id: "ND4", name: "ND4 — Насыщенная витальная культя (A3/A3.5)", desc: "Зрелый желтоватый дентин" },
	{ id: "ND5", name: "ND5 — Легко дисколорированная культя", desc: "Начальное потемнение зуба" },
	{ id: "ND6", name: "ND6 — Умеренно потемневшая культя (депульпированный)", desc: "Депульпированный зуб с желто-серым оттенком" },
	{ id: "ND7", name: "ND7 — Темная дисколорированная культя (серый оттенок)", desc: "Выраженный серый дисколорит" },
	{ id: "ND8", name: "ND8 — Сильно пигментированная / девитальная культя", desc: "Темно-коричневый/черный дентин" },
	{ id: "ND9", name: "ND9 — Металлическая литая вкладка / титановый абатмент", desc: "Темный металл под коронку" },
] as const;
