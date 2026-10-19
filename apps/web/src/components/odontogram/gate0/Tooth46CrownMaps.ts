import type { CrownMaterial } from "./tooth46Types";

export const CROWN_FILL_MAP: Record<CrownMaterial, string> = {
	zirconia: "url(#dente-zirconia-ceramic)",
	pfm: "url(#dente-crown-pfm)",
	emax: "url(#dente-crown-emax)",
	gold: "url(#dente-crown-gold)",
	metal: "url(#dente-crown-metal)",
	pmma: "url(#dente-crown-pmma)",
};

export const getCrownStroke = (mat: CrownMaterial, isDark: boolean): string => {
	const darkMap: Record<CrownMaterial, string> = {
		zirconia: "rgba(148, 163, 184, 0.65)",
		pfm: "rgba(148, 163, 184, 0.75)",
		emax: "rgba(186, 230, 253, 0.70)",
		gold: "rgba(251, 191, 36, 0.90)",
		metal: "rgba(203, 213, 225, 0.85)",
		pmma: "rgba(253, 230, 138, 0.60)",
	};
	const lightMap: Record<CrownMaterial, string> = {
		zirconia: "rgba(100, 116, 139, 0.45)",
		pfm: "rgba(71, 85, 105, 0.60)",
		emax: "rgba(125, 211, 252, 0.50)",
		gold: "rgba(180, 83, 9, 0.75)",
		metal: "rgba(51, 65, 85, 0.70)",
		pmma: "rgba(180, 83, 9, 0.35)",
	};
	return isDark ? darkMap[mat] : lightMap[mat];
};

export const getCrownFissureStroke = (
	mat: CrownMaterial,
	isDark: boolean,
): string => {
	const darkMap: Record<CrownMaterial, string> = {
		zirconia: "rgba(148, 163, 184, 0.55)",
		pfm: "rgba(120, 53, 15, 0.65)",
		emax: "rgba(125, 211, 252, 0.50)",
		gold: "rgba(120, 53, 15, 0.85)",
		metal: "rgba(30, 41, 59, 0.85)",
		pmma: "rgba(180, 83, 9, 0.50)",
	};
	const lightMap: Record<CrownMaterial, string> = {
		zirconia: "rgba(100, 116, 139, 0.45)",
		pfm: "rgba(146, 64, 14, 0.55)",
		emax: "rgba(56, 189, 248, 0.40)",
		gold: "rgba(146, 64, 14, 0.80)",
		metal: "rgba(15, 23, 42, 0.75)",
		pmma: "rgba(146, 64, 14, 0.45)",
	};
	return isDark ? darkMap[mat] : lightMap[mat];
};

export const getGlazeStroke = (mat: CrownMaterial): string => {
	if (mat === "gold") return "rgba(254, 240, 138, 0.85)";
	if (mat === "metal") return "rgba(241, 245, 249, 0.75)";
	if (mat === "emax") return "rgba(255, 255, 255, 0.95)";
	return "rgba(255, 255, 255, 0.85)";
};

export const getCuspSlopeColors = (mat: CrownMaterial) => ({
	highlight:
		mat === "emax"
			? "url(#dente-emax-opalescent)"
			: "rgba(255, 255, 255, 0.22)",
	shadow: mat === "gold" ? "rgba(146, 64, 14, 0.20)" : "rgba(15, 23, 42, 0.12)",
});
