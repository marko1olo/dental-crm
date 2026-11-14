/**
 * patientSearchEngine.ts — Fast live patient search with phone fragment, name tokenization,
 * fuzzy Levenshtein scoring, match highlighting, and 150ms debounce scoring for Reception and Schedule.
 */

import { parseSearchQueryForQuickPatient as parseSearchQueryImpl } from "./patientSearchEngine/quickPatientPrefill";
import type { QuickPatientPrefill } from "./patientSearchEngine/searchEngineTypes";

export interface QuickPatientPrefill {
	fullName: string;
	phone: string;
}

export type {
	SearchablePatient,
	SearchMatchHighlightPart,
	PatientSearchResultItem,
	FindPotentialDuplicatesCriteria,
	PotentialDuplicateItem,
	PatientWithSearchableData,
} from "./patientSearchEngine/searchEngineTypes";

export type QuickPatientSearchResult = import("./patientSearchEngine/searchEngineTypes").PatientSearchResultItem;

export { highlightSearchMatches } from "./patientSearchEngine/searchMatchHighlighter";
export { searchPatientsQuick } from "./patientSearchEngine/patientQuickSearcher";
export { findPotentialDuplicates } from "./patientSearchEngine/patientDuplicateFinder";

export function parseSearchQueryForQuickPatient(rawQuery: string): QuickPatientPrefill {
	return parseSearchQueryImpl(rawQuery);
}
