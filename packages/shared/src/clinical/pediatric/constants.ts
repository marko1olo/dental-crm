import { z } from "zod";
import {
	ALL_MIXED_TEETH,
	DECIDUOUS_TEETH,
	DECIDUOUS_TEETH_QUADRANT_5,
	DECIDUOUS_TEETH_QUADRANT_6,
	DECIDUOUS_TEETH_QUADRANT_7,
	DECIDUOUS_TEETH_QUADRANT_8,
	MIXED_BOTTOM_TEETH,
	MIXED_TOP_TEETH,
	isDeciduousTooth,
	isPrimaryTooth,
} from "../dentalFormulaSsot.js";

/**
 * FDI Primary Dentition Tooth Numbers (51..55, 61..65, 71..75, 81..85)
 * Canonical definitions mapped directly to dentalFormulaSsot:
 */
export const PRIMARY_UPPER_RIGHT = DECIDUOUS_TEETH_QUADRANT_5;
export const PRIMARY_UPPER_LEFT = DECIDUOUS_TEETH_QUADRANT_6;
export const PRIMARY_LOWER_LEFT = DECIDUOUS_TEETH_QUADRANT_7;
export const PRIMARY_LOWER_RIGHT = DECIDUOUS_TEETH_QUADRANT_8;

export const PRIMARY_UPPER_TEETH = [
	...PRIMARY_UPPER_RIGHT,
	...PRIMARY_UPPER_LEFT,
] as const;

export const PRIMARY_LOWER_TEETH = [
	...PRIMARY_LOWER_RIGHT,
	...PRIMARY_LOWER_LEFT,
] as const;

export const ALL_PRIMARY_TEETH = DECIDUOUS_TEETH;

export const primaryToothNumberSchema = z
	.number()
	.int()
	.refine((n) => ALL_PRIMARY_TEETH.includes(n as (typeof ALL_PRIMARY_TEETH)[number]), {
		message: "Номер зуба должен соответствовать временному прикусу (51-55, 61-65, 71-75, 81-85)",
	});

export type PrimaryToothNumber = z.infer<typeof primaryToothNumberSchema>;

export { isDeciduousTooth, isPrimaryTooth };

/**
 * Mixed Dentition Standard Arch Presets (6–12 years)
 * Standard Mixed Top: First permanent molars (16, 26) + primary teeth (55..51, 61..65)
 * Standard Mixed Bottom: First permanent molars (46, 36) + primary teeth (85..81, 71..75)
 */
export const MIXED_DENTITION_TOP = MIXED_TOP_TEETH;
export const MIXED_DENTITION_BOTTOM = MIXED_BOTTOM_TEETH;
export const ALL_MIXED_DENTITION_TEETH = ALL_MIXED_TEETH;

