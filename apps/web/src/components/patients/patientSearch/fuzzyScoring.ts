/**
 * fuzzyScoring.ts — Фасад нечеткого сопоставления токенов, расчета скоринга и подсветки совпадений.
 * Декомпозирован по Мандату 8b (Layer 5: Тонкий фасад <= 120 строк).
 */

export { fuzzyMatchToken } from "./tokenMatcher";
export { isFuzzyNameMatch } from "./fuzzyNameMatcher";
export { matchesPatientSearch, scorePatientSearch } from "./patientScorer";
export { highlightSearchMatches } from "./searchHighlighter";
