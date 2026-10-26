/**
 * DENTE Dental CRM — Organic Caries & Cavitation Geometry for Tooth 47
 * Mandibular Second Molar: Class I (Dendritic Fissure), Class II (5 localizations x 4 depths), Class V.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

import { TOOTH47_CARIES_CLASS2_GEOMETRY } from "./tooth47CariesClass2Geometry";

export { TOOTH47_CARIES_CLASS2_GEOMETRY };

export const TOOTH47_CARIES_GEOMETRY = {
	// Class I Destructive: central occlusal table collapse
	destructiveCutout:
		"M 26,12 L 74,12 L 73,25 L 68,32 L 60,37 L 50,38 L 40,37 L 32,32 L 27,25 Z",

	destructive: {
		fractureMargin: "M 27,25 L 32,32 L 40,37 L 50,38 L 60,37 L 68,32 L 73,25",
		fractureSteps: [
			"M 27,25 L 32,32 L 40,37 L 50,38 L 60,37 L 68,32 L 73,25",
			"M 32,32 L 30,36",
			"M 68,32 L 70,36",
		],
	},

	// Class I Organic Dendritic Cavity along Offset Molar Fissures
	class1: {
		halo:
			"M 26,19.5 C 34,19.0 42,20.0 46,21.0 C 45,25.0 43,29.5 41,33.5 C 44,34.0 46,31.0 47,26.5 " +
			"C 49,22.0 51,21.5 53,21.0 C 54,17.5 55,14.5 55,12.0 C 52,12.0 51,16.5 50,19.5 " +
			"C 57,19.5 65,20.0 73,20.5 C 75,22.5 72,24.0 66,23.5 C 58,23.5 50,24.0 44,24.5 " +
			"C 36,24.0 28,23.5 25,22.0 C 24,20.5 25,20.0 26,19.5 Z",
		crater:
			"M 28,20.5 C 35,20.0 43,21.2 46,22.0 C 45,25.5 43.5,29.0 42,32.0 C 44,32.0 45.5,29.5 46.5,25.5 " +
			"C 49,22.5 51.5,22.0 53,21.5 C 53.5,18.5 54,16.0 54,13.5 C 52.5,13.8 51.5,17.2 50.5,20.2 " +
			"C 57,20.2 64,20.8 71,21.2 C 70,22.8 65,22.8 61,22.6 C 54,22.8 48,23.2 43,23.5 " +
			"C 36,23.0 30,22.2 28,20.5 Z",
		profunda:
			"M 38,21.5 C 44,21.5 50,21.5 54,21.8 C 52,23.5 48,23.8 44,23.8 C 41,23.8 39,23.0 38,21.5 Z " +
			"M 43,23.0 C 44,26.0 43.5,29.0 42.5,30.5 C 41.5,28.5 42,25.5 43,23.0 Z",
	},

	// Class V Cervical Buccal Margin
	class5: {
		halo: "M 28.0,73.0 C 36.0,67.0 50.0,65.5 56.0,65.5 C 64.0,65.5 72.0,67.0 76.0,73.0 C 66.0,74.5 40.0,74.5 28.0,73.0 Z",
		crater: "M 32.0,72.5 C 38.0,68.5 50.0,67.2 56.0,67.2 C 63.0,67.2 69.5,68.5 73.0,72.5 C 64.0,73.8 42.0,73.8 32.0,72.5 Z",
		profunda: "M 36.0,71.8 C 42.0,69.5 50.0,68.5 56.0,68.5 C 62.0,68.5 66.0,69.5 69.0,71.8 C 62.0,72.8 44.0,72.8 36.0,71.8 Z",
		fractureMargin: "M 24.0,76.0 C 34.0,60.0 66.0,60.0 76.0,76.0",
		fractureSteps: [
			"M 24.0,76.0 C 34.0,60.0 66.0,60.0 76.0,76.0",
			"M 44.0,65.0 L 43.0,69.0",
			"M 56.0,65.0 L 57.0,69.0",
		],
		destructiveCutout: "M 24,76 C 34,60 66,60 76,76 Z",
	},

	...TOOTH47_CARIES_CLASS2_GEOMETRY,
} as const;
