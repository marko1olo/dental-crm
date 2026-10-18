/**
 * DENTE Dental CRM — Organic Biological Caries Geometry for Tooth 46
 * Authentic Class I dendritic fissure caries & isolated foramen caecum lesion.
 * Replaces kindergarten geometric tongues with true micro-cavitation (Mandate 8b <= 120 lines).
 */

export const TOOTH46_CARIES_GEOMETRY = {
	// Chalky-white demineralized enamel halo strictly bounded to Y-5 occlusal fissure
	demineralizedHalo:
		"M 26,19 " +
		"C 29,17.5 35,18 40,19 " +
		"C 44,16 48,15 52,15.5 " +
		"C 54,18 57,19 62,19.5 " +
		"C 67,19 72,20 76,21.5 " +
		"C 76,24 71,25 66,24.5 " +
		"C 62,25 64,28 64,30 " +
		"C 61,30 59,26 57,25 " +
		"C 52,25 47,25.5 44,26 " +
		"C 42,28 40,31 38,32 " +
		"C 36,31 36.5,27 38,25 " +
		"C 34,25 29,23.5 25.5,21.5 " +
		"C 25,20 25.5,19.5 26,19 Z",

	// Organic dendritic softened dentin infiltrating along Dryopithecus Y-5 grooves
	dendriticCariesPath:
		"M 27.5,19.8 " +
		"C 30,18.8 35,19.5 39,20.5 " +
		"C 42,18 46,17.5 49,18 " +
		"C 50,19.5 53,20.5 58,21 " +
		"C 63,20.8 69,21.5 73,22.5 " +
		"C 72,23.8 68,23.8 64,23.5 " +
		"C 60,24 61.5,27 61,28.5 " +
		"C 59.5,27.5 58.5,24.5 56,23.8 " +
		"C 51,23.8 46,24.2 43,24.8 " +
		"C 41.5,27 39.5,29.5 38.2,30 " +
		"C 37,29 37.8,25.5 39,23.8 " +
		"C 35,23.5 30.5,22.2 27.5,20.8 Z",

	// Deep necrotic cavitated core inside central, mesial and distal triangular pits
	necroticCore:
		"M 41,21.2 " +
		"C 43,20.2 47,20 50,20.5 " +
		"C 53,21 52,22.8 49,23.2 " +
		"C 46,23.5 43,23.8 41.5,22.8 " +
		"C 40.5,22 40.5,21.5 41,21.2 Z " +
		"M 28,20 " +
		"C 29.5,19.5 31,19.8 32,20.5 " +
		"C 31,21.2 29.5,21 28.5,20.8 Z " +
		"M 67,22 " +
		"C 69,21.5 71,21.8 72,22.8 " +
		"C 70.5,23.5 69,23.2 67.5,22.8 Z",

	// Micro-pits (enamel etched micro-cavitations along fissure walls)
	microPits: [
		{ cx: 34, cy: 20.2, r: 0.65 },
		{ cx: 45, cy: 22.0, r: 0.8 },
		{ cx: 47, cy: 19.5, r: 0.6 },
		{ cx: 54, cy: 22.2, r: 0.7 },
		{ cx: 63, cy: 22.8, r: 0.65 },
	] as const,

	// Hairline developmental groove pigmentation connecting seamlessly to buccal pit
	buccalGrooveTrace: "M 39,24 C 38,28 37,34 36.6,42",

	// Organic Buccal Pit (Foramen Caecum) Cavitation flowing from groove
	buccalPitCavity: {
		halo:
			"M 36.6,40.5 " +
			"C 38.2,41.5 39.8,43.2 40.2,45.2 " +
			"C 40.5,46.8 39.4,48.2 37.8,48.8 " +
			"C 36.5,49.2 34.8,48.8 33.8,47.6 " +
			"C 32.8,46.2 33.2,44.2 34.2,42.8 " +
			"C 35.0,41.8 36.0,41.0 36.6,40.5 Z",
		crater:
			"M 36.6,42.2 " +
			"C 37.6,42.8 38.8,44.0 39.0,45.5 " +
			"C 39.2,46.8 38.2,47.8 37.0,48.1 " +
			"C 35.6,48.4 34.4,47.6 34.2,46.3 " +
			"C 34.0,44.8 34.8,43.4 35.8,42.6 " +
			"C 36.2,42.2 36.4,42.2 36.6,42.2 Z",
		necroticCenter:
			"M 36.4,44.0 " +
			"C 37.3,44.2 38.0,45.0 37.9,46.0 " +
			"C 37.8,46.8 37.0,47.3 36.2,47.3 " +
			"C 35.4,47.3 34.9,46.6 35.0,45.8 " +
			"C 35.1,44.9 35.7,44.1 36.4,44.0 Z",
	},
} as const;
