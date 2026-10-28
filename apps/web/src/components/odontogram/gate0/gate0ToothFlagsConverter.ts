/**
 * DENTE Dental CRM — Gate 0 Anatomical Odontogram Multi-Defect Layering Converter
 * Converts live CRM ToothData into composable Tooth46LayerFlags.
 *
 * Architecture:
 * 1. Base Anatomy & Presence: Missing, Implant, Residual Root, Bridge Pontic / Abutment.
 * 2. Coronal Restorations: Artificial Crowns (Zirconia, PFM, E-Max, PMMA, Gold), Inlays/Onlays, Nanohybrid Composite.
 * 3. Endodontic Status: Pulpitis, Treated Canals (Gutta-Percha, Resorcinol, Ca(OH)2), Necrotic Pulp, Post & Core.
 * 4. Pathologies & Lesions: Enamel/Dentin Caries, Secondary Caries, Periapical Lesions (Granuloma/Cyst), Calculus, Fractures.
 *
 * Mandate 8b: 200–300 lines sweet spot.
 * Mandate 8e: Doctor autonomy, zero blocking.
 */

import type { ToothData } from "../chart/types/toothRendererTypes";
import {
	DEFAULT_TOOTH46_LAYERS,
	type CanalCondition,
	type PeriapicalCondition,
	type PostCoreType,
	type Tooth46LayerFlags,
} from "./tooth46Types";
import {
	applyAuxiliaryOverlays,
	mapClinicalDataToCariesDepth,
	mapRestorativeToCrownMaterial,
	mapSurfacesToCariesType,
} from "./gate0CariesMapper";

/** Layer 1: Base presence and anatomical architecture. Returns false if tooth is completely absent. */
function applyBaseAnatomy(flags: Tooth46LayerFlags, tooth: ToothData, clin: Record<string, unknown>): boolean {
	const state = String(tooth.state ?? "Healthy");
	const isPontic = tooth.bridgeRole === "pontic" || (state === "Bridge" && tooth.bridgeRole !== "pillar") || state === "bridge";
	const isMissingState = state === "Missing" || state === "missing" || state === "Extracted" || state === "extracted" || state === "О";
	const isImplantState = state === "Implant" || state === "implant" || state === "Planned_Implant" ||
		state === "И" || state === "Ик" || state === "Ив" || Boolean(clin.isImplant) || tooth.material === "titanium_implant";
	const isRootState = state === "Root" || state === "root" || state === "R" || state === "Корень";

	// Pontic artificial crown spanning missing gap
	if (isPontic) {
		flags.zirconiaCrown = true;
		flags.crown = false;
		flags.cusps = false;
		flags.fissures = false;
		flags.roots = false;
		flags.missing = false;
		flags.crownMaterial = mapRestorativeToCrownMaterial(tooth.material ?? (clin.crownMaterial as string));
		flags.crownCondition = clin.condition === "defective" || clin.defective ? "defective" : "adequate";
		return true;
	}

	// Unrestored missing gap / extracted tooth
	if (isMissingState) {
		flags.missing = true;
		return false;
	}

	// Dental implant fixture
	if (isImplantState) {
		flags.implant = true;
		flags.roots = false;
		flags.implantStage = (clin.stage as Tooth46LayerFlags["implantStage"]) ?? "crown";
		return true;
	}

	// Residual root (radix) — extinguish anatomical enamel crown, accentuate root trunk
	if (isRootState) {
		flags.crown = false;
		flags.cusps = false;
		flags.fissures = false;
		flags.roots = true;
		return true;
	}

	return true;
}

/** Layer 2: Coronal Restorations (Crowns, Veneers, Inlays, Fillings, Defective Restorations) */
function applyCoronalRestoration(flags: Tooth46LayerFlags, tooth: ToothData, clin: Record<string, unknown>): void {
	if (flags.missing) return;
	const state = String(tooth.state ?? "Healthy");
	const isRootOnly = !flags.crown && flags.roots && !flags.zirconiaCrown &&
		(state === "Root" || state === "root" || state === "R" || state === "Корень");

	// 1. Orthopedic Crowns & Veneers
	const isCrownState = state === "Crown" || state === "crown" || state === "Planned_Crown" ||
		state === "Temporary_Crown" || state === "К" || state === "Кд" || state === "Дк";
	const isVeneerState = state === "Veneer" || state === "veneer";
	const isBridgeAbutment = state === "Bridge_Abutment" || tooth.bridgeRole === "pillar";
	const hasCrownMaterial = tooth.material === "pfm_crown" || tooth.material === "zirconia" ||
		(tooth.material === "ceramic_emax" && clin.type !== "inlay" && clin.type !== "onlay" && state !== "Inlay" && state !== "inlay");
	const hasExplicitCrown = Boolean(clin.hasCrown || clin.crown || clin.restoration === "crown" || clin.crownMaterial);
	const isDefectiveCrownState = state === "Дк" || state === "Кд" ||
		(state === "Defective_Restoration" && (hasCrownMaterial || hasExplicitCrown || flags.zirconiaCrown));

	if (!isRootOnly && (isCrownState || isVeneerState || isBridgeAbutment || hasCrownMaterial || hasExplicitCrown || isDefectiveCrownState)) {
		flags.zirconiaCrown = true;
		flags.crown = false;
		flags.cusps = false;
		flags.fissures = false;
		if (state === "Temporary_Crown" || clin.temporary) {
			flags.crownMaterial = "pmma";
		} else if (isVeneerState) {
			flags.crownMaterial = "emax";
		} else {
			flags.crownMaterial = mapRestorativeToCrownMaterial(tooth.material ?? (clin.crownMaterial as string) ?? (clin.material as string));
		}
		flags.crownCondition = (clin.condition === "defective" || clin.defective || isDefectiveCrownState) ? "defective" : "adequate";
		return;
	}

	// 2. Ceramic Inlays / Onlays / Overlays
	const isInlayState = state === "Inlay" || state === "inlay" || state === "Onlay" || state === "onlay";
	const hasInlayMaterial = (tooth.material as string) === "inlay" || (tooth.material as string) === "onlay";
	const hasInlayClin = clin.type === "inlay" || clin.type === "onlay" || clin.type === "overlay" || Boolean(clin.inlayOnlay);

	if (!isRootOnly && (isInlayState || hasInlayMaterial || hasInlayClin)) {
		if ((tooth.material as string) === "onlay" || clin.type === "onlay" || clin.inlayOnlay === "onlay" || state === "Onlay" || state === "onlay") {
			flags.inlayOnlay = "onlay";
		} else if (clin.type === "overlay" || clin.inlayOnlay === "overlay") {
			flags.inlayOnlay = "overlay";
		} else {
			flags.inlayOnlay = "inlay";
		}
		return;
	}

	// 3. Nanohybrid Composite Restorations & Defective Fillings
	const isFilledState = state === "Filled" || state === "filled" || state === "Filling" || state === "П" || state === "Пд" || state === "Дп";
	const hasFillingClin = Boolean(clin.hasFilling || clin.filling || clin.restoration === "composite");
	const hasCompositeMaterial = tooth.material === "composite";
	const isDefectiveCompositeState = state === "Дп" || state === "Пд" || state === "Defective_Restoration";

	if (!isRootOnly && (isFilledState || hasFillingClin || hasCompositeMaterial || isDefectiveCompositeState)) {
		flags.composite = true;
		flags.compositeCondition = (clin.condition === "defective" || clin.defective || clin.hasSecondaryCaries || isDefectiveCompositeState)
			? "defective"
			: "adequate";
	}
}

/** Layer 3: Endodontic Status (Canals, Pulp, Gutta-percha, Post & Core). Preserved simultaneously under crowns & fillings. */
function applyEndodonticStatus(flags: Tooth46LayerFlags, tooth: ToothData, clin: Record<string, unknown>): void {
	if (flags.missing || flags.implant) return;
	const state = String(tooth.state ?? "Healthy");

	// 1. Root Canal Obturation (Gutta-percha, Resorcinol-formalin, Ca(OH)2)
	const hasCanalObturation = Boolean(tooth.canalObturation && tooth.canalObturation !== "unfilled");
	const hasTreatedCanalsClin = Boolean(clin.hasTreatedCanals || clin.treatedCanals || clin.canalsTreated || clin.canalObturation);
	const isRctState = state === "Root_Canal_Treated" || state === "root_canal_treated" || state === "Э" || state === "Эн" || state === "Эп";
	const hasTreatedCondition = clin.canalCondition === "adequate" || clin.canalCondition === "underfill" ||
		clin.canalCondition === "overfill" || clin.canalCondition === "broken_file";

	if (hasCanalObturation || hasTreatedCanalsClin || isRctState || hasTreatedCondition) {
		flags.canals = true;
		flags.pulp = true;
		if (tooth.canalObturation === "resorcinol_formalin" || clin.resorcinolFormalin || state === "РФ") {
			flags.resorcinolFormalin = true;
			flags.guttaPercha = false;
		} else if (tooth.canalObturation === "calcium_hydroxide" || clin.calciumHydroxide || state === "Са") {
			flags.calciumHydroxide = true;
			flags.guttaPercha = false;
		} else {
			flags.guttaPercha = true;
			flags.canalCondition = (clin.canalCondition as CanalCondition) ??
				(state === "Эн" ? "underfill" : state === "Эп" ? "overfill" : "adequate");
		}
	}

	// 2. Pulpitis
	if (state === "Pulpitis" || state === "pulpitis" || state === "P" || Boolean(clin.isPulpitis)) {
		flags.pulp = true;
		flags.canals = true;
		flags.canalCondition = "pulpitis";
	}

	// 3. Periodontitis & Apical Pathology
	if (state.includes("Periodontitis") || state === "periodontitis" || state === "Pt") {
		flags.pulp = true;
		flags.canals = true;
		flags.periapicalHalo = true;
		flags.periapicalCondition = (clin.periapicalCondition as PeriapicalCondition) ?? "granuloma";
		if (!flags.guttaPercha) flags.canalCondition = "necrotic";
	}

	// 4. Intraradicular Post & Core (Fiber / Cast Core / Titanium)
	if (tooth.hasPost || clin.hasPost || tooth.postType || clin.postType) {
		flags.postCore = true;
		flags.postCoreType = (tooth.postType as PostCoreType) ?? (clin.postType as PostCoreType) ?? "fiber";
		flags.canals = true;
	}
}

/** Layer 4: Pathologies, Lesions & Secondary Complications (Caries, Periapical Lesions, Calculus, Fractures) */
function applyPathologiesAndLesions(flags: Tooth46LayerFlags, tooth: ToothData, clin: Record<string, unknown>): void {
	if (flags.missing) return;
	const state = String(tooth.state ?? "Healthy");

	// 1. Caries & Secondary Recurrent Caries
	const isCariesState = state === "Caries" || state === "caries" || state === "C1m" ||
		state === "Cm" || state === "Cp" || state === "Cds" || state === "Cs";
	const hasSecondaryCaries = Boolean(clin.hasSecondaryCaries || clin.secondaryCaries);
	const hasExplicitCaries = Boolean(clin.cariesType);
	const hasCariesSurfaces = Boolean(tooth.surfaces && tooth.surfaces.length > 0 && !flags.composite && !flags.zirconiaCrown);

	if (isCariesState || hasSecondaryCaries || hasExplicitCaries || hasCariesSurfaces) {
		flags.caries = true;
		flags.cariesType = mapSurfacesToCariesType(tooth.toothNumber, tooth.surfaces, (clin.cariesType as string) ?? null);
		flags.cariesDepth = mapClinicalDataToCariesDepth(clin);
		flags.cariesChronicity = clin.chronicity === "chronic" ? "chronic" : "acute";

		if (hasSecondaryCaries) {
			if (flags.composite) flags.compositeCondition = "defective";
			if (flags.zirconiaCrown) flags.crownCondition = "defective";
		}
	}

	// 2. Periapical Lesion (Granuloma / Radicular Cyst)
	if (tooth.periapicalLesion || clin.hasPeriapicalLesion || clin.periapicalLesion || state === "cyst" || state === "Кс") {
		flags.periapicalHalo = true;
		flags.periapicalCondition = (clin.periapicalCondition as Tooth46LayerFlags["periapicalCondition"]) ??
			(state === "cyst" || state === "Кс" ? "cyst" : flags.periapicalCondition && flags.periapicalCondition !== "none" ? flags.periapicalCondition : "granuloma");
	}

	// 3. Apical Root Resorption
	if (tooth.rootResorption || tooth.rootResorptionStage || clin.rootResorption || clin.resorption || state === "resorption" || state === "Рз") {
		flags.periapicalHalo = true;
		flags.periapicalCondition = "resorption";
	}

	// 4. Dental Calculus (Supra- and Subgingival)
	if (state === "Calculus" || state === "calculus" || state === "Км" || Boolean(tooth.calculus) || Boolean(clin.calculus) || Boolean(clin.hasCalculus)) {
		flags.calculus = true;
	}

	// 5. Crown Cracks & Vertical Root Fractures
	if (tooth.hasFracture || clin.hasFracture || clin.crack || state === "crack" || state === "Тр") flags.crack = true;
	if (clin.rootFracture || clin.verticalRootFracture || state === "vertical_root_fracture" || state === "Тк") flags.rootFracture = true;

	// 6. Iatrogenic Complications
	if (clin.rootPerforation || state === "root_perforation" || state === "Пр") flags.rootPerforation = true;
	if (clin.canalLedge || state === "canal_ledge" || state === "Ст") flags.canalLedge = true;
	if (clin.brokenFile || clin.canalCondition === "broken_file" || state === "broken_file" || state === "Ин") {
		flags.canals = true;
		flags.canalCondition = "broken_file";
	}

	// 7. Clinical Badge
	if (tooth.stageBadge) {
		flags.statusBadge = tooth.stageBadge;
		flags.showBadge = true;
	}
}

/** Universal multi-layer converter from live CRM ToothData to Wheeler Gate 0 flags. */
export function toothDataToGate0Flags(tooth: ToothData): Tooth46LayerFlags {
	const flags: Tooth46LayerFlags = { ...DEFAULT_TOOTH46_LAYERS };
	const clin = (tooth.clinicalData ?? {}) as Record<string, unknown>;

	const present = applyBaseAnatomy(flags, tooth, clin);
	if (present) {
		applyCoronalRestoration(flags, tooth, clin);
		applyEndodonticStatus(flags, tooth, clin);
		applyPathologiesAndLesions(flags, tooth, clin);
	}

	applyAuxiliaryOverlays(flags, tooth, clin);
	return flags;
}
