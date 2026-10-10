/**
 * types.ts — Layer 0: Контракты типов и интерфейсы голосового парсера DENTE
 */

import type { ToothState, OdontogramQuadrantId } from "../../../components/odontogram/ToothChart";

export type ClinicalToothStatus =
	| "CARIES"
	| "PULPITIS"
	| "PERIODONTITIS"
	| "PERIODONTITIS_GENERAL"
	| "MISSING"
	| "RESTORATION"
	| "CROWN"
	| "IMPLANT"
	| "INLAY"
	| "HEALTHY"
	| "WEDGE_DEFECT"
	| "EROSION"
	| "FRACTURE";

export interface ToothUpdateVoiceItem {
	readonly toothNumber: number;
	readonly state: ToothState;
	readonly icd10Code: string;
	readonly icd10Title: string;
	readonly clinicalStatus: ClinicalToothStatus;
	readonly surfaces?: string[] | undefined;
	readonly subType?: string | undefined;
	readonly iropzEstimate?: number | undefined;
}

export interface AnesthesiaVoiceItem {
	readonly drugKey: string;
	readonly tradeName: string;
	readonly displayName: string;
	readonly volumeMl: number;
	readonly cartridgeCount: number;
	readonly technique: "infiltration" | "conduction" | "application" | "intraligamentary";
	readonly concentration?: string | undefined;
	readonly code804n?: string | undefined;
}

export interface Procedure804nVoiceItem {
	readonly code804n: string;
	readonly name: string;
	readonly category: "therapy" | "surgery" | "endodontics" | "hygiene" | "orthopedics" | "anesthesia" | "isolation";
	readonly quantity: number;
	readonly toothNumber?: number | undefined;
	readonly priceRub?: number | undefined;
	readonly shade?: string | undefined;
}

export interface SoapSectionsVoiceNote {
	readonly subjective?: string | undefined;
	readonly objective?: string | undefined;
	readonly assessment?: string | undefined;
	readonly plan?: string | undefined;
	readonly recommendations?: string | undefined;
}

export interface EndoCanalVoiceItem {
	readonly canalName: string;
	readonly workingLengthMm?: number | undefined;
	readonly masterApicalFile?: string | undefined;
	readonly taper?: string | undefined;
	readonly sealer?: string | undefined;
	readonly referencePoint?: string | undefined;
}

export interface PerioSiteVoiceMeasurement {
	readonly probingDepthMm?: number | undefined;
	readonly gingivalMarginMm?: number | undefined;
	readonly bleedingOnProbing?: boolean | undefined;
	readonly plaque?: boolean | undefined;
	readonly suppuration?: boolean | undefined;
	readonly calculus?: boolean | undefined;
}

export interface PerioToothVoiceItem {
	readonly toothNumber: number;
	readonly mesioBuccal?: PerioSiteVoiceMeasurement | undefined;
	readonly midBuccal?: PerioSiteVoiceMeasurement | undefined;
	readonly distoBuccal?: PerioSiteVoiceMeasurement | undefined;
	readonly mesioLingual?: PerioSiteVoiceMeasurement | undefined;
	readonly midLingual?: PerioSiteVoiceMeasurement | undefined;
	readonly distoLingual?: PerioSiteVoiceMeasurement | undefined;
	readonly mobility?: number | undefined;
	readonly furcation?: number | undefined;
	readonly bleedingOnProbing?: boolean | undefined;
	readonly isMissing?: boolean | undefined;
}

export interface CephLandmarkVoiceItem {
	readonly landmarkKey: string;
	readonly landmarkNameRu: string;
	readonly action?: "select" | "place" | "clear" | undefined;
}

export interface DentalVoiceIntent {
	readonly id: string;
	readonly timestamp: string;
	readonly rawTranscript: string;
	readonly type:
		| "odontogram_update"
		| "soap_entry"
		| "anesthesia_record"
		| "manipulation_plan"
		| "invoice_items"
		| "full_visit_batch"
		| "quadrant_switch"
		| "endo_measurement"
		| "perio_measurement"
		| "ceph_landmark";
	readonly confidence: number;
	readonly confidenceLevel: "high" | "review";
	readonly teethUpdates: readonly ToothUpdateVoiceItem[];
	readonly detectedTeeth: readonly number[];
	readonly anesthesia: AnesthesiaVoiceItem | null;
	readonly procedures804n: readonly Procedure804nVoiceItem[];
	readonly soapNotes: SoapSectionsVoiceNote;
	readonly targetQuadrant?: OdontogramQuadrantId | "all" | undefined;
	readonly endoCanalMeasurements?: readonly EndoCanalVoiceItem[] | undefined;
	readonly perioMeasurements?: readonly PerioToothVoiceItem[] | undefined;
	readonly cephLandmarks?: readonly CephLandmarkVoiceItem[] | undefined;
	readonly summary: string;
}

export interface DiagnosisRule {
	readonly code: string;
	readonly title: string;
	readonly status: ClinicalToothStatus;
	readonly toothChartState: ToothState;
	readonly patterns: readonly string[];
	readonly confidence: number;
}

export interface AnestheticDrugConfig {
	readonly drugKey: string;
	readonly tradeName: string;
	readonly displayName: string;
	readonly defaultVolumeMl: number;
	readonly concentration: string;
	readonly patterns: readonly string[];
}

export interface ManipulationRule {
	readonly code804n: string;
	readonly name: string;
	readonly category: "therapy" | "surgery" | "endodontics" | "hygiene" | "orthopedics" | "anesthesia" | "isolation";
	readonly priceRub: number;
	readonly patterns: readonly string[];
}
