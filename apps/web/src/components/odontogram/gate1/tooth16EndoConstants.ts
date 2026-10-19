/**
 * DENTE Dental CRM — Endodontic Canals & Periapical Anchors for Upper Molars 16 / 26
 * Wheeler's Dental Anatomy Ch. 12: 4 root canals (MB1, MB2 mesiopalatal, P, DB).
 * Mandate 8b <= 120 lines.
 */

export interface Tooth16EndoCanalDef {
	id: string;
	nameRu: string;
	apex: { x: number; y: number };
	orifice: { x: number; y: number };
}

export interface Tooth16PeriapicalAnchorDef {
	id: string;
	x: number;
	y: number;
	r: number;
}

export const TOOTH16_ENDO_CANALS = [
	{
		id: "MB1",
		nameRu: "Мезиально-щечный 1",
		apex: { x: 18, y: 14 },
		orifice: { x: 34, y: 98.5 },
	},
	{
		id: "MB2",
		nameRu: "Мезиально-щечный 2",
		apex: { x: 23, y: 22 },
		orifice: { x: 38, y: 98.5 },
	},
	{
		id: "P",
		nameRu: "Нёбный (Palatal)",
		apex: { x: 50, y: 8 },
		orifice: { x: 50, y: 98.5 },
	},
	{
		id: "DB",
		nameRu: "Дистально-щечный",
		apex: { x: 82, y: 18 },
		orifice: { x: 64, y: 98.5 },
	},
] as const;

export const TOOTH16_PERIAPICAL_ANCHORS = [
	{ id: "MB", x: 18, y: 14, r: 12 },
	{ id: "P", x: 50, y: 8, r: 14 },
	{ id: "DB", x: 82, y: 18, r: 12 },
] as const;
