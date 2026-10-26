/**
 * systemsList.ts — Полный перечень канонических систем (Мандат 8b <= 120 строк).
 */

import type { ImplantSystemSpec } from "./types";
import { OSSTEM_SYSTEM } from "./osstem";
import { DENTIUM_SYSTEM } from "./dentium";
import { NOBEL_BIOCARE_SYSTEM } from "./nobel";
import { STRAUMANN_SYSTEM } from "./straumann";
import { ASTRA_TECH_SYSTEM } from "./astraTech";
import { MIS_SYSTEM, GENERIC_STANDARD_SYSTEM } from "./misGeneric";

export const CANONICAL_IMPLANT_SYSTEMS: ImplantSystemSpec[] = [
	OSSTEM_SYSTEM,
	STRAUMANN_SYSTEM,
	NOBEL_BIOCARE_SYSTEM,
	DENTIUM_SYSTEM,
	MIS_SYSTEM,
	ASTRA_TECH_SYSTEM,
	GENERIC_STANDARD_SYSTEM,
];

export const DENTAL_IMPLANT_BRANDS = CANONICAL_IMPLANT_SYSTEMS;
