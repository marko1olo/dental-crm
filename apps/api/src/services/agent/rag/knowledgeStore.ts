/**
 * knowledgeStore.ts — Canonical Facade for Clinical Knowledge & 804n Price Grounding Store.
 */

export {
	type KnowledgeCategory,
	type KnowledgeItem,
	type KnowledgeItemInput,
	type KnowledgeSearchResult,
	type PriceGroundingResult,
	type KnowledgeSearchOptions,
	VECTOR_DIMENSION,
	DEFAULT_SIMILARITY_THRESHOLD,
	PRICE_NOT_FOUND_MESSAGE,
	computeSemanticEmbedding,
	cosineSimilarity,
	STATUTORY_804N_SEED_ITEMS,
	STATUTORY_GUARANTEE_SEED_ITEMS,
	KnowledgeStore,
	defaultKnowledgeStore,
	getKnowledgeStore,
} from "./knowledgeStoreModules/index.js";
