/**
 * DENTE CRM — Cephalometric Analysis Type Contracts (Layer 0)
 * Lateral cephalometric landmarks, measurements, and diagnosis data structures.
 */

export interface Point2D {
	x: number;
	y: number;
}

export type LandmarkKey =
	| "S" // Sella (Турецкое седло)
	| "N" // Nasion (Назион)
	| "Or" // Orbitale (Орбитале)
	| "Po" // Porion (Порион)
	| "ANS" // Anterior Nasal Spine (ПНС / Передняя носовая ость)
	| "PNS" // Posterior Nasal Spine (ЗНС / Задняя носовая ость)
	| "A" // Subspinale / Point A (Точка А)
	| "B" // Supramentale / Point B (Точка В)
	| "Pog" // Pogonion (Погонион)
	| "Gn" // Gnathion (Гнатион)
	| "Me" // Menton (Ментон)
	| "Go" // Gonion (Гонион)
	| "U1t" // Upper Incisor Tip (Режущий край 1.1/2.1)
	| "U1a" // Upper Incisor Apex (Верхушка корня 1.1/2.1)
	| "L1t" // Lower Incisor Tip (Режущий край 4.1/3.1)
	| "L1a"; // Lower Incisor Apex (Верхушка корня 4.1/3.1)

export interface LandmarkDefinition {
	key: LandmarkKey;
	code: string;
	nameRu: string;
	latinName: string;
	anatomicalDescription: string;
	category: "cranial" | "maxillary" | "mandibular" | "dental";
	color: string;
}

export type LandmarkMap = Partial<Record<LandmarkKey, Point2D>>;

export interface CephalometricMeasurement {
	id: string;
	name: string;
	symbol: string;
	category: "sagittal" | "vertical" | "dental" | "linear";
	value: number | null;
	unit: "°" | "mm" | "%";
	normMin: number;
	normMax: number;
	normMean: number;
	normText: string;
	status: "normal" | "increased" | "decreased" | "pending";
	clinicalInterpretation: string;
	method: "Steiner" | "Tweed" | "Ricketts" | "Jacobson" | "Downs" | "McNamara";
}

export interface CephalometricDiagnosis {
	skeletalClass: "Class I" | "Class II" | "Class III" | "Undefined";
	skeletalClassRu: string;
	maxillaryPosition: "Normal" | "Prognathism" | "Retrognathism" | "Undefined";
	maxillaryPositionRu: string;
	mandibularPosition: "Normal" | "Prognathism" | "Retrognathism" | "Undefined";
	mandibularPositionRu: string;
	growthPattern: "Mesofacial" | "Dolichofacial (Hyperdivergent)" | "Brachyfacial (Hypodivergent)" | "Undefined";
	growthPatternRu: string;
	upperIncisorInclination: "Normal" | "Proclination" | "Retroclination" | "Undefined";
	upperIncisorInclinationRu: string;
	lowerIncisorInclination: "Normal" | "Proclination" | "Retroclination" | "Undefined";
	lowerIncisorInclinationRu: string;
	witsRelationshipRu: string;
	downsConvexityRu: string;
	mcnamaraRelationshipRu: string;
	u1NaRelationshipRu: string;
	l1NbRelationshipRu: string;
	summaryRu: string;
	protocol043Text: string;
}

export interface CephalometricAnalysisResult {
	measurements: CephalometricMeasurement[];
	diagnosis: CephalometricDiagnosis;
	landmarks: LandmarkMap;
	scaleMmPerPixel: number;
	isComplete: boolean;
	placedCount: number;
	totalCount: number;
	completionPercentage: number;
}
