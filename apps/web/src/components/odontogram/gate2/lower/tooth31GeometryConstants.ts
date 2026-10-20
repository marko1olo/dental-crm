/**
 * DENTE Dental CRM — Monolithic Anatomical Sculpture for Tooth 31 / 41
 * Mandibular Central Incisor (Wheeler's Dental Anatomy Ch. 9) 2.5D projection.
 * Symmetrical chisel crown, 3 mamelons, mesiodistally compressed root, sulcus longitudinalis.
 * SVG ViewBox "0 0 100 160" (Mandate 8b <= 120 lines).
 */

export const TOOTH31_GEOMETRY = {
	viewBox: "0 0 100 160",
	aspectRatio: "100 / 160",
	apex: { x: 50, y: 150 },
	incisalCenter: { x: 50, y: 16 },

	// Symmetrical chisel crown perimeter with 3 mamelons
	crownMonolithPath:
		"M 32,16 C 34,14.2 38,14.2 43,15.8 C 44,16.4 45,15.0 47,14.2 " +
		"C 50,13.8 53,13.8 56,15.0 C 57,16.4 58,15.8 60,14.8 " +
		"C 64,14.2 66,14.5 68,16 C 67.5,32 65.5,50 61,68 " +
		"C 57,72 43,72 39,68 C 34.5,50 32.5,32 32,16 Z",

	// Worn incisal edge path (straight chisel without mamelons)
	crownWornFlatPath:
		"M 32,16.5 L 68,16.5 C 67.5,32 65.5,50 61,68 " +
		"C 57,72 43,72 39,68 C 34.5,50 32.5,32 32,16.5 Z",

	// 3 Unworn mamelon scallops along incisal edge
	mamelonPath:
		"M 32,16 C 34,14.2 38,14.2 43,15.8 C 44,16.4 45,15.0 47,14.2 " +
		"C 50,13.8 53,13.8 56,15.0 C 57,16.4 58,15.8 60,14.8 C 64,14.2 66,14.5 68,16",
	mamelonNotchMesial: { x: 44, y: 16.4 },
	mamelonNotchDistal: { x: 57, y: 16.4 },

	// Labial vertical developmental grooves
	labialGrooveMesial: "M 43.5,17 C 43,28 42,40 41,50",
	labialGrooveDistal: "M 56.5,17 C 57,28 58,40 59,50",

	// Cervical line (CEJ) convex toward root
	cejCurve: "M 39,68 C 43,72 57,72 61,68",
	labialCervicalRidge: "M 39,68 C 44,63 56,63 61,68",

	// Lingual smooth fossa and subtle cingulum
	lingualCingulum: "M 41,60 C 45,56 55,56 59,60 C 56,66 44,66 41,60 Z",
	lingualFossa:
		"M 36,24 C 44,22 56,22 64,24 C 62,46 58,52 50,53 C 42,52 38,46 36,24 Z",

	// Slender mesiodistally compressed root
	rootMonolithPath:
		"M 39,68 C 40,90 43,120 47.5,149 C 48.5,150.5 51.5,150.5 52.5,149 " +
		"C 57,120 60,90 61,68 C 57,72 43,72 39,68 Z",

	// Bilateral sulcus longitudinalis (deep longitudinal developmental grooves)
	sulcusLongitudinalisCenter: "M 50,74 C 49.5,95 49.5,122 50,145",
	sulcusShadowTrough:
		"M 48.5,74 C 48,95 48.5,122 49.5,144 C 50.5,144 51,122 51.5,95 C 52,85 52,74 51.5,74 Z",
	mesialRootRidge: "M 42,72 C 43,94 45,118 48,145",
	distalRootRidge: "M 58,72 C 57,94 55,118 52,145",

	// Pulp chamber & Vertucci Type II/III canals
	pulpChamberPath:
		"M 46,42 C 48,38 52,38 54,42 C 55,52 55,62 53,66 " +
		"C 50,67 50,67 47,66 C 45,62 45,52 46,42 Z",
	pulpHornMesial: { x: 47, y: 39 },
	pulpHornDistal: { x: 53, y: 39 },

	// Vertucci Type II / III canal paths (buccal & lingual uniting at apical third)
	canalBuccalPath: "M 48.5,66 C 47.5,88 47.5,115 49,138",
	canalLingualPath: "M 51.5,66 C 52.5,88 52.5,115 51,138",
	canalCommonApexPath: "M 50,138 L 50,147.5",
	// Vertucci Type I ribbon canal path
	canalRibbonPath: "M 50,66 C 49.8,90 49.8,125 50,147.5",
	apicalForamen: { x: 50, y: 147.5 },
} as const;
