/**
 * DENTE Dental CRM — ToothData to Gate 0 Layer Flags Adapter
 * Mandate 8b <= 120 lines. Zero loss bidirectional bridge.
 */

import type { ToothData } from "../../chart/types/toothRendererTypes";
import { DEFAULT_TOOTH46_LAYERS, type CariesDepth, type CariesType, type Tooth46LayerFlags } from "../tooth46Types";

function surfacesToCariesType(surfaces: readonly string[] | undefined, isAnterior: boolean): CariesType {
	if (!surfaces || surfaces.length === 0) return isAnterior ? "class3" : "class1";
	const s = new Set(surfaces.map((x) => x.toUpperCase()));
	if (isAnterior) {
		if (s.has("I") || s.has("INCISAL") || s.has("EDGE")) return "class4";
		if (s.has("V") || s.has("CERVICAL") || s.has("G")) return "class5";
		return "class3";
	}
	if (s.has("M") && s.has("O") && s.has("D")) return "class2_mod";
	if (s.has("M") && s.has("O")) return "class2_mo";
	if (s.has("D") && s.has("O")) return "class2_do";
	if (s.has("M")) return "class2_m";
	if (s.has("D")) return "class2_d";
	if (s.has("V") || s.has("CERVICAL") || s.has("G")) return "class5";
	return "class1";
}

export function toothDataToGate0Flags(
	toothData?: ToothData | null,
	toothNumber?: number,
): Tooth46LayerFlags {
	const base = { ...DEFAULT_TOOTH46_LAYERS };
	if (!toothData) return base;
	const custom = (toothData.clinicalData as Record<string, unknown> | undefined)?.layers as Partial<Tooth46LayerFlags> | undefined;
	if (custom) Object.assign(base, custom);
	const num = toothNumber ?? toothData.toothNumber;
	const isAnterior = num !== undefined && [1, 2, 3].includes(num % 10);
	const state = String(toothData.state || "Healthy");

	if (state === "Caries") {
		base.caries = true;
		base.cariesType = surfacesToCariesType(toothData.surfaces, isAnterior);
		const cd = toothData.clinicalData as Record<string, unknown> | undefined;
		if (cd?.cariesDepth) base.cariesDepth = cd.cariesDepth as CariesDepth;
	} else if (state === "Pulpitis") {
		Object.assign(base, { pulp: true, canals: true, canalCondition: "pulpitis" as const, caries: false });
	} else if (state.startsWith("Periodontitis")) {
		Object.assign(base, { periapicalHalo: true, periapicalCondition: "granuloma" as const });
	} else if (state === "Filled") {
		Object.assign(base, { composite: true, compositeCondition: "adequate" as const, caries: false });
	} else if (state === "Crown" || state === "Planned_Crown" || state === "Bridge" || state === "Bridge_Abutment") {
		Object.assign(base, { zirconiaCrown: true, crownMaterial: "zirconia" as const, crownCondition: "adequate" as const });
	} else if (state === "Inlay") {
		Object.assign(base, { inlayOnlay: "inlay" as const, caries: false });
	} else if (state === "Veneer") {
		Object.assign(base, { zirconiaCrown: true, crownMaterial: "emax" as const });
	} else if (state === "Implant" || state === "Planned_Implant") {
		Object.assign(base, { implant: true, implantStage: "crown" as const });
	} else if (state === "Missing" || state === "Extracted") {
		base.missing = true;
	} else if (state === "Root_Canal_Treated") {
		Object.assign(base, { canals: true, guttaPercha: true, canalCondition: "treated" as const });
	} else if (state === "Root") {
		base.crown = false;
	} else if (state === "Calculus") {
		base.calculus = true;
	}

	if (toothData.periapicalLesion) Object.assign(base, { periapicalHalo: true, periapicalCondition: "cyst" as const });
	if (toothData.hasPost) Object.assign(base, { postCore: true, postCoreType: toothData.postType || "fiber" });
	if (toothData.hasFracture) base.crack = true;
	return base;
}

export function cariesToToothDataUpdate(
	toothNumber: number,
	cariesType: CariesType,
	cariesDepth: CariesDepth,
	existing?: ToothData,
): Partial<ToothData> {
	const surfMap: Record<CariesType, string[]> = {
		class1: ["O"], class2_m: ["M"], class2_d: ["D"], class2_mo: ["M", "O"],
		class2_do: ["D", "O"], class2_mod: ["M", "O", "D"], class3: ["M"],
		class4: ["I"], class5: ["V"], white_spot: ["O"],
	};
	const prevClinical = (existing?.clinicalData || {}) as Record<string, unknown>;
	return {
		toothNumber,
		state: "Caries",
		surfaces: surfMap[cariesType] ?? ["O"],
		clinicalData: { ...prevClinical, cariesType, cariesDepth },
	};
}
