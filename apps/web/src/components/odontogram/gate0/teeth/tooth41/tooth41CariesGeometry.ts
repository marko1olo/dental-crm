/**
 * DENTE Dental CRM — Organic Caries & Cavitation Geometry for Tooth 41
 * Mandibular Central Incisor: Class III, Class IV (Incisal Fracture), Class V.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH41_CARIES_GEOMETRY = {
	// Class III Proximal Contact (Mesial X=31..38, Y=33..47)
	class3: {
		halo: "M 32.0,33.0 C 37.0,33.0 39.5,36.5 38.8,41.0 C 38.0,45.5 35.5,47.8 31.5,47.5 Z",
		crater: "M 32.2,35.0 C 36.0,35.2 37.8,37.5 37.2,41.0 C 36.6,44.5 34.5,46.0 31.8,45.8 Z",
		profunda: "M 32.2,37.0 C 34.8,37.2 35.8,39.0 35.4,41.2 C 35.0,43.2 33.8,44.2 32.0,44.0 Z",
	},

	// Class IV Incisal Angle Fracture & Cavitation (Mesio-Incisal Chipped Notch)
	class4: {
		halo: "M 32.0,21.0 L 46.5,21.0 C 46.0,26.0 43.5,31.0 38.0,34.0 C 33.0,34.0 31.5,27.0 32.0,21.0 Z",
		fractureSteps: [
			"M 32.0,21.5 L 36.5,25.8 L 35.5,28.5 L 41.0,30.2 L 44.5,21.5",
			"M 34.5,24.0 L 38.0,27.0",
		],
		crater: "M 32.0,23.0 L 43.0,23.0 C 42.0,27.0 39.5,31.0 35.5,31.5 C 32.5,30.5 32.0,26.0 32.0,23.0 Z",
		profunda: "M 32.0,25.0 L 39.5,25.0 C 38.8,27.8 37.2,29.8 34.5,30.0 C 32.5,29.2 32.0,27.0 32.0,25.0 Z",
	},

	// Class V Cervical Buccal Margin at CEJ (X=39..61, Y=64..72)
	class5: {
		halo: "M 39.0,71.5 C 43.5,73.0 56.5,73.0 61.0,71.5 C 59.2,65.5 55.5,64.0 50.0,64.0 C 44.5,64.0 40.8,65.5 39.0,71.5 Z",
		crater: "M 41.5,71.0 C 45.0,72.2 55.0,72.2 58.5,71.0 C 57.0,66.8 54.0,65.5 50.0,65.5 C 46.0,65.5 43.0,66.8 41.5,71.0 Z",
		profunda: "M 44.5,70.2 C 47.0,71.0 53.0,71.0 55.5,70.2 C 54.5,67.8 52.5,67.0 50.0,67.0 C 47.5,67.0 45.5,67.8 44.5,70.2 Z",
	},
} as const;
