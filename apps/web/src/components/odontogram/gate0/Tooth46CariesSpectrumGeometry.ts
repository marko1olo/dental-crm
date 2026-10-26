/**
 * DENTE Dental CRM — Authentic Caries Spectrum Geometry for Tooth 46
 * Class II (M, D, MO, DO, MOD), Class V, White Spot & Destructive Cutouts.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

import { TOOTH46_CARIES_DESTRUCTIVE_GEOMETRY } from "./Tooth46CariesDestructiveGeometry";

export { TOOTH46_CARIES_DESTRUCTIVE_GEOMETRY };

export const TOOTH46_CARIES_SPECTRUM_GEOMETRY = {
	// White Spot (Caries in situ / Stage 0 Demineralization on Smooth Enamel)
	whiteSpot: {
		halo: "M 42,55 C 42,50 46,47 51,47 C 56,47 60,50 60,55 C 60,59.5 56,62.5 51,62.5 C 46,62.5 42,59.5 42,55 Z",
		core: "M 45,55 C 45,52 47.5,49.5 51,49.5 C 54.5,49.5 57,52 57,55 C 57,58 54.5,60 51,60 C 47.5,60 45,58 45,55 Z",
	},

	// Class II M (Pure Mesial Proximal Contact Box with 4.5)
	class2M: {
		halo: "M 11.5,45 C 11.0,38 11.5,33 13.0,30 C 15.0,26 17.5,25 19.5,27 C 20.0,31 19.5,38 18.5,43 C 16.5,45 13.5,46 11.5,45 Z",
		crater: "M 12.0,43 C 11.8,37 12.2,33 13.5,31 C 15.0,27 17.0,27 18.5,29 C 18.5,33 18.2,38 17.5,41 C 15.5,42.5 13.5,43.5 12.0,43 Z",
		necrotic: "M 12.5,40 C 12.3,35 12.8,32 14.0,31 C 15.0,29 16.5,29 17.5,31 C 17.2,34 17.0,37 16.5,39 C 15.0,40 13.5,40.5 12.5,40 Z",
	},

	// Class II D (Pure Distal Proximal Contact Box with 4.7)
	class2D: {
		halo: "M 87.5,46 C 88.0,39 87.5,34 86.0,31 C 84.0,27 81.5,26 79.5,28 C 79.0,32 79.5,39 80.5,44 C 82.5,46 85.5,47 87.5,46 Z",
		crater: "M 87.0,44 C 87.2,38 86.8,34 85.5,32 C 84.0,28 82.0,28 80.5,30 C 80.5,34 80.8,39 81.5,42 C 83.5,43.5 85.5,44.5 87.0,44 Z",
		necrotic: "M 86.5,41 C 86.7,36 86.2,33 85.0,32 C 84.0,30 82.5,30 81.5,32 C 81.8,35 82.0,38 82.5,40 C 84.0,41 85.5,41.5 86.5,41 Z",
	},

	// Class II MO (Lateral Interproximal Box + Occlusal extension on Mesial Wall)
	class2Mo: {
		halo: "M 12.0,47 C 11.5,40 12.0,33 13.0,28 C 15.0,23 18.0,21 23.5,23 C 26.0,24 24.5,28 21.0,30 C 19.5,33 19.5,42 19.0,45.5 C 17.0,47 14.0,48 12.0,47 Z",
		crater: "M 12.5,45 C 12.2,38 12.8,32 13.5,29 C 15.0,24 17.5,23.5 21.5,25.5 C 22.5,27 20.0,29.5 18.2,31.5 C 18.2,35 18.2,41 18.0,43.5 C 16.0,44.5 14.0,45.5 12.5,45 Z",
		necrotic: "M 13.0,42 C 12.8,36 13.2,32 14.2,30 C 15.5,27 17.0,27 19.0,28 C 17.8,30.5 17.5,35 17.2,40 C 15.8,41 14.2,42 13.0,42 Z",
	},

	// Class II DO (Lateral Interproximal Box + Occlusal extension on Distal Wall)
	class2Do: {
		halo: "M 87.0,48 C 87.5,41 87.0,34 85.5,29 C 83.5,24 80.5,22 75.5,24 C 73.0,25 74.5,29 78.0,31 C 79.5,34 79.5,43 80.0,46.5 C 82.0,48 85.0,49 87.0,48 Z",
		crater: "M 86.5,46 C 86.8,39 86.2,33 85.2,30 C 83.5,25 81.0,24.5 77.0,26.5 C 76.0,28 78.5,30.5 80.5,32.5 C 80.5,36 80.5,42 80.8,44.5 C 82.8,45.5 84.8,46.5 86.5,46 Z",
		necrotic: "M 86.0,43 C 86.2,37 85.8,33 84.5,31 C 83.2,28 81.5,28 79.5,29 C 80.8,31.5 81.0,36 81.2,41 C 82.8,42 84.5,43 86.0,43 Z",
	},

	// Class II MOD (Through-and-Through Occlusal Isthmus Channel)
	class2ModBridge: {
		halo: "M 21,24 C 34,21 48,20.5 58,20.5 C 68,20.5 74,22 77,24 C 76,28.5 68,26.5 58,26.5 C 48,26.5 34,28.5 21,28 Z",
		crater: "M 22,25 C 34,22.2 48,21.8 58,21.8 C 68,21.8 73,23 76,25 C 75,27.5 68,25.5 58,25.5 C 48,25.5 34,27.2 22,27 Z",
		necrotic: "M 25,25.5 C 36,23.2 48,22.8 58,22.8 C 66,22.8 70,23.8 73,25.2 C 70,26.5 64,24.8 58,24.8 C 48,24.8 36,26 25,26.2 Z",
	},

	// Class V (Cervical Buccal Caries at CEJ)
	class5: {
		halo: "M 30,71 C 36,66 48,64 54,64 C 62,64 70,66 74,71 C 68,73.5 52,74 30,71 Z",
		crater: "M 34,70.5 C 40,67 48,66 54,66 C 60,66 65,67 69,70.5 C 65,72.5 52,73 34,70.5 Z",
		necrotic: "M 38,70 C 43,68 49,67.5 54,67.5 C 58,67.5 62,68 65,70 C 62,71.5 52,72 38,70 Z",
		fractureMargin: "M 24,75 C 34,56 66,56 76,75",
		fractureSteps: [
			"M 24,75 C 34,56 66,56 76,75",
			"M 44,60.5 L 43,65.0",
			"M 56,60.5 L 57,65.0",
		],
		destructiveCutout: "M 24,75 C 34,56 66,56 76,75 Z",
	},

	// Re-export physical fracture cutouts
	...TOOTH46_CARIES_DESTRUCTIVE_GEOMETRY,
} as const;
