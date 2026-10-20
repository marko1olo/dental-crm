/**
 * toothSpeechParser.ts — Распознавание номеров зубов (FDI/ISO) и поверхностей зуба из русской речи.
 *
 * Каноническая реализация сведена в единый SSOT (@dental/shared / packages/shared/src/ai/toothGrammarSsot.ts).
 * Обеспечивает 100% обратную совместимость и устраняет рассинхрон между бэкендом и фронтендом.
 *
 * Соответствие:
 * - Мандат 8s: Универсальный запрет смысловых дубликатов (SSOT).
 * - Мандат 8c: Zero Mocks / Честное распознавание речи врача.
 */

export {
	VALID_FDI_PERMANENT_TEETH,
	VALID_FDI_PRIMARY_TEETH,
	ALL_VALID_FDI_TEETH,
	TEEN_NUMBER_WORDS,
	TENS_WORDS,
	ONES_WORDS,
	TOOTH_ANATOMICAL_POSITIONS,
	isValidFdiToothNumber,
	parseRussianSpokenToothNumber,
	extractFdiTeethNumbers,
	extractToothSurfaces,
} from "@dental/shared";
