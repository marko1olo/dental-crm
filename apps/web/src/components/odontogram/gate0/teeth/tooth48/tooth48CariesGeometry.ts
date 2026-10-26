/**
 * DENTE Dental CRM — Organic Caries & Cavitation Geometry for Tooth 48
 * Mandibular Third Molar: Class I (Crenulated Fissure), Class II (5 localizations x 4 depths), Class V.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

import { TOOTH48_CARIES_CLASS2_GEOMETRY } from "./tooth48CariesClass2Geometry";

export { TOOTH48_CARIES_CLASS2_GEOMETRY };

export const TOOTH48_CARIES_GEOMETRY = {
	// Class I Destructive: organic central occlusal table collapse
	destructiveCutout:
		"M 26,0 L 74,0 C 73,16 69,26 63,33 C 57,38 43,38 37,33 C 31,26 27,16 26,0 Z",

	destructive: {
		fractureMargin: "M 26,18 C 31,26 40,33 50,34 C 60,33 69,26 74,18",
		fractureSteps: [
			"M 31,22 C 37,28 43,32 50,32 C 57,32 63,28 69,22",
			"M 37,28 L 35,32",
			"M 63,28 L 65,32",
		],
	},

	// Class I Crenulated Fissure Pit Cavitation
	class1: {
		halo:
			"M 28,21.0 C 35,20.0 43,21.0 47,22.0 C 46,26.0 44,30.0 42,34.0 C 45,34.5 47,31.5 48,27.0 " +
			"C 50,23.0 52,22.5 54,22.0 C 55,18.5 56,15.5 56,13.0 C 53,13.0 52,17.5 51,20.5 " +
			"C 58,20.5 66,21.0 72,21.5 C 74,23.5 71,25.0 65,24.5 C 57,24.5 49,25.0 43,25.5 " +
			"C 37,25.0 29,24.5 27,23.0 C 26,21.5 27,21.2 28,21.0 Z",
		crater:
			"M 30,22.0 C 36,21.0 44,22.0 47,23.0 C 46,26.5 44.5,30.0 43,33.0 C 45,33.0 46.5,30.5 47.5,26.5 " +
			"C 50,23.5 52.5,23.0 54,22.5 C 54.5,19.5 55,17.0 55,14.5 C 53.5,14.8 52.5,18.2 51.5,21.2 " +
			"C 58,21.2 65,21.8 70,22.2 C 69,23.8 64,23.8 60,23.6 C 53,23.8 47,24.2 42,24.5 " +
			"C 37,24.0 31,23.2 30,22.0 Z",
		profunda:
			"M 39,22.5 C 45,22.5 51,22.5 55,22.8 C 53,24.5 49,24.8 45,24.8 C 42,24.8 40,24.0 39,22.5 Z " +
			"M 44,24.0 C 45,27.0 44.5,30.0 43.5,31.5 C 42.5,29.5 43,26.5 44,24.0 Z",
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

	...TOOTH48_CARIES_CLASS2_GEOMETRY,
} as const;
