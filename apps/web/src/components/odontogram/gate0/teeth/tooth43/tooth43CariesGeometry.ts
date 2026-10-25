/**
 * DENTE Dental CRM — Organic Caries & Cavitation Geometry for Tooth 43
 * Mandibular Canine: Class III, Class IV (Cusp Tip Fracture), Class V.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH43_CARIES_GEOMETRY = {
	// Class III Proximal Contact (Mesial X=22..29, Y=40..54)
	class3: {
		halo: "M 22.5,40.0 C 27.5,40.0 29.5,44.5 28.8,49.0 C 28.0,53.0 25.5,55.0 22.2,55.0 Z",
		crater: "M 22.6,42.0 C 26.2,42.0 27.8,45.5 27.2,48.8 C 26.6,51.8 24.8,53.2 22.4,53.2 Z",
		profunda: "M 22.8,44.5 C 25.0,44.5 26.0,46.5 25.6,48.5 C 25.2,50.2 24.0,51.2 22.6,51.0 Z",
	},

	// Class IV Cusp Fracture & Cavitation (Crushed Tearing Cusp Apex X=42..58, Y=8..24)
	class4: {
		halo: "M 42.0,14.0 L 50.0,8.0 L 58.0,14.0 C 56.5,19.0 53.5,23.0 50.0,23.5 C 46.5,23.0 43.5,19.0 42.0,14.0 Z",
		fractureSteps: [
			"M 43.5,13.5 L 47.0,16.5 L 46.0,19.0 L 52.0,20.0 L 56.5,13.5",
			"M 47.5,14.0 L 50.5,17.5",
		],
		crater: "M 44.0,14.5 L 50.0,11.0 L 56.0,14.5 C 54.5,19.0 52.5,21.5 50.0,21.5 C 47.5,21.5 45.5,19.0 44.0,14.5 Z",
		profunda: "M 46.0,15.5 L 50.0,13.0 L 54.0,15.5 C 53.0,18.5 51.5,19.8 50.0,19.8 C 48.5,19.8 47.0,18.5 46.0,15.5 Z",
	},

	// Class V Cervical Buccal Margin at CEJ (X=36..64, Y=67.5..75.5)
	class5: {
		halo: "M 36.0,75.0 C 42.5,76.5 57.5,76.5 64.0,75.0 C 62.0,69.0 57.5,67.5 50.0,67.5 C 42.5,67.5 38.0,69.0 36.0,75.0 Z",
		crater: "M 39.0,74.5 C 44.0,75.8 56.0,75.8 61.0,74.5 C 59.5,70.5 56.0,69.0 50.0,69.0 C 44.0,69.0 40.5,70.5 39.0,74.5 Z",
		profunda: "M 43.5,73.5 C 46.5,74.5 53.5,74.5 56.5,73.5 C 55.2,71.0 53.0,70.2 50.0,70.2 C 47.0,70.2 44.8,71.0 43.5,73.5 Z",
	},
} as const;
