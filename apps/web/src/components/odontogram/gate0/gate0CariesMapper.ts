import type { ToothData } from "../chart/types/toothRendererTypes";
import type { Tooth46LayerFlags } from "./tooth46Types";
import type {
	CariesDepth,
	CariesType,
	CrownMaterial,
	PostCoreType,
} from "./tooth46PresetTypes";

/**
 * Gate 0 — Caries Surface & Clinical Depth Domain Helpers
 * Mandate 8b <= 120 lines.
 */
export function isAnteriorTooth(toothNumber: number): boolean {
	const digit = toothNumber % 10;
	return digit >= 1 && digit <= 3;
}

export function mapRestorativeToCrownMaterial(mat?: string): CrownMaterial {
	if (mat === "pfm" || mat === "metal_ceramic") return "pfm";
	if (mat === "emax" || mat === "ceramic") return "emax";
	if (mat === "gold") return "gold";
	if (mat === "metal") return "metal";
	if (mat === "pmma" || mat === "composite" || mat === "temporary") return "pmma";
	return "zirconia";
}

export function mapSurfacesToCariesType(
	toothNumber: number,
	surfaces?: readonly string[] | null,
	explicitType?: string | null,
): CariesType {
	const knownTypes: CariesType[] = [
		"class1", "class2_m", "class2_d", "class2_mo", "class2_do",
		"class2_mod", "class3", "class4", "class5", "white_spot",
	];
	if (explicitType && knownTypes.includes(explicitType as CariesType)) {
		return explicitType as CariesType;
	}

	const norm = (surfaces ?? [])
		.flatMap((s) => s.toUpperCase().split(""))
		.filter((c) => ["O", "V", "L", "M", "D", "C"].includes(c));
	const set = new Set(norm);
	const anterior = isAnteriorTooth(toothNumber);

	if (set.has("V") || set.has("C")) {
		if (!set.has("O") && !set.has("M") && !set.has("D")) return "class5";
	}
	if (set.has("M") && set.has("D") && set.has("O")) return "class2_mod";
	if (set.has("M") && set.has("O")) return anterior ? "class4" : "class2_mo";
	if (set.has("D") && set.has("O")) return anterior ? "class4" : "class2_do";
	if (set.has("M") || set.has("D")) {
		return anterior ? "class3" : (set.has("M") ? "class2_m" : "class2_d");
	}
	if (set.has("O")) return anterior ? "class4" : "class1";
	if (set.has("V") || set.has("C")) return "class5";

	return anterior ? "class3" : "class1";
}

export function mapClinicalDataToCariesDepth(
	clinicalData?: Record<string, unknown> | null,
): CariesDepth {
	if (!clinicalData) return "media";
	if (clinicalData.isDestruct || clinicalData.isDestructive || clinicalData.destructive) {
		return "destructive";
	}
	const raw = String(clinicalData.cariesDepth ?? clinicalData.depth ?? "").toLowerCase();
	if (raw === "superficial" || raw === "cs" || raw === "s") return "superficial";
	if (raw === "profunda" || raw === "cp" || raw === "p") return "profunda";
	if (raw === "destructive" || raw === "cds" || raw === "ds") return "destructive";
	return "media";
}

export function mapCariesTypeToSurfaces(cariesType?: CariesType): string[] {
	switch (cariesType) {
		case "class1": return ["O"];
		case "class2_m": return ["M"];
		case "class2_d": return ["D"];
		case "class2_mo": return ["M", "O"];
		case "class2_do": return ["D", "O"];
		case "class2_mod": return ["M", "O", "D"];
		case "class3": return ["M"];
		case "class4": return ["M", "O"];
		case "class5": return ["V"];
		case "white_spot": return ["V"];
		default: return ["O"];
	}
}

export function applyAuxiliaryOverlays(
	flags: Tooth46LayerFlags,
	tooth: ToothData,
	clin: Record<string, unknown>,
): void {
	if (tooth.periapicalLesion) {
		flags.periapicalHalo = true;
		flags.periapicalCondition = (clin.periapicalCondition as Tooth46LayerFlags["periapicalCondition"]) ?? "granuloma";
	}
	if (tooth.hasPost) flags.postCore = true, flags.postCoreType = (tooth.postType as PostCoreType) ?? "fiber";
	if (tooth.canalObturation) flags.canals = true, flags.guttaPercha = true;
	if (tooth.hasFracture) flags.crack = true;
	if (tooth.rootResorption || tooth.rootResorptionStage) {
		flags.periapicalHalo = true;
		flags.periapicalCondition = "resorption";
	}
	if (tooth.stageBadge) flags.statusBadge = tooth.stageBadge, flags.showBadge = true;
}
