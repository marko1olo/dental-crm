/**
 * DENTE Dental CRM — Anatomical Restoration Geometry for Tooth 46
 * Light-cured composite filling (Class I) & monolithic multilayer zirconia crown.
 * Wheeler Dental Anatomy clinical morphology (Mandate 8b <= 120 lines).
 */

export const TOOTH46_RESTORATION_GEOMETRY = {
	// Class I Anatomical Composite Filling in occlusal table & triangular fossae
	compositeFilling:
		"M 27,20 C 31,18 36,18.5 41,19.5 C 45,16.5 49,16 53,16.5 C 56,19 60,19.5 64,20 " +
		"C 69,20 74,21 75,22 C 74,24 69,25 64,25 C 60,25.5 62,28.5 62,30 C 59,29 57,26 55,25.5 " +
		"C 50,25.5 45,26 42,26.5 C 40,29 38,32 36,32 C 35,30 35.5,27 37,25 C 33,25 29,23.5 26.5,22 C 26,20.8 26.5,20.2 27,20 Z",

	// Composite restoration fissure anatomy (sculpted secondary anatomy)
	compositeSculptedFissures: [
		{ id: "cnt", d: "M 29,21 C 36,22 44,22.5 52,22 C 60,21.5 68,22 72,22.5" },
		{ id: "mb", d: "M 41,22.5 C 39,26 37.5,29 36.5,31.5" },
		{ id: "db", d: "M 57,22 C 58.5,24.5 59.8,27.5 60.5,29.5" },
		{ id: "lng", d: "M 52,22 C 51,19 49,17.5 48.5,17" },
	] as const,

	// Monolithic Multilayer Zirconia Crown Outer Shell
	zirconiaCrownShell:
		"M 16,73 C 13,61 11,47 12,37 C 13,27 17,19 22,15 C 25,13 28,10 32,9 " +
		"C 38,10 44,13 47,13 C 52,12 57,10 62,10 C 68,11 73,14 76,16 C 79,18 82,21 83,23 " +
		"C 85,28 86,32 86,35 C 87,41 88,47 88,53 C 87,61 86,67 84,73 C 68,78 32,78 16,73 Z",

	// Zirconia chamfer margin (cervical preparation shoulder above CEJ)
	zirconiaCervicalShoulder:
		"M 16,73 C 34,77 50,78 84,73 C 78,75.5 52,77 50,77 C 48,77 22,75.5 16,73 Z",

	// PFM cervical metal collar margin (subgingival metal line at CEJ)
	pfmMetalCollar: "M 16,73 C 34,77 50,78 84,73 C 81,74.5 50,76 16,73 Z",

	// CAD/CAM milled monolithic occlusal fissures (Dryopithecus Y-5 pattern)
	zirconiaMilledFissures: [
		{
			id: "cnt",
			d: "M 27,21.5 C 36,22.8 45,23.2 52,22.2 C 60,21.8 68,22.4 75,23.2",
		},
		{ id: "mb", d: "M 41,22.8 C 39,27 37,32 36,37" },
		{ id: "db", d: "M 59,22.2 C 61,26.5 62,31 63,36" },
		{ id: "lng", d: "M 52,22.2 C 51,17.5 50,14 49,11.5" },
	] as const,

	// Vestibular equator highlight contour across cervical-middle third
	crownEquatorHighlight: "M 17,50 C 32,55 52,56 83,50",

	// CAD/CAM milled polygonal cusp slopes (mesial light / distal shadow facets)
	zirconiaCuspSlopes: [
		// MB cusp: mesial illuminated facet & distal shaded slope
		{
			id: "mb-m",
			type: "highlight",
			d: "M 24,17 C 20,18.5 16,21 15,24 C 20,25 24,24 27,21.5 C 26,19 25,18 24,17 Z",
		},
		{
			id: "mb-d",
			type: "shadow",
			d: "M 24,17 C 29,19 34,21 38,22.5 C 37,28 35,32 32,28 C 28,24 25,20 24,17 Z",
		},
		// ML cusp: tall pyramidal lingual cusp
		{
			id: "ml-m",
			type: "highlight",
			d: "M 32,9 C 27,11 23,13 22,15 C 25,17 28,19 32,20 C 33,16 33,12 32,9 Z",
		},
		{
			id: "ml-d",
			type: "shadow",
			d: "M 32,9 C 36,13 40,18 42,22 C 45,19 47,15 48,12 C 42,10 37,9 32,9 Z",
		},
		// DB cusp: central buccal cusp
		{
			id: "db-m",
			type: "highlight",
			d: "M 50,18 C 46,19.5 43,21 41,22.8 C 40,27 44,25 50,18 Z",
		},
		{
			id: "db-d",
			type: "shadow",
			d: "M 50,18 C 53,19.5 56,21 59,22.2 C 58,27 54,25 50,18 Z",
		},
		// DL cusp: prominent lingual cusp
		{
			id: "dl-m",
			type: "highlight",
			d: "M 62,10 C 57,10.5 52,11 48,12 C 50,16 51,19 52,22.2 C 56,18 59,14 62,10 Z",
		},
		{
			id: "dl-d",
			type: "shadow",
			d: "M 62,10 C 66,11 70,13 73,14 C 71,17 69,20 68,22.5 C 66,18 64,14 62,10 Z",
		},
		// D cusp: small distal cusp
		{
			id: "d-m",
			type: "highlight",
			d: "M 75,21.5 C 71,21.8 67,22 62,22.2 C 64,25 68,25 75,21.5 Z",
		},
		{
			id: "d-d",
			type: "shadow",
			d: "M 75,21.5 C 78,22 81,22.5 83,23 C 81,26 78,26 75,21.5 Z",
		},
	] as const,

	// High-luster specular light paths strictly following 3D cusp crest trajectories
	zirconiaSpecularRidges: [
		{ id: "mb", d: "M 24,17 C 28,19 33,20.8 38,22.5" },
		{ id: "ml", d: "M 32,9.5 C 35.5,13.5 39,18 42,21.8" },
		{ id: "db", d: "M 50,18 C 50.8,19.5 51.5,21 52,22.2" },
		{ id: "dl", d: "M 62,10.5 C 59,14 56,18 53,21.8" },
		{ id: "d", d: "M 75,21.5 C 73,22 71,22.4 68,22.6" },
	] as const,
} as const;
