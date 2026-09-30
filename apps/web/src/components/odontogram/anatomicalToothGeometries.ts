/**
 * DENTE Dental CRM — Anatomical Tooth Geometries & SVG Morphology (Master Facade)
 *
 * Provides anatomical SVG paths, multi-root profiles, root canal paths,
 * 5-surface crown geometries (O, V/B, L/P, M, D), ICDAS II classification,
 * and restorative shader definitions for 32 adult + 20 pediatric teeth.
 *
 * Decomposed into modular domain units according to Mandate 8b:
 * - anatomicalGeometriesTypes.ts (Types & interfaces)
 * - anatomicalMaterialsAndSurfaces.ts (ICDAS II, shaders, materials, surfaces)
 * - anatomicalAdultGeometries.ts (Permanent teeth 11..48 SVG models)
 * - anatomicalPediatricGeometries.ts (Primary teeth 51..85 SVG models & resorption)
 * - anatomicalBridges.ts (Dental bridge span detection)
 */

import type {
	AnatomicalTemplateData,
	AnatomicalToothGeometry,
	ToothArch,
	ToothMorphologyGroup,
	ToothSide,
} from "./anatomicalGeometriesTypes";
import {
	isMaxillaryArch,
	isPatientLeftSide,
} from "./anatomicalMaterialsAndSurfaces";
import {
	LOWER_CANINE_GEOMETRY,
	LOWER_INCISOR_GEOMETRY,
	LOWER_MOLAR_GEOMETRY,
	LOWER_PREMOLAR_GEOMETRY,
	UPPER_CANINE_GEOMETRY,
	UPPER_INCISOR_GEOMETRY,
	UPPER_MOLAR_GEOMETRY,
	UPPER_PREMOLAR_GEOMETRY,
} from "./anatomicalAdultGeometries";
import {
	PEDIATRIC_LOWER_MOLAR_GEOMETRY,
	PEDIATRIC_UPPER_MOLAR_GEOMETRY,
	registerGeometryResolver,
} from "./anatomicalPediatricGeometries";

// Export all types and sub-modules for 100% backward compatibility
export * from "./anatomicalGeometriesTypes";
export * from "./anatomicalMaterialsAndSurfaces";
export * from "./anatomicalAdultGeometries";
export * from "./anatomicalPediatricGeometries";
export * from "./anatomicalBridges";

// Re-export DentalPin quadrant napkin unfolding symmetry and canal obturation clip helpers
export {
	getToothTransform,
	getNapkinUnfoldingTransform,
	NAPKIN_SYMMETRY_CONFIG,
	getCanalObturationClipConfig,
	PERIAPICAL_LESION_SIZES,
	type CanalObturationClipConfig,
} from "./ToothSVGPaths";

/**
 * Получить морфологическую группу зуба по номеру FDI.
 */
export function getAnatomicalGroup(fdiNumber: number): ToothMorphologyGroup {
	const quadrant = Math.floor(fdiNumber / 10);
	const pos = fdiNumber % 10;
	const isPediatric = quadrant >= 5 && quadrant <= 8;

	if (isPediatric) {
		if (pos === 1 || pos === 2) return "primary_incisor";
		if (pos === 3) return "primary_canine";
		if (pos === 4) return "primary_molar_1";
		return "primary_molar_2";
	}

	if (pos === 1) return "incisor_central";
	if (pos === 2) return "incisor_lateral";
	if (pos === 3) return "canine";
	if (pos === 4) return "premolar_1";
	if (pos === 5) return "premolar_2";
	if (pos === 6) return "molar_1";
	if (pos === 7) return "molar_2";
	return "molar_3";
}

/**
 * Получить полную анатомическую модель для конкретного зуба FDI.
 */
export function getAnatomicalToothGeometry(
	fdiNumber: number,
): AnatomicalToothGeometry {
	const group = getAnatomicalGroup(fdiNumber);
	const arch: ToothArch = isMaxillaryArch(fdiNumber) ? "maxillary" : "mandibular";
	const side: ToothSide = isPatientLeftSide(fdiNumber) ? "left" : "right";
	const isPediatric = Math.floor(fdiNumber / 10) >= 5;

	// Выбираем шаблон геометрии
	let template: AnatomicalTemplateData;
	let rootNamesRu: readonly string[];
	let rootsCount: number;

	if (isPediatric) {
		if (arch === "maxillary") {
			if (group === "primary_molar_1" || group === "primary_molar_2") {
				template = PEDIATRIC_UPPER_MOLAR_GEOMETRY;
				rootNamesRu = ["Медиально-щечный", "Дистально-щечный", "Нёбный"];
				rootsCount = 3;
			} else if (group === "primary_canine") {
				template = UPPER_CANINE_GEOMETRY;
				rootNamesRu = ["Одиночный конусовидный корень"];
				rootsCount = 1;
			} else {
				template = UPPER_INCISOR_GEOMETRY;
				rootNamesRu = ["Одиночный резечный корень"];
				rootsCount = 1;
			}
		} else {
			if (group === "primary_molar_1" || group === "primary_molar_2") {
				template = PEDIATRIC_LOWER_MOLAR_GEOMETRY;
				rootNamesRu = ["Медиальный", "Дистальный"];
				rootsCount = 2;
			} else if (group === "primary_canine") {
				template = LOWER_CANINE_GEOMETRY;
				rootNamesRu = ["Одиночный корень клыка"];
				rootsCount = 1;
			} else {
				template = LOWER_INCISOR_GEOMETRY;
				rootNamesRu = ["Одиночный тонкий корень"];
				rootsCount = 1;
			}
		}
	} else {
		// Постоянные зубы
		if (arch === "maxillary") {
			if (group === "molar_1" || group === "molar_2" || group === "molar_3") {
				template = UPPER_MOLAR_GEOMETRY;
				rootNamesRu = ["Медиально-щечный (MB)", "Дистально-щечный (DB)", "Нёбный (P)"];
				rootsCount = 3;
			} else if (group === "premolar_1" || group === "premolar_2") {
				template = UPPER_PREMOLAR_GEOMETRY;
				rootNamesRu = group === "premolar_1"
					? ["Щечный (B)", "Нёбный (P)"]
					: ["Одиночный бороздчатый корень"];
				rootsCount = group === "premolar_1" ? 2 : 1;
			} else if (group === "canine") {
				template = UPPER_CANINE_GEOMETRY;
				rootNamesRu = ["Одиночный массивный корень"];
				rootsCount = 1;
			} else {
				template = UPPER_INCISOR_GEOMETRY;
				rootNamesRu = ["Одиночный конусовидный корень"];
				rootsCount = 1;
			}
		} else {
			if (group === "molar_1" || group === "molar_2" || group === "molar_3") {
				template = LOWER_MOLAR_GEOMETRY;
				rootNamesRu = ["Медиальный (M)", "Дистальный (D)"];
				rootsCount = 2;
			} else if (group === "premolar_1" || group === "premolar_2") {
				template = LOWER_PREMOLAR_GEOMETRY;
				rootNamesRu = ["Одиночный округлый корень"];
				rootsCount = 1;
			} else if (group === "canine") {
				template = LOWER_CANINE_GEOMETRY;
				rootNamesRu = ["Одиночный корень клыка"];
				rootsCount = 1;
			} else {
				template = LOWER_INCISOR_GEOMETRY;
				rootNamesRu = ["Одиночный сжатый корень"];
				rootsCount = 1;
			}
		}
	}

	return {
		fdiNumber,
		group,
		arch,
		side,
		isPediatric,
		rootsCount,
		rootNamesRu,
		crownPath: template.crown,
		rootPath: template.root,
		cejPath: template.cej,
		fissurePath: template.fissures,
		surfaces: template.surfaces,
		canals: template.canals,
		pulpChamberPath: template.pulpChamber,
		apexHalos: template.apexHalos,
		periodontal: template.periodontal,
		viewBox: template.viewBox,
		standardWidthPx: template.standardWidthPx,
		standardHeightPx: template.standardHeightPx,
		touchTargetMinPx: 44, // Sterile glove touch target safety floor
	};
}

// Connect geometry resolver for physiological resorption calculation
registerGeometryResolver(getAnatomicalToothGeometry);
