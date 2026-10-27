export interface ToothStateData {
	toothNumber: number;
	status: string; // sound, caries, pulpitis, periodontitis, filled, crown, implant, missing, root, watch
	statusCode?: string | undefined; // H, C, P, Pt, П, К, И, 0, R, N
	surfaces?: string[] | undefined; // occlusal, mesial, distal, buccal, lingual
	diagnosisText?: string | undefined;
	mobilityGrade?: string | undefined;
	plannedAction?: string | undefined;
}

export interface ClinicalToothRowInput {
	toothOrArea: string;
	status?: string | undefined;
	surfaces?: string[] | undefined;
	diagnosisOrFinding?: string | undefined;
	plannedAction?: string | undefined;
}

export interface DentalFormulaRecordInput {
	teeth?: Array<Record<string, unknown>> | undefined;
	[key: string]: unknown;
}

export interface GraphicalDentalFormulaOptions {
	clinicalToothRows?:
		| Array<ClinicalToothRowInput>
		| readonly Record<string, unknown>[]
		| undefined;
	dentalFormula?: DentalFormulaRecordInput | Record<string, unknown> | undefined;
	toothStateMap?: Record<string | number, ToothStateData> | undefined;
	title?: string | undefined;
	showDeciduous?: boolean | undefined;
	compact?: boolean | undefined;
}

export interface NormalizedToothStatus {
	category: "sound" | "caries" | "pulpitis" | "periodontitis" | "filled" | "crown" | "implant" | "missing" | "root" | "watch";
	code: string;
	label: string;
	color: string;
	badgeBg: string;
	badgeFg: string;
	svgFill: string;
	svgStroke: string;
}
