/**
 * apps/web/src/components/visit/clinicalCatalog/clinicalProtocolsTypes.ts
 *
 * Базовые типы каталога клинических протоколов и дневников приёма (Мандаты 8e, 8y).
 */

export type ChunkType =
	| "complaints"
	| "anamnesis"
	| "objective"
	| "treatment"
	| "recommendations"
	| "full"
	| "diagnosis"
	| "other";

export type SpecialtyCategoryKey =
	| "all"
	| "therapy"
	| "surgery"
	| "orthopedics"
	| "pediatric"
	| "hygiene"
	| "bleaching"
	| "periodontics"
	| "icd10"
	| "comprehensive";

export interface ClinicalChunk1142 {
	readonly id: number;
	readonly name: string;
	readonly categoryName: string;
	readonly categoryKey: SpecialtyCategoryKey;
	readonly categoryId: number;
	readonly chunkType: ChunkType;
	readonly procedureName: string;
	readonly text: string;
	readonly icd10?: string;
}

export interface GroupedClinicalProcedure {
	readonly id: string;
	readonly procedureName: string;
	readonly categoryKey: SpecialtyCategoryKey;
	readonly categoryName: string;
	readonly complaints?: ClinicalChunk1142 | undefined;
	readonly anamnesis?: ClinicalChunk1142 | undefined;
	readonly objective?: ClinicalChunk1142 | undefined;
	readonly treatment?: ClinicalChunk1142 | undefined;
	readonly recommendations?: ClinicalChunk1142 | undefined;
	readonly fullTemplate?: ClinicalChunk1142 | undefined;
	readonly matchedIcd10?: string | undefined;
	readonly totalChunks: number;
}

export interface SpecialtyCategoryMeta {
	readonly key: SpecialtyCategoryKey;
	readonly label: string;
	readonly shortLabel: string;
	readonly count: number;
}

export interface VisitNoteFieldsPatch {
	complaint?: string;
	anamnesis?: string;
	objectiveStatus?: string;
	treatmentPlan?: string;
	recommendations?: string;
	diagnosis?: string;
}

export interface ClinicalProtocolMatchResult {
	readonly procedure: GroupedClinicalProcedure;
	readonly procedureId: string;
	readonly procedureName: string;
	readonly categoryKey: SpecialtyCategoryKey;
	readonly categoryName: string;
	readonly score: number;
	readonly targetTooth: number | null;
	readonly tooth: number | null;
	readonly specialtyKey: SpecialtyCategoryKey;
	readonly matchedIcd10?: string | undefined;
	readonly patch: VisitNoteFieldsPatch;
	readonly recommendedToothState: "treatment" | "done" | "missing" | "idle";
	readonly alternatives: readonly GroupedClinicalProcedure[];
}
