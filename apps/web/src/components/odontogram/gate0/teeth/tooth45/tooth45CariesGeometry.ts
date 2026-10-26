/**
 * DENTE Dental CRM — Organic Caries & Cavitation Geometry for Tooth 45
 * Mandibular Second Premolar: Class I (Y-Pattern), Class II (5 localizations x 4 depths), Class V.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

import { TOOTH45_CARIES_CLASS2_GEOMETRY } from "./tooth45CariesClass2Geometry";

export { TOOTH45_CARIES_CLASS2_GEOMETRY };

export const TOOTH45_CARIES_GEOMETRY = {
	// Class I Destructive: organic central occlusal table collapse
	destructiveCutout:
		"M 32,0 L 68,0 C 67,16 63,26 58,32 C 54,36 46,36 42,32 C 37,26 33,16 32,0 Z",

	destructive: {
		fractureMargin: "M 33,18 C 36,26 42,32 50,33 C 58,32 64,26 67,18",
		fractureSteps: [
			"M 36,22 C 40,28 45,31 50,31 C 55,31 60,28 64,22",
			"M 40,28 L 38,32",
			"M 60,28 L 62,32",
		],
	},

	// Class I Y-Fissure Central Pit & Lingual Stem Cavitation
	class1: {
		halo: "M 45.0,20.5 C 47.0,18.5 53.0,18.5 55.0,20.5 C 56.5,22.5 55.5,25.5 52.5,26.5 L 52.5,31.5 C 52.5,32.8 47.5,32.8 47.5,31.5 L 47.5,26.5 C 44.5,25.5 43.5,22.5 45.0,20.5 Z",
		crater: "M 46.5,21.5 C 48.0,20.0 52.0,20.0 53.5,21.5 C 54.5,23.0 53.8,25.0 51.5,25.8 L 51.5,30.5 C 51.5,31.2 48.5,31.2 48.5,30.5 L 48.5,25.8 C 46.2,25.0 45.5,23.0 46.5,21.5 Z",
		profunda: "M 48.0,22.5 C 49.0,21.5 51.0,21.5 52.0,22.5 C 52.8,23.5 52.2,24.8 50.8,25.2 L 50.8,29.5 C 50.8,29.8 49.2,29.8 49.2,29.5 L 49.2,25.2 C 47.8,24.8 47.2,23.5 48.0,22.5 Z",
	},

	// Class V Cervical Buccal Margin
	class5: {
		halo: "M 34.0,73.0 C 40.0,68.0 50.0,66.5 56.0,66.5 C 62.0,66.5 68.0,68.0 71.0,73.0 C 62.0,74.5 42.0,74.5 34.0,73.0 Z",
		crater: "M 37.0,72.5 C 41.5,69.5 50.0,68.2 56.0,68.2 C 61.0,68.2 65.5,69.5 68.0,72.5 C 60.5,73.8 44.5,73.8 37.0,72.5 Z",
		profunda: "M 41.0,71.8 C 45.0,70.2 51.0,69.5 56.0,69.5 C 59.5,69.5 63.0,70.2 65.0,71.8 C 59.0,72.8 47.0,72.8 41.0,71.8 Z",
		fractureMargin: "M 28.0,75.5 C 38.0,62.0 62.0,62.0 72.0,75.5",
		fractureSteps: [
			"M 28.0,75.5 C 38.0,62.0 62.0,62.0 72.0,75.5",
			"M 44.0,66.0 L 43.0,69.5",
			"M 56.0,66.0 L 57.0,69.5",
		],
		destructiveCutout: "M 28,75.5 C 38,62 62,62 72,75.5 Z",
	},

	...TOOTH45_CARIES_CLASS2_GEOMETRY,
} as const;
