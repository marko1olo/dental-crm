/**
 * vitaPalette.ts — Canonical VITA Classical + Bleach Shade Palette and Standard Dental Lab Work Types Catalog.
 * Extracted and normalized from DentTechnician reverse engineering suite.
 */

export interface VitaShadePaletteItem {
	readonly code: string;
	readonly group: "A" | "B" | "C" | "D" | "BL";
	readonly displayName: string;
	readonly type: "classical" | "bleach";
	readonly order: number;
	readonly hex: string;
}

/**
 * 20 эталонных оттенков VITA Classical + Bleach с точными HEX-цветами.
 */
export const VITA_CLASSICAL_PLUS_BLEACH_PALETTE: readonly VitaShadePaletteItem[] = [
	{ code: "A1", group: "A", displayName: "A1", type: "classical", order: 1, hex: "#F3E2C8" },
	{ code: "A2", group: "A", displayName: "A2", type: "classical", order: 2, hex: "#EBD7BB" },
	{ code: "A3", group: "A", displayName: "A3", type: "classical", order: 3, hex: "#E2CBAE" },
	{ code: "A3.5", group: "A", displayName: "A3.5", type: "classical", order: 4, hex: "#D8C2A4" },
	{ code: "A4", group: "A", displayName: "A4", type: "classical", order: 5, hex: "#CFA98F" },

	{ code: "B1", group: "B", displayName: "B1", type: "classical", order: 6, hex: "#F1E6CF" },
	{ code: "B2", group: "B", displayName: "B2", type: "classical", order: 7, hex: "#E6D9BE" },
	{ code: "B3", group: "B", displayName: "B3", type: "classical", order: 8, hex: "#DACAAE" },
	{ code: "B4", group: "B", displayName: "B4", type: "classical", order: 9, hex: "#CDBA9C" },

	{ code: "C1", group: "C", displayName: "C1", type: "classical", order: 10, hex: "#E9DEC6" },
	{ code: "C2", group: "C", displayName: "C2", type: "classical", order: 11, hex: "#E0D2B8" },
	{ code: "C3", group: "C", displayName: "C3", type: "classical", order: 12, hex: "#D6C6AA" },
	{ code: "C4", group: "C", displayName: "C4", type: "classical", order: 13, hex: "#C7B596" },

	{ code: "D2", group: "D", displayName: "D2", type: "classical", order: 14, hex: "#E7DCC6" },
	{ code: "D3", group: "D", displayName: "D3", type: "classical", order: 15, hex: "#DACDB5" },
	{ code: "D4", group: "D", displayName: "D4", type: "classical", order: 16, hex: "#CBBCA2" },

	{ code: "BL1", group: "BL", displayName: "BL1", type: "bleach", order: 17, hex: "#FFF7EE" },
	{ code: "BL2", group: "BL", displayName: "BL2", type: "bleach", order: 18, hex: "#FEF1E3" },
	{ code: "BL3", group: "BL", displayName: "BL3", type: "bleach", order: 19, hex: "#FDEAD6" },
	{ code: "BL4", group: "BL", displayName: "BL4", type: "bleach", order: 20, hex: "#FBE1C6" },
] as const;

/**
 * Словарь сопоставления кода оттенка VITA в HEX-цвет.
 */
export const VITA_SHADE_HEX_MAP: Readonly<Record<string, string>> = Object.freeze(
	Object.fromEntries(VITA_CLASSICAL_PLUS_BLEACH_PALETTE.map((item) => [item.code, item.hex])),
);

/**
 * Получить HEX-код оттенка VITA по его обозначению (регистронезависимо).
 */
export function getVitaShadeHex(shadeCode: string | null | undefined): string | undefined {
	if (!shadeCode) return undefined;
	const normalized = shadeCode.trim().toUpperCase();
	return VITA_SHADE_HEX_MAP[normalized];
}

// ─── 17 ЭТАЛОННЫХ ИЗДЕЛИЙ ЗУБОТЕХНИЧЕСКОЙ ЛАБОРАТОРИИ ──────────────────────────

export interface LabWorkTypeCatalogItem {
	readonly id: string;
	readonly titleRu: string;
	readonly sortOrder: number;
	readonly enabled: boolean;
	readonly category: "fixed_prosthetics" | "removable_prosthetics" | "implant_prosthetics" | "auxiliary";
}

/**
 * 17 канонических видов зуботехнических изделий (извлечены из DentTechnician).
 */
export const CANONICAL_LAB_WORK_TYPES: readonly LabWorkTypeCatalogItem[] = [
	{ id: "wt_001", titleRu: "Коронка металлокерамическая", sortOrder: 1, enabled: true, category: "fixed_prosthetics" },
	{ id: "wt_002", titleRu: "Коронка цельнолитая", sortOrder: 2, enabled: true, category: "fixed_prosthetics" },
	{ id: "wt_003", titleRu: "Коронка ZrO2", sortOrder: 3, enabled: true, category: "fixed_prosthetics" },
	{ id: "wt_004", titleRu: "Винир ZrO2", sortOrder: 4, enabled: true, category: "fixed_prosthetics" },
	{ id: "wt_005", titleRu: "Коронка e.MAX", sortOrder: 5, enabled: true, category: "fixed_prosthetics" },
	{ id: "wt_006", titleRu: "Винир e.MAX", sortOrder: 6, enabled: true, category: "fixed_prosthetics" },
	{ id: "wt_007", titleRu: "Бюгель металлический", sortOrder: 7, enabled: true, category: "removable_prosthetics" },
	{ id: "wt_008", titleRu: "Бюгель термопластический", sortOrder: 8, enabled: true, category: "removable_prosthetics" },
	{ id: "wt_009", titleRu: "Коронка ПММА", sortOrder: 9, enabled: true, category: "fixed_prosthetics" },
	{ id: "wt_010", titleRu: "WaxUp", sortOrder: 10, enabled: true, category: "auxiliary" },
	{ id: "wt_011", titleRu: "ППСП", sortOrder: 11, enabled: true, category: "removable_prosthetics" },
	{ id: "wt_012", titleRu: "ЧПСП", sortOrder: 12, enabled: true, category: "removable_prosthetics" },
	{ id: "wt_013", titleRu: "Коронка металлокерамическая на импланте", sortOrder: 13, enabled: true, category: "implant_prosthetics" },
	{ id: "wt_014", titleRu: "Коронка ZrO2 на импланте", sortOrder: 14, enabled: true, category: "implant_prosthetics" },
	{ id: "wt_015", titleRu: "Индивидуальная слепочная ложка", sortOrder: 15, enabled: true, category: "auxiliary" },
	{ id: "wt_016", titleRu: "Прикусной шаблон", sortOrder: 16, enabled: true, category: "auxiliary" },
	{ id: "wt_017", titleRu: "Трансфер-чек", sortOrder: 17, enabled: true, category: "auxiliary" },
] as const;

export const LAB_WORK_TYPES_BY_ID: Readonly<Record<string, LabWorkTypeCatalogItem>> = Object.freeze(
	Object.fromEntries(CANONICAL_LAB_WORK_TYPES.map((item) => [item.id, item])),
);

export function getLabWorkTypeById(id: string | null | undefined): LabWorkTypeCatalogItem | undefined {
	if (!id) return undefined;
	return LAB_WORK_TYPES_BY_ID[id.trim()];
}
