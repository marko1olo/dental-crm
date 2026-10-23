export const VITA_BLEACH_SHADES = ["BL1", "BL2", "BL3", "BL4"] as const;
export type VitaBleachShade = (typeof VITA_BLEACH_SHADES)[number];

export const VITA_CLASSICAL_SHADES = [
	"A1", "A2", "A3", "A3.5", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "C3", "C4", "D2", "D3", "D4",
] as const;
export type VitaClassicalShade = (typeof VITA_CLASSICAL_SHADES)[number];

export const VITA_SHADE_GROUPS = [
	{ group: "Bleach", labelRu: "Bleach (Экстра-белые)", shades: ["BL1", "BL2", "BL3", "BL4"] as const },
	{ group: "A", labelRu: "Группа A (Красновато-коричневые)", shades: ["A1", "A2", "A3", "A3.5", "A4"] as const },
	{ group: "B", labelRu: "Группа B (Красновато-желтые)", shades: ["B1", "B2", "B3", "B4"] as const },
	{ group: "C", labelRu: "Группа C (Серые)", shades: ["C1", "C2", "C3", "C4"] as const },
	{ group: "D", labelRu: "Группа D (Красновато-серые)", shades: ["D2", "D3", "D4"] as const },
] as const;

export const ALL_VITA_AND_BLEACH_SHADES = [
	...VITA_BLEACH_SHADES,
	...VITA_CLASSICAL_SHADES,
] as const;
export type AllVitaAndBleachShade = (typeof ALL_VITA_AND_BLEACH_SHADES)[number];
