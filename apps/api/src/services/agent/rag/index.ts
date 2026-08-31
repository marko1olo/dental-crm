/**
 * rag/index.ts — Clinical Knowledge & EHR Semantic Memory Subsystem Exports.
 */

export * from "./embeddingService.js";
export {
	DEFAULT_SIMILARITY_THRESHOLD,
	KnowledgeStore,
	PRICE_NOT_FOUND_MESSAGE,
	STATUTORY_804N_SEED_ITEMS,
	STATUTORY_GUARANTEE_SEED_ITEMS,
	computeSemanticEmbedding,
	defaultKnowledgeStore,
	getKnowledgeStore,
	type KnowledgeCategory,
	type KnowledgeItem,
	type KnowledgeItemInput,
	type KnowledgeSearchOptions,
	type KnowledgeSearchResult,
	type PriceGroundingResult,
} from "./knowledgeStore.js";
export {
	type MemoryChunkCategory,
	type PatientHistoryMemoryChunk,
	type QueryIntent,
	type ParsedClinicalQuery,
	type MemoryMatchResult,
	type PatientHistorySearchResult,
	type BuildPatientIndexOptions,
	type SearchPatientHistoryOptions,
	stemRussianDentalWord,
	extractNormalizedKeywords,
	extractFdiTeethFromText,
	computeDenseEmbeddingVector,
	parseClinicalHistoryQuery,
	buildPatientHistoryMemoryIndex,
	searchPatientHistoryMemory,
	searchPatientHistoryTool,
} from "./patientHistoryMemory.js";
