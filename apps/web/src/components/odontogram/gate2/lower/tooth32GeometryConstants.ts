/**
 * DENTE Dental CRM — Monolithic Anatomical Sculpture for Tooth 32 / 42
 * Mandibular Lateral Incisor (Wheeler's Dental Anatomy Ch. 9) 2.5D projection.
 * Slightly wider crown, distoincisal cervical slope, distal twist, compressed root with sulcus.
 * SVG ViewBox "0 0 100 160" (Mandate 8b <= 120 lines).
 */

export const TOOTH32_GEOMETRY = {
	viewBox: "0 0 100 160",
	aspectRatio: "100 / 160",
	apex: { x: 51.5, y: 152 },
	incisalCenter: { x: 50, y: 17 },

	// Crown perimeter: wider than central, distoincisal slope, rounded distal angle
	crownMonolithPath:
		"M 29,16 C 33,14.5 38,14.5 43,15.8 C 45,16.2 50,15.0 55,15.8 " +
		"C 58,16.4 63,16.8 68,17.8 C 70,18.2 71,18.5 71,18.5 " +
		"C 72.5,20.5 72.5,25 72,32 C 71.5,42 68,54 62,68 " +
		"C 57,72.5 43,72.5 38,68 C 33,52 29.5,34 29,16 Z",

	// Worn incisal edge path (sloping chisel without mamelons)
	crownWornFlatPath:
		"M 29,17 L 71,19.5 C 72.5,20.5 72.5,25 72,32 " +
		"C 71.5,42 68,54 62,68 C 57,72.5 43,72.5 38,68 " +
		"C 33,52 29.5,34 29,17 Z",

	// 3 Unworn mamelon scallops along sloping incisal edge
	mamelonPath:
		"M 29,16 C 33,14.5 38,14.5 43,15.8 C 45,16.2 50,15.0 55,15.8 " +
		"C 58,16.4 63,16.8 68,17.8 C 70,18.2 71,18.5 71,18.5",
	mamelonNotchMesial: { x: 44, y: 16.2 },
	mamelonNotchDistal: { x: 57, y: 17.0 },

	// Labial vertical developmental grooves
	labialGrooveMesial: "M 42,17 C 41.5,28 41,40 40,50",
	labialGrooveDistal: "M 57,18 C 58,28 59,40 60.5,50",

	// Cervical line (CEJ) convex toward root
	cejCurve: "M 38,68 C 43,72.5 57,72.5 62,68",
	labialCervicalRidge: "M 38,68 C 44,63 56,63 62,68",

	// Lingual fossa & cingulum
	lingualCingulum: "M 40,60 C 45,55 57,55 60,60 C 58,66 43,66 40,60 Z",
	lingualFossa:
		"M 34,24 C 43,22 58,23 66,26 C 64,46 59,52 50,53 C 41,52 36,46 34,24 Z",

	// Slightly longer root with subtle distal apical curve
	rootMonolithPath:
		"M 38,68 C 39,90 42,122 48,151 C 49.5,152.5 53,152.5 54,151 " +
		"C 58,122 61,90 62,68 C 57,72.5 43,72.5 38,68 Z",

	// Bilateral sulcus longitudinalis (developmental groove)
	sulcusLongitudinalisCenter: "M 50,74 C 49.5,95 50,122 51.5,147",
	sulcusShadowTrough:
		"M 48.5,74 C 48,95 49,122 50.5,146 C 51.5,146 52.5,122 53,95 C 53.5,85 52,74 51.5,74 Z",
	mesialRootRidge: "M 41,72 C 42,94 44,118 48,147",
	distalRootRidge: "M 59,72 C 58,94 56,118 53,147",

	// Pulp chamber & Vertucci Type II/III canals
	pulpChamberPath:
		"M 45,42 C 47,38 53,38 55,43 C 56,52 56,62 54,66 " +
		"C 51,67 49,67 46,66 C 44,62 44,52 45,42 Z",
	pulpHornMesial: { x: 47, y: 39 },
	pulpHornDistal: { x: 54, y: 40 },

	// Vertucci Type II / III canal paths (buccal & lingual uniting at apical third)
	canalBuccalPath: "M 48,66 C 47,88 47.5,116 50,140",
	canalLingualPath: "M 52,66 C 53,88 53.5,116 52,140",
	canalCommonApexPath: "M 51,140 L 51.5,149.5",
	// Vertucci Type I ribbon canal path
	canalRibbonPath: "M 50,66 C 50,90 50.5,125 51.5,149.5",
	apicalForamen: { x: 51.5, y: 149.5 },
} as const;
