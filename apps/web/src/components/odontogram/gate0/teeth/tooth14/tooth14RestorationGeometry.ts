/**
 * Orthopedic & Restoration Geometry for Upper First Premolar Tooth 14
 * - Post & core placed in straighter, wider PALATAL root canal (apex 54.5, 10.5).
 * - Ferrule 1.5-2mm with circular Chamfer finish line.
 * - Monolithic zirconia crown with anatomical contour (longer mesial cusp slope).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
import { TOOTH14_GEOMETRY } from "./tooth14GeometryConstants";

export const TOOTH14_RESTORATION_GEOMETRY = {
	// 1. Zirconia Crown Outer Silhouette
	zirconiaCrownPath: TOOTH14_GEOMETRY.crownMonolithPath,

	// 2. Circular Chamfer Preparation Finish Line & 2mm Ferrule Collar
	ferruleCollarPath:
		"M 25.0,97.5 " +
		"C 33.0,95.5 42.0,95.0 50.0,95.0 " +
		"C 58.0,95.0 67.0,95.5 75.0,97.5 " +
		"C 75.0,99.5 74.0,101.5 73.0,103.0 " +
		"C 65.5,101.0 57.5,100.5 50.0,100.5 " +
		"C 42.5,100.5 34.5,101.0 27.0,103.0 " +
		"C 26.0,101.5 25.0,99.5 25.0,97.5 Z",

	// 3. Anatomical Core Build-up (Composite/Cast core)
	coreBuildUpPath:
		"M 28.0,101.0 " +
		"C 27.0,109.0 27.5,118.0 35.0,124.0 " +
		"C 42.0,126.5 50.0,126.5 57.0,125.0 " +
		"C 65.0,121.0 71.0,113.0 72.0,101.0 " +
		"C 65.0,102.5 57.0,103.0 50.0,103.0 " +
		"C 43.0,103.0 35.0,102.5 28.0,101.0 Z",

	// 4. Endodontic Post in the Palatal Root Canal (Apex at 54.5, 10.5)
	palatalFiberPostPath:
		"M 53.0,38.0 " +
		"L 55.5,38.0 " +
		"C 55.2,58.0 55.0,78.0 54.5,98.0 " +
		"L 52.5,98.0 " +
		"C 53.0,78.0 53.2,58.0 53.0,38.0 Z",

	// Post retentive serrations
	postSerrations: [
		{ y: 48, x1: 52.8, x2: 55.2 },
		{ y: 58, x1: 52.6, x2: 55.0 },
		{ y: 68, x1: 52.5, x2: 54.8 },
		{ y: 78, x1: 52.5, x2: 54.6 },
		{ y: 88, x1: 52.5, x2: 54.5 },
	],
} as const;
