import type {
	BuildPatientIndexOptions,
	MemoryMatchResult,
	ParsedClinicalQuery,
	PatientHistoryMemoryChunk,
} from "../types.js";

export interface RankedHistorySearchPayload {
	readonly parsedQuery: ParsedClinicalQuery;
	readonly chunks: PatientHistoryMemoryChunk[];
	readonly topMatches: MemoryMatchResult[];
}

export interface HistoryFetcherContext {
	// biome-ignore lint/suspicious/noExplicitAny: Drizzle client
	readonly db: any;
	readonly organizationId: string;
	readonly patientId: string;
	readonly cutoffDate: Date;
	readonly doctorNameById: Map<string, string>;
	readonly options: BuildPatientIndexOptions;
	readonly visitDateById: Map<string, Date>;
}
