/**
 * apps/web/src/components/visit/clinicalCatalog/clinicalProtocolsCatalog.ts
 *
 * Единый шлюз каталога 1 142 клинических протоколов, дневников приёма и диагнозов МКБ-10.
 * Декомпозирован на модули типов, данных, патчей, поиска и матчера (Мандаты 8b, 8e, 8y).
 */

export type {
	ChunkType,
	SpecialtyCategoryKey,
	ClinicalChunk1142,
	GroupedClinicalProcedure,
	SpecialtyCategoryMeta,
	VisitNoteFieldsPatch,
	ClinicalProtocolMatchResult,
} from "./clinicalProtocolsTypes";

export {
	ALL_CLINICAL_CHUNKS_1142,
	SPECIALTY_CATEGORIES_META,
	GROUPED_CLINICAL_PROCEDURES,
} from "./clinicalProtocolsData";

export {
	appendClinicalText,
	buildProcedureVisitNotePatch,
	buildChunkVisitNotePatch,
	extractFdiToothFromText,
} from "./clinicalProtocolsPatches";

export {
	searchClinicalChunks,
	searchGroupedProcedures,
} from "./clinicalProtocolsSearch";

export {
	findBestClinicalProtocol,
} from "./clinicalProtocolsMatcher";
