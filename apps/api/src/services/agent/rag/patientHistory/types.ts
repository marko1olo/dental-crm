/**
 * types.ts — Layer 0 Domain Types & Interfaces for Patient History RAG Memory.
 * 
 * Contains types for vector embeddings, clinical memory chunks, query intents,
 * search results, and Copilot prompt contexts. Zero runtime dependencies.
 */

export type MemoryChunkCategory =
	| "visit_diary_043u"
	| "diagnosis_icd10"
	| "allergy_anamnesis"
	| "imaging_xray"
	| "odontogram_tooth_state"
	| "treatment_item"
	| "complication_event";

export interface PatientHistoryMemoryChunk {
	readonly id: string;
	readonly patientId: string;
	readonly organizationId: string;
	readonly category: MemoryChunkCategory;
	readonly date: string; // ISO 8601 string
	readonly toothNumber?: number | undefined;
	readonly toothCodes?: string[] | undefined;
	readonly doctorUserId?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly visitId?: string | undefined;
	readonly diagnosisCode?: string | undefined;
	readonly diagnosisTitle?: string | undefined;
	readonly materials?: string[] | undefined;
	readonly anesthesia?: string | undefined;
	readonly complications?: string | undefined;
	readonly summary: string;
	readonly rawContent: string;
	readonly keywords: string[];
	readonly vector: number[];
	readonly metadata?: Record<string, unknown> | undefined;
}

export type QueryIntent =
	| "tooth_treatment_history"
	| "anesthesia_complications"
	| "allergy_check"
	| "imaging_search"
	| "materials_used"
	| "general_clinical_query";

export interface ParsedClinicalQuery {
	readonly rawQuery: string;
	readonly intent: QueryIntent;
	readonly extractedTeeth: number[];
	readonly extractedDiagnoses: string[];
	readonly extractedKeywords: string[];
	readonly targetYear?: number | undefined;
	readonly targetCategory?: MemoryChunkCategory | undefined;
}

export interface MemoryMatchResult {
	readonly chunkId: string;
	readonly category: MemoryChunkCategory;
	readonly score: number; // 0.0 – 1.0
	readonly relevance: "high" | "medium" | "low";
	readonly visitDate: string;
	readonly toothNumber?: number | undefined;
	readonly doctorFullName?: string | undefined;
	readonly diagnosis?: {
		readonly code?: string | undefined;
		readonly title?: string | undefined;
	} | undefined;
	readonly materials?: string[] | undefined;
	readonly anesthesia?: string | undefined;
	readonly complications?: string | undefined;
	readonly summary: string;
	readonly highlights: string[];
}

export interface PatientHistorySearchResult {
	readonly patientId: string;
	readonly query: string;
	readonly parsedQuery: ParsedClinicalQuery;
	readonly totalRecordsScanned: number;
	readonly matchesCount: number;
	readonly matches: MemoryMatchResult[];
	readonly synthesizedAnswerRu: string;
}

export interface BuildPatientIndexOptions {
	readonly maxAgeYears?: number | undefined; // default: 5 years
	readonly includeAllergies?: boolean | undefined; // default: true
	readonly includeImaging?: boolean | undefined; // default: true
	readonly includeOdontogram?: boolean | undefined; // default: true
	readonly includeTreatmentItems?: boolean | undefined; // default: true
}

export interface SearchPatientHistoryOptions {
	// biome-ignore lint/suspicious/noExplicitAny: Optional Drizzle client
	readonly db?: any;
	readonly organizationId: string;
	readonly patientId: string;
	readonly query: string;
	readonly topK?: number | undefined;
	readonly maxAgeYears?: number | undefined;
	readonly toothFilter?: number | undefined;
	readonly categoryFilter?: MemoryChunkCategory[] | undefined;
	readonly preloadedChunks?: PatientHistoryMemoryChunk[] | undefined;
}

export interface ClinicalRagPromptOptions {
	readonly maxTokens?: number | undefined;
	readonly sanitizePii?: boolean | undefined;
	readonly includeMetadata?: boolean | undefined;
}
