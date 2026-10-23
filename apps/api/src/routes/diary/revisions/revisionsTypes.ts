export type ReviseTxResult =
	| { kind: "not_found" }
	| { kind: "not_locked" }
	| { kind: "forbidden" }
	| { kind: "invalid_tray" }
	| { kind: "update_lost" }
	| { kind: "ok"; hash: string; revisionCount: number };

export interface ReviseInputData {
	anamnesis?: string | undefined;
	statusLocalis?: string | undefined;
	diagnosisIcd10?: string | undefined;
	diagnosisTooth?: string | undefined;
	treatmentDescription?: string | undefined;
	complications?: string | undefined;
	comorbidities?: string | undefined;
	instrumentTrayBarcode?: string | undefined;
	revisionReason?: string | undefined;
}
