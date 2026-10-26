/**
 * canonicalCatalogTypes.ts — Типы канонического каталога имплантатов (Мандаты 8s, 8e, 8b).
 */

export type ImplantConnectionHexType =
	| "morse_taper_11"       // 11° Morse Taper (Osstem TS, Dentium SuperLine)
	| "morse_taper_12"       // 12° Morse Taper (NobelActive, MIS C1)
	| "crossfit_internal"    // Straumann CrossFit NC / RC / BLX TorcFit
	| "tissue_level_synocta" // Straumann Tissue Level SynOcta 8°
	| "internal_hex"         // Standard internal hex (MIS SEVEN, Zimmer TSV, BioHorizons, Alpha-Bio)
	| "external_hex"         // External hex (Brånemark System, Osstem US)
	| "tri_lobe"             // Tri-oval internal trilobe (NobelReplace)
	| "tissue_care_cone"     // Ankylos C/X 5.7° Morse Taper
	| "conical_seal"         // Astra Tech Conical Seal Design
	| "anyridge_hex_cone";   // Megagen AnyRidge 5° Cone with internal hex

export type CanonicalImplantBrandKey =
	| "osstem"
	| "straumann"
	| "nobel_biocare"
	| "dentium"
	| "mis"
	| "astra_tech"
	| "zimmer"
	| "megagen"
	| "biohorizons"
	| "alphabio"
	| "ankylos";

export const CANONICAL_IMPLANT_BRANDS: readonly CanonicalImplantBrandKey[] = [
	"osstem",
	"straumann",
	"nobel_biocare",
	"dentium",
	"mis",
	"astra_tech",
	"zimmer",
	"megagen",
	"biohorizons",
	"alphabio",
	"ankylos",
] as const;

export interface GuidedSurgeryKitSpec {
	readonly kitName: string;
	readonly sleeveDiameterMm: number;
	readonly sleeveHeightMm: number;
	readonly defaultOffsetMm: number;
	readonly availableOffsetsMm: readonly number[];
	readonly drillStopSystemRu: string;
}

export interface CanonicalImplantFixture {
	readonly id: string;
	readonly brandKey: CanonicalImplantBrandKey;
	readonly brandName: string;
	readonly brandCountry: string;
	readonly lineName: string;
	readonly modelName: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly platformDiameterMm: number;
	readonly apexDiameterMm: number;
	readonly coneAngleDeg: number;
	readonly hexType: ImplantConnectionHexType;
	readonly platformCode: string;
	readonly platformColorHex: string;
	readonly isTapered: boolean;
	readonly guidedKit: GuidedSurgeryKitSpec;
	readonly priceKopecks: number;
	readonly articleNumber: string;
	readonly clinicalIndicationRu: string;
}

export interface SleeveDrillCalculation {
	readonly implantLengthMm: number;
	readonly sleeveOffsetMm: number;
	readonly drillTotalLengthMm: number;
	readonly kitName: string;
	readonly sleeveDiameterMm: number;
	readonly sleeveHeightMm: number;
	readonly drillStopSummaryRu: string;
}
