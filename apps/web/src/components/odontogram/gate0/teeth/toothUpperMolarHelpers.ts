import type { CariesDepth, CariesType, CrownMaterial, InlayOnlayType } from "../tooth46Types";

export function toUpperMolarInlayOnlay(
	val: InlayOnlayType | undefined,
): "inlay" | "onlay" | undefined {
	if (val === "inlay" || val === "onlay") return val;
	return undefined;
}

export function toUpperMolarCrownMaterial(
	val: CrownMaterial | undefined,
): "zirconia" | "metal_ceramic" | "gold" | undefined {
	if (val === "gold") return "gold";
	if (val === "pfm" || val === "metal") return "metal_ceramic";
	if (val === "zirconia" || val === "emax" || val === "pmma") return "zirconia";
	return undefined;
}

export function toUpperMolarCariesType(
	val: CariesType | undefined,
): "class1" | "class2_mo" | "class2_do" | "class2_mod" | "class5" | "destructive" | undefined {
	if (!val) return undefined;
	if (
		val === "class1" ||
		val === "class2_mo" ||
		val === "class2_do" ||
		val === "class2_mod" ||
		val === "class5"
	) {
		return val;
	}
	if (val === "class2_m") return "class2_mo";
	if (val === "class2_d") return "class2_do";
	return "class1";
}

export function toUpperMolarCariesDepth(
	val: CariesDepth | undefined,
): "superficial" | "media" | "profunda" | undefined {
	if (!val) return undefined;
	if (val === "superficial" || val === "media" || val === "profunda") return val;
	if (val === "destructive") return "profunda";
	return undefined;
}
