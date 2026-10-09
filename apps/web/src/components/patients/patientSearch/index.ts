/**
 * index.ts — Layer 5: Master Barrel для подсистемы нечеткого поиска, выявления дубликатов и слияния.
 * Реэкспортирует все публичные интерфейсы и функции.
 */

// Layer 0: Типы и контракты
export type {
	PatientSearchableFields,
	PatientSearchScoredResult,
	SearchMatchHighlightPart,
	PatientSearchResultItem,
	FindPotentialDuplicatesCriteria,
	PotentialDuplicateItem,
	MergedPatientResult,
} from "./types";

// Layer 0: Нормализаторы строк и телефонов
export {
	normalizePhoneToNational,
	normalizePhoneE164,
	transliterateLatinToCyrillic,
	convertKeyboardMistype,
	normalizeCyrillicText,
} from "./stringNormalizers";

// Layer 1: Нечеткое сопоставление и скоринг
export {
	fuzzyMatchToken,
	isFuzzyNameMatch,
	scorePatientSearch,
	matchesPatientSearch,
	highlightSearchMatches,
} from "./fuzzyScoring";

// Layer 2: Поисковый движок и экстракторы номеров
export {
	extractPatientCardNumbers,
	extractPatientPhones,
	normalizeCardQuery,
	searchPatientsQuick,
} from "./patientSearchEngine";

// Layer 2: Детекция дубликатов и слияние
export {
	findPotentialDuplicates,
	mergePatientRecordsNonDestructive,
} from "./duplicateDetector";
