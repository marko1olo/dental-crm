/**
 * packages/shared/src/types/schedule.ts
 *
 * Канонические 4-состоятельные палитры кресел и рабочих мест расписания DENTE Dental CRM.
 *
 * Each workplace/chair palette has 4 theme-aware colors:
 * - bright_code: light accent (borders, active pills, badges)
 * - bright_dark: dark background tint / container background
 * - code: light background of card / column
 * - dark: dark background of card / column
 */

import { z } from "zod";

export const workplaceChairPaletteItemSchema = z.object({
	id: z.number().optional(),
	nameRu: z.string(),
	bright_code: z.string(),
	bright_dark: z.string(),
	code: z.string(),
	dark: z.string(),
});

export type WorkplaceChairPaletteItem = z.infer<typeof workplaceChairPaletteItemSchema>;
export const workplaceChairPaletteSchema = workplaceChairPaletteItemSchema;

export const WORKPLACE_CHAIR_PALETTES = [
	{
		id: 1,
		nameRu: "Лаванда",
		bright_code: "#AEA7D3",
		bright_dark: "#292541",
		code: "#D3CFE7",
		dark: "#3E3862",
	},
	{
		id: 5,
		nameRu: "Синий",
		bright_code: "#91B9E9",
		bright_dark: "#25313F",
		code: "#BBD4F1",
		dark: "#394B60",
	},
	{
		id: 6,
		nameRu: "Роза",
		bright_code: "#EF8AAF",
		bright_dark: "#392029",
		code: "#F8CCDC",
		dark: "#623746",
	},
	{
		id: 8,
		nameRu: "Олива",
		bright_code: "#C1DE9B",
		bright_dark: "#2C381C",
		code: "#D7EABF",
		dark: "#506633",
	},
	{
		id: 9,
		nameRu: "Песок",
		bright_code: "#E1EF8A",
		bright_dark: "#413425",
		code: "#F2F8CC",
		dark: "#624E38",
	},
] as const satisfies readonly WorkplaceChairPaletteItem[];

export type WorkplaceChairPalette = (typeof WORKPLACE_CHAIR_PALETTES)[number];

export const DEFAULT_WORKPLACE_CHAIR_PALETTE: WorkplaceChairPaletteItem = WORKPLACE_CHAIR_PALETTES[0]!;

export const WORKPLACE_CHAIR_PALETTES_MAP = {
	lavender: WORKPLACE_CHAIR_PALETTES[0],
	blue: WORKPLACE_CHAIR_PALETTES[1],
	rose: WORKPLACE_CHAIR_PALETTES[2],
	olive: WORKPLACE_CHAIR_PALETTES[3],
	sand: WORKPLACE_CHAIR_PALETTES[4],
} as const;

/**
 * Resolves a 4-state workplace chair palette by ID, number index, or string identifier.
 */
export function getWorkplaceChairPalette(indexOrId: number | string): WorkplaceChairPaletteItem {
	if (typeof indexOrId === "number") {
		const byId = WORKPLACE_CHAIR_PALETTES.find((p) => p.id === indexOrId);
		if (byId) return byId;
		const idx = Math.abs(indexOrId) % WORKPLACE_CHAIR_PALETTES.length;
		return WORKPLACE_CHAIR_PALETTES[idx] ?? DEFAULT_WORKPLACE_CHAIR_PALETTE;
	}
	if (!indexOrId) {
		return DEFAULT_WORKPLACE_CHAIR_PALETTE;
	}
	const lower = String(indexOrId).toLowerCase();
	const mapped = (WORKPLACE_CHAIR_PALETTES_MAP as Record<string, WorkplaceChairPaletteItem | undefined>)[lower];
	if (mapped) {
		return mapped;
	}
	const num = Number(indexOrId);
	if (!Number.isNaN(num)) {
		const byId = WORKPLACE_CHAIR_PALETTES.find((p) => p.id === num);
		if (byId) return byId;
		const idx = Math.abs(num) % WORKPLACE_CHAIR_PALETTES.length;
		return WORKPLACE_CHAIR_PALETTES[idx] ?? DEFAULT_WORKPLACE_CHAIR_PALETTE;
	}
	let hash = 0;
	for (let i = 0; i < indexOrId.length; i++) {
		hash = (hash << 5) - hash + indexOrId.charCodeAt(i);
		hash |= 0;
	}
	const hashIdx = Math.abs(hash) % WORKPLACE_CHAIR_PALETTES.length;
	return WORKPLACE_CHAIR_PALETTES[hashIdx] ?? DEFAULT_WORKPLACE_CHAIR_PALETTE;
}

// ============================================================================
// Обратная совместимость для плавного перехода (Backward Compatibility Aliases)
// ============================================================================
export const stomxWorkplacePaletteItemSchema = workplaceChairPaletteItemSchema;
export type StomxWorkplacePaletteItem = WorkplaceChairPaletteItem;
export const stomxWorkplacePaletteSchema = workplaceChairPaletteSchema;
export const STOMX_WORKPLACE_PALETTES = WORKPLACE_CHAIR_PALETTES;
export type StomxWorkplacePalette = WorkplaceChairPalette;
export const DEFAULT_STOMX_WORKPLACE_PALETTE = DEFAULT_WORKPLACE_CHAIR_PALETTE;
export const STOMX_WORKPLACE_PALETTES_MAP = WORKPLACE_CHAIR_PALETTES_MAP;
export const getStomxWorkplacePalette = getWorkplaceChairPalette;
