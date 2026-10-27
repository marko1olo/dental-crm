/**
 * Orthopedic & Restoration Geometry for Upper Canine Tooth 13
 * - Deep post entering massive canine root canal (apex 45.0, 4.5).
 * - Circular Chamfer finish line & 2mm Ferrule collar.
 * - Monolithic zirconia crown / aesthetic laminate veneer.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
import { TOOTH13_GEOMETRY } from "./tooth13GeometryConstants";

export const TOOTH13_RESTORATION_GEOMETRY = {
	// 1. Zirconia Crown Outer Silhouette
	zirconiaCrownPath: TOOTH13_GEOMETRY.crownMonolithPath,

	// 2. Circular Chamfer Preparation Finish Line & 2mm Ferrule Collar
	ferruleCollarPath:
		"M 28.0,97.5 " +
		"C 35.0,95.5 43.0,95.0 50.0,95.0 " +
		"C 57.0,95.0 65.0,95.5 72.0,97.5 " +
		"C 72.0,99.5 71.0,101.5 70.0,103.0 " +
		"C 63.5,101.0 56.5,100.5 50.0,100.5 " +
		"C 43.5,100.5 36.5,101.0 30.0,103.0 " +
		"C 29.0,101.5 28.0,99.5 28.0,97.5 Z",

	// 3. Anatomical Core Build-up
	coreBuildUpPath:
		"M 31.0,101.0 " +
		"C 30.0,109.0 31.0,120.0 37.0,126.0 " +
		"C 43.0,128.5 50.0,128.5 56.0,127.0 " +
		"C 63.0,123.0 68.0,115.0 69.0,101.0 " +
		"C 63.0,102.5 56.0,103.0 50.0,103.0 " +
		"C 44.0,103.0 37.0,102.5 31.0,101.0 Z",

	// 4. Massive Endodontic Post in Canine Canal (Apex at 45.0, 4.5)
	caninePostPath:
		"M 47.0,30.0 " +
		"L 49.5,30.0 " +
		"C 49.2,52.0 49.0,75.0 51.5,98.0 " +
		"L 48.5,98.0 " +
		"C 47.5,75.0 47.2,52.0 47.0,30.0 Z",

	// Post retentive serrations
	postSerrations: [
		{ y: 40, x1: 47.2, x2: 49.4 },
		{ y: 50, x1: 47.4, x2: 49.3 },
		{ y: 60, x1: 47.6, x2: 49.5 },
		{ y: 70, x1: 48.0, x2: 49.8 },
		{ y: 80, x1: 48.3, x2: 50.2 },
		{ y: 90, x1: 48.5, x2: 50.8 },
	],
} as const;
