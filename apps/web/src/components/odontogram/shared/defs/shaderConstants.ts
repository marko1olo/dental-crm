import type { CrownMaterial } from "../types/crownTypes";

/**
 * Canonical Shader Identifiers for DENTE Odontogram 2.5D Vector Shaders.
 * Follows namespace 'dente-shader-*' to avoid DOM collisions with legacy 2D gradients.
 */
export const DENTE_SHADER_IDS = {
	// Monolith Enamel & Dentin
	enamelPorcelain: "dente-shader-enamel-porcelain",
	rootDentin: "dente-shader-root-dentin",
	rootSulcusShadow: "dente-shader-root-sulcus-shadow",
	furcationShadow: "dente-shader-furcation-shadow",
	fossaShadow: "dente-shader-fossa-shadow",
	cervicalRidge: "dente-shader-cervical-ridge",
	ridgeHighlight: "dente-shader-ridge-highlight",

	// 6 Orthopedic Crown Materials
	zirconiaCeramic: "dente-shader-zirconia-ceramic",
	zirconiaGlaze: "dente-shader-zirconia-glaze",
	zirconiaChamfer: "dente-shader-zirconia-chamfer",
	crownPfm: "dente-shader-crown-pfm",
	pfmMetalCollar: "dente-shader-pfm-metal-collar",
	crownEmax: "dente-shader-crown-emax",
	emaxOpalescent: "dente-shader-emax-opalescent",
	crownGold: "dente-shader-crown-gold",
	goldSpecular: "dente-shader-gold-specular",
	crownMetal: "dente-shader-crown-metal",
	metalSheen: "dente-shader-metal-sheen",
	crownPmma: "dente-shader-crown-pmma",

	// Endodontic Shaders
	pulpVital: "dente-shader-pulp-vital",
	pulpNecrotic: "dente-shader-pulp-necrotic",
	guttaperchaCone: "dente-shader-guttapercha-cone",
	guttaperchaSheath: "dente-shader-guttapercha-sheath",

	// Pathology & Surgical Shaders
	cariesDemin: "dente-shader-caries-demin",
	cariesLesion: "dente-shader-caries-lesion",
	cariesNecrotic: "dente-shader-caries-necrotic",
	periapicalHalo: "dente-shader-periapical-halo",
	periapicalFlame: "dente-shader-periapical-flame",
	abfractionDentin: "dente-shader-abfraction-dentin",
	fiberPost: "dente-shader-fiber-post",
	compositeCore: "dente-shader-composite-core",
	calculusSupra: "dente-shader-calculus-supra",
	calculusSub: "dente-shader-calculus-sub",
	titaniumBody: "dente-shader-titanium-body",
	titaniumCollar: "dente-shader-titanium-collar",
	titaniumAbutment: "dente-shader-titanium-abutment",

	// Restorations
	compositeBody: "dente-shader-composite-body",
	compositeEdge: "dente-shader-composite-edge",
	secondaryCaries: "dente-shader-secondary-caries",
} as const;

export const CROWN_FILL_MAP: Record<CrownMaterial, string> = {
	zirconia: `url(#${DENTE_SHADER_IDS.zirconiaCeramic})`,
	pfm: `url(#${DENTE_SHADER_IDS.crownPfm})`,
	emax: `url(#${DENTE_SHADER_IDS.crownEmax})`,
	gold: `url(#${DENTE_SHADER_IDS.crownGold})`,
	metal: `url(#${DENTE_SHADER_IDS.crownMetal})`,
	pmma: `url(#${DENTE_SHADER_IDS.crownPmma})`,
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
