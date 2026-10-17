/**
 * DENTE Dental CRM — Anatomical Pediatric Geometries Facade
 * Compliant with Mandate 8b (<= 120 lines).
 */

export {
	PEDIATRIC_UPPER_MOLAR_GEOMETRY,
	PEDIATRIC_LOWER_MOLAR_GEOMETRY,
} from "./anatomicalPediatric/pediatricMolarGeometries";

export {
	registerGeometryResolver,
} from "./anatomicalPediatric/resorptionGeometryResolver";

export {
	getPhysiologicalRootResorptionGeometry,
} from "./anatomicalPediatric/resorptionDispatch";

export {
	PEDIATRIC_UPPER_TEETH,
	PEDIATRIC_LOWER_TEETH,
	MIXED_UPPER_TEETH,
	MIXED_LOWER_TEETH,
} from "./anatomicalPediatric/pediatricTeethConstants";
