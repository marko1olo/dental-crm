/**
 * Orthopedic & Restoration Geometry for Upper Central Incisor 11
 * - Post entering massive central canal (apex 50.0, 12.5).
 * - Circular Chamfer finish line & 2mm Ferrule collar.
 * - Monolithic zirconia crown / aesthetic laminate veneer.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
import { TOOTH11_GEOMETRY } from "./tooth11GeometryConstants";

export const TOOTH11_RESTORATION_GEOMETRY = {
	// 1. Zirconia Crown Outer Silhouette
	zirconiaCrownPath: TOOTH11_GEOMETRY.crownMonolithPath,

	// 2. Circular Chamfer Preparation Finish Line & 2mm Ferrule Collar
	ferruleCollarPath:
		"M 25.5,96.0 " +
		"C 33.0,94.0 42.0,93.0 50.0,93.0 " +
		"C 58.0,93.0 67.0,94.0 74.5,96.0 " +
		"C 74.0,98.0 73.0,100.0 72.0,101.5 " +
		"C 65.0,99.5 58.0,99.0 50.0,99.0 " +
		"C 42.0,99.0 35.0,99.5 28.0,101.5 " +
		"C 27.0,100.0 26.0,98.0 25.5,96.0 Z",

	// 3. Anatomical Core Build-up
	coreBuildUpPath:
		"M 28.0,100.0 " +
		"C 27.0,108.0 28.0,120.0 35.0,128.0 " +
		"C 42.0,132.0 50.0,132.0 58.0,130.0 " +
		"C 65.0,126.0 72.0,116.0 72.0,100.0 " +
		"C 65.0,101.5 58.0,102.0 50.0,102.0 " +
		"C 42.0,102.0 35.0,101.5 28.0,100.0 Z",

	// 4. Straight Endodontic Post in Central Canal (Apex at 50.0, 12.5)
	centralPostPath:
		"M 48.5,38.0 " +
		"L 51.5,38.0 " +
		"C 51.5,58.0 52.0,78.0 53.0,98.0 " +
		"L 47.0,98.0 " +
		"C 48.0,78.0 48.5,58.0 48.5,38.0 Z",

	// Post retentive serrations
	postSerrations: [
		{ y: 48, x1: 48.0, x2: 52.0 },
		{ y: 58, x1: 47.8, x2: 52.2 },
		{ y: 68, x1: 47.5, x2: 52.5 },
		{ y: 78, x1: 47.2, x2: 52.8 },
		{ y: 88, x1: 47.0, x2: 53.0 },
	],
} as const;
