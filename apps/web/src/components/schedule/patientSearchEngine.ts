/**
 * patientSearchEngine.ts — Fast live patient search with phone fragment, name tokenization,
 * fuzzy Levenshtein scoring, match highlighting, and 150ms debounce scoring for Reception and Schedule.
 */

import type {
	QuickPatientPrefill,
} from "./patientSearchEngine/searchEngineTypes";
import { parseSearchQueryForQuickPatient as parseSearchQueryImpl } from "./patientSearchEngine/quickPatientPrefill";

export type {
	SearchablePatient,
	SearchMatchHighlightPart,
	PatientSearchResultItem,
	FindPotentialDuplicatesCriteria,
	PotentialDuplicateItem,
	PatientWithSearchableData,
} from "./patientSearchEngine/searchEngineTypes";

export interface QuickPatientPrefill {
	readonly fullName: string;
	readonly phone: string;
}

export { highlightSearchMatches } from "./patientSearchEngine/searchMatchHighlighter";
export { searchPatientsQuick } from "./patientSearchEngine/patientQuickSearcher";
export { findPotentialDuplicates } from "./patientSearchEngine/patientDuplicateFinder";

export function parseSearchQueryForQuickPatient(rawQuery: string): QuickPatientPrefill {
	return parseSearchQueryImpl(rawQuery);
}
