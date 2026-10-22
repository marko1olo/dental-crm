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
