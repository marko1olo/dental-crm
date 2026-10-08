/**
 * patientHistoryMemory.ts — Canonical Facade for Patient History EHR Semantic Memory Engine.
 *
 * Implements:
 * 1. Vectorization and semantic indexing of 043/u outpatient diary records,
 *    ICD-10 diagnoses, drug allergy anamnesis, radiograph/imaging studies,
 *    odontogram/tooth state change histories, and treatment items.
 * 2. High-performance hybrid semantic vectorizer & BM25 ranker with Russian
 *    dental morphology, full FDI tooth case inflection parsing (11–48, 51–85),
 *    and temporal filtering.
 * 3. Agent Tool `clinical.search_patient_history`:
 *    - Semantic search across 5-year patient history.
 *    - Returns exact visit dates, FDI tooth numbers, materials used, doctor full names, and clinical synthesis.
 *
 * Decomposed into modular DAG layers under './patientHistory/':
 * - types.ts (Layer 0 Types & Contracts)
 * - constants.ts (Layer 0 Constants & Dictionaries)
 * - patientDataSanitizer.ts (Layer 1 152-FZ PII Sanitizer)
 * - embeddingPipeline.ts (Layer 1 Dense Embeddings & Query Parser)
 * - historyRetriever.ts (Layer 2 Chronology Retriever & Vector Indexer)
 * - clinicalPromptBuilder.ts (Layer 2 Clinical Context Synthesis & Agent Tool)
 * - index.ts (Layer 5 Master Barrel)
 */

export type * from "./patientHistory/types.js";
export * from "./patientHistory/constants.js";
export * from "./patientHistory/patientDataSanitizer.js";
export * from "./patientHistory/embeddingPipeline.js";
export * from "./patientHistory/historyRetriever.js";
export * from "./patientHistory/clinicalPromptBuilder.js";
export { cosineSimilarity } from "./embeddingService.js";
