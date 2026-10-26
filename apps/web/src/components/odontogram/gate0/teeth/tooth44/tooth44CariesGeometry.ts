/**
 * DENTE Dental CRM — Organic Caries & Cavitation Geometry for Tooth 44
 * Mandibular First Premolar: Class I (Snake-Eyes), Class II (5 localizations x 4 depths), Class V.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

import { TOOTH44_CARIES_CLASS2_GEOMETRY } from "./tooth44CariesClass2Geometry";

export { TOOTH44_CARIES_CLASS2_GEOMETRY };

export const TOOTH44_CARIES_GEOMETRY = {
	// Class I Destructive: massive central occlusal table collapse
	destructiveCutout:
		"M 32,12 L 68,12 L 67,23 L 62,29 L 50,34 L 38,29 L 33,23 Z",

	destructive: {
		fractureMargin: "M 33,23 L 38,29 L 50,34 L 62,29 L 67,23",
		fractureSteps: [
			"M 33,23 L 38,29 L 50,34 L 62,29 L 67,23",
			"M 38,29 L 36,33",
			"M 62,29 L 64,33",
		],
	},

	// Class I Snake-Eyes Occlusal Pits across Crista Transversa
	class1: {
		mesial: {
			halo: "M 35.0,21.5 C 36.0,19.0 41.0,19.0 43.5,20.5 C 45.5,22.5 45.0,26.5 42.5,28.0 C 39.0,28.8 35.5,26.5 35.0,21.5 Z",
			crater: "M 36.5,22.2 C 37.5,20.5 40.5,20.5 42.2,21.5 C 43.8,23.0 43.2,25.8 41.2,26.8 C 38.5,27.2 36.8,25.5 36.5,22.2 Z",
			profunda: "M 38.0,23.0 C 38.8,22.0 40.5,22.0 41.2,22.8 C 42.0,23.8 41.8,25.0 40.5,25.5 C 39.0,25.8 38.2,24.8 38.0,23.0 Z",
		},
		distal: {
			halo: "M 56.5,21.5 C 57.5,19.0 62.5,19.0 64.5,21.0 C 66.0,23.0 65.5,26.8 63.0,28.0 C 59.5,28.8 56.0,26.5 56.5,21.5 Z",
			crater: "M 57.8,22.2 C 58.5,20.5 61.8,20.5 63.2,21.8 C 64.5,23.2 64.0,25.8 62.0,26.8 C 59.5,27.2 58.0,25.5 57.8,22.2 Z",
			profunda: "M 59.0,23.0 C 59.8,22.0 61.5,22.0 62.2,22.8 C 62.8,23.8 62.5,25.0 61.2,25.5 C 60.0,25.8 59.2,24.8 59.0,23.0 Z",
		},
	},

	// Class V Cervical Buccal Margin
	class5: {
		halo: "M 32.0,73.0 C 38.0,68.0 50.0,66.5 56.0,66.5 C 62.0,66.5 68.0,68.0 71.0,73.0 C 62.0,74.5 41.0,74.5 32.0,73.0 Z",
		crater: "M 35.0,72.5 C 40.0,69.5 50.0,68.2 56.0,68.2 C 61.0,68.2 65.5,69.5 68.0,72.5 C 60.5,73.8 42.5,73.8 35.0,72.5 Z",
		necrotic: "M 40.0,71.8 C 44.0,70.2 51.0,69.5 56.0,69.5 C 59.5,69.5 63.0,70.2 65.0,71.8 C 59.0,72.8 46.0,72.8 40.0,71.8 Z",
		fractureMargin: "M 28.0,75.5 C 38.0,62.0 62.0,62.0 72.0,75.5",
		fractureSteps: [
			"M 28.0,75.5 C 38.0,62.0 62.0,62.0 72.0,75.5",
			"M 44.0,66.0 L 43.0,69.5",
			"M 56.0,66.0 L 57.0,69.5",
		],
		destructiveCutout: "M 28,75.5 C 38,62 62,62 72,75.5 Z",
	},

	...TOOTH44_CARIES_CLASS2_GEOMETRY,
} as const;
