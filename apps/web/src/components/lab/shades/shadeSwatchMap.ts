export interface ShadeSwatchInfo {
	bg: string;
	border: string;
	desc: string;
	group?: string;
}

export const SHADE_SWATCH_MAP: Record<string, ShadeSwatchInfo> = {
	// VITA Classical A (Reddish-Brownish)
	A1: { bg: "#F3E2C8", border: "#d8c5a8", desc: "Светлый красновато-коричневый", group: "Группа A" },
	A2: { bg: "#EBD7BB", border: "#d0bc9e", desc: "Средний естественный", group: "Группа A" },
	A3: { bg: "#E2CBAE", border: "#c7af91", desc: "Насыщенный дентинный", group: "Группа A" },
	"A3.5": { bg: "#D8C2A4", border: "#bda585", desc: "Темный пришеечный", group: "Группа A" },
	A4: { bg: "#CFA98F", border: "#b38c71", desc: "Интенсивный коричневый", group: "Группа A" },

	// VITA Classical B (Yellowish)
	B1: { bg: "#F1E6CF", border: "#d5c9b0", desc: "Светлый желтоватый", group: "Группа B" },
	B2: { bg: "#E6D9BE", border: "#c9bba0", desc: "Средний желтоватый", group: "Группа B" },
	B3: { bg: "#DACAAE", border: "#bcae91", desc: "Насыщенный желтый", group: "Группа B" },
	B4: { bg: "#CDBA9C", border: "#af9d7e", desc: "Темный желтоватый", group: "Группа B" },

	// VITA Classical C (Greyish)
	C1: { bg: "#E9DEC6", border: "#ccc0a8", desc: "Светлый сероватый", group: "Группа C" },
	C2: { bg: "#E0D2B8", border: "#c3b499", desc: "Средний серый", group: "Группа C" },
	C3: { bg: "#D6C6AA", border: "#b8a78a", desc: "Насыщенный серый", group: "Группа C" },
	C4: { bg: "#C7B596", border: "#a99778", desc: "Темный серо-коричневый", group: "Группа C" },

	// VITA Classical D (Reddish-Grey)
	D2: { bg: "#E7DCC6", border: "#cbbea8", desc: "Светлый красно-серый", group: "Группа D" },
	D3: { bg: "#DACDB5", border: "#bdae95", desc: "Средний красно-серый", group: "Группа D" },
	D4: { bg: "#CBBCA2", border: "#ad9d82", desc: "Темный красно-серый", group: "Группа D" },

	// Bleach Shades
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
