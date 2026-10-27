/**
 * Orthopedic & Restoration Geometry for Upper Lateral Incisor 12
 * - Post entering slender lateral canal (apex 43.0, 14.0).
 * - Circular Chamfer finish line & 2mm Ferrule collar.
 * - Monolithic zirconia crown / aesthetic laminate veneer.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
import { TOOTH12_GEOMETRY } from "./tooth12GeometryConstants";

export const TOOTH12_RESTORATION_GEOMETRY = {
	// 1. Zirconia Crown Outer Silhouette
	zirconiaCrownPath: TOOTH12_GEOMETRY.crownMonolithPath,

	// 2. Circular Chamfer Preparation Finish Line & 2mm Ferrule Collar
	ferruleCollarPath:
		"M 30.5,97.5 " +
		"C 37.0,95.5 44.0,95.0 50.0,95.0 " +
		"C 56.0,95.0 63.0,95.5 69.5,97.5 " +
		"C 69.5,99.5 68.5,101.5 67.5,103.0 " +
		"C 61.5,101.0 55.5,100.5 50.0,100.5 " +
		"C 44.5,100.5 38.5,101.0 32.5,103.0 " +
		"C 31.5,101.5 30.5,99.5 30.5,97.5 Z",

	// 3. Anatomical Core Build-up
	coreBuildUpPath:
		"M 33.0,101.0 " +
		"C 32.0,108.0 32.5,118.0 38.0,124.0 " +
		"C 43.5,126.5 50.0,126.5 55.5,125.0 " +
		"C 61.5,121.0 66.0,113.0 67.0,101.0 " +
		"C 61.5,102.5 55.5,103.0 50.0,103.0 " +
		"C 44.5,103.0 38.5,102.5 33.0,101.0 Z",

	// 4. Slender Endodontic Post in Lateral Canal (Apex at 43.0, 14.0)
	lateralPostPath:
		"M 45.0,40.0 " +
		"L 47.5,40.0 " +
		"C 47.5,60.0 48.5,80.0 51.0,98.0 " +
		"L 48.5,98.0 " +
		"C 46.5,80.0 45.5,60.0 45.0,40.0 Z",

	// Post retentive serrations
	postSerrations: [
		{ y: 50, x1: 45.5, x2: 47.8 },
		{ y: 60, x1: 46.0, x2: 48.2 },
		{ y: 70, x1: 46.5, x2: 48.8 },
		{ y: 80, x1: 47.2, x2: 49.5 },
		{ y: 90, x1: 48.0, x2: 50.2 },
	],
} as const;
