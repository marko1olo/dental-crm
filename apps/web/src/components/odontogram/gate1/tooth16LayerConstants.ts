/**
 * DENTE Dental CRM — Layer Constants for Tooth 16 / 26 (Gate 1)
 * Mandate 8b <= 120 lines.
 */

import type { Tooth16LayerFlags } from "./tooth16Types";

export const DEFAULT_TOOTH16_LAYERS: Tooth16LayerFlags = {
	roots: true,
	crown: true,
	cusps: true,
	fissures: true,
	cristaObliqua: true,
	carabelli: true,
	pulp: false,
	canals: false,
	guttaPercha: false,
	periapicalHalo: false,
	caries: false,
	composite: false,
	zirconiaCrown: false,
	crownMaterial: "zirconia",
	compositeCondition: "adequate",
	crownCondition: "adequate",
	abfraction: false,
	postCore: false,
	calculus: false,
	crack: false,
	implant: false,
	missing: false,
	grooves: true,
	cej: true,
};
