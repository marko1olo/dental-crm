/**
 * egiszJournalData.ts — Thin facade for REMD Journal data, types, and mappers.
 * Mandate 8b compliant (<= 120 lines). Decomposed into ./journalData/
 */

export type {
	RemdDocumentStatus,
	RemdValidationError,
	RemdRegistrationInfo,
	RemdDocumentRecord,
} from "./journalData/journalDataTypes";

export { SAMPLE_REMD_JOURNAL_RECORDS } from "./journalData/journalDataTypes";
export { mapOutboxRowToRemdRecord } from "./journalData/outboxRowMapper";
export { createFixtureRemdRecord } from "./journalData/journalDataFixtures";
