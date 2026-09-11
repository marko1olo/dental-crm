/**
 * packages/shared/src/types/schedule.ts
 *
 * StomX 4-State Workplace & Chair Color Palettes.
 * Derived from StomX:
 *   - data/catalogs/workplace_colors.json
 *   - data/workplaces/all.json
 *
 * Each workplace/chair palette has 4 theme-aware colors:
 * - bright_code: light accent (borders, active pills, badges)
 * - bright_dark: dark background tint / container background
 * - code: light background of card / column
 * - dark: dark background of card / column
 */

import { z } from "zod";

export const stomxWorkplacePaletteItemSchema = z.object({
	id: z.number().optional(),
	nameRu: z.string(),
	bright_code: z.string(),
	bright_dark: z.string(),
	code: z.string(),
	dark: z.string(),
});

export type StomxWorkplacePaletteItem = z.infer<typeof stomxWorkplacePaletteItemSchema>;
export const stomxWorkplacePaletteSchema = stomxWorkplacePaletteItemSchema;

export const STOMX_WORKPLACE_PALETTES = [
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
] as const satisfies readonly StomxWorkplacePaletteItem[];

export type StomxWorkplacePalette = (typeof STOMX_WORKPLACE_PALETTES)[number];

export const DEFAULT_STOMX_WORKPLACE_PALETTE: StomxWorkplacePaletteItem = STOMX_WORKPLACE_PALETTES[0]!;

export const STOMX_WORKPLACE_PALETTES_MAP = {
	lavender: STOMX_WORKPLACE_PALETTES[0],
	blue: STOMX_WORKPLACE_PALETTES[1],
	rose: STOMX_WORKPLACE_PALETTES[2],
	olive: STOMX_WORKPLACE_PALETTES[3],
	sand: STOMX_WORKPLACE_PALETTES[4],
} as const;

/**
 * Resolves a StomX 4-state workplace palette by ID, number index, or string identifier.
 */
export function getStomxWorkplacePalette(indexOrId: number | string): StomxWorkplacePaletteItem {
	if (typeof indexOrId === "number") {
		const byId = STOMX_WORKPLACE_PALETTES.find((p) => p.id === indexOrId);
		if (byId) return byId;
		const idx = Math.abs(indexOrId) % STOMX_WORKPLACE_PALETTES.length;
		return STOMX_WORKPLACE_PALETTES[idx] ?? DEFAULT_STOMX_WORKPLACE_PALETTE;
	}
	if (!indexOrId) {
		return DEFAULT_STOMX_WORKPLACE_PALETTE;
	}
	const lower = String(indexOrId).toLowerCase();
	const mapped = (STOMX_WORKPLACE_PALETTES_MAP as Record<string, StomxWorkplacePaletteItem | undefined>)[lower];
	if (mapped) {
		return mapped;
	}
	const num = Number(indexOrId);
	if (!Number.isNaN(num)) {
		const byId = STOMX_WORKPLACE_PALETTES.find((p) => p.id === num);
		if (byId) return byId;
		const idx = Math.abs(num) % STOMX_WORKPLACE_PALETTES.length;
		return STOMX_WORKPLACE_PALETTES[idx] ?? DEFAULT_STOMX_WORKPLACE_PALETTE;
	}
	let hash = 0;
	for (let i = 0; i < indexOrId.length; i++) {
		hash = (hash << 5) - hash + indexOrId.charCodeAt(i);
		hash |= 0;
	}
	const hashIdx = Math.abs(hash) % STOMX_WORKPLACE_PALETTES.length;
	return STOMX_WORKPLACE_PALETTES[hashIdx] ?? DEFAULT_STOMX_WORKPLACE_PALETTE;
}
