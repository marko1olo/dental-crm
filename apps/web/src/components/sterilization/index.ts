/**
 * ============================================================================
 * STERILIZATION & AUTOCLAVE LOGBOOK MODULE (DENTE Apple HIG)
 * Компоненты учета стерилизации, журналы работы стерилизаторов,
 * химические индикаторы 5 класса и 1-кликовые пресеты автоклавирования.
 * ============================================================================
 */

export {
	attachKraftPackageTo043Diary,
	CHAIRSIDE_TRAY_PRESETS,
	type ChairsideAutoclaveParams,
	type ChairsideIndicatorState,
	type ChairsidePouchRecord,
	type ChairsideTrayKind,
	type ChairsideTrayPreset,
	type ChemicalIndicatorClass,
	type CreateChairsidePouchOptions,
	createChairsidePouchRecord,
	createForm257Link,
	DEFAULT_CHAIRSIDE_AUTOCLAVE_PARAMS,
	DEFAULT_CHAIRSIDE_INDICATOR_STATE,
	exportChairsidePouchToForm257Record,
	type Form257LinkRef,
	format043SterilizationRecord,
	formatPouch043FullDiaryText,
	formatPouch043StatutorySnippet,
	generateChairsidePouchCode,
	type IndicatorColorTransitionDef,
	type IndicatorColorTransitionId,
	insertPouchIntoDiaryText,
	normalizeChairsidePouchCode,
	type ParsedKraftBarcode,
	parseAndValidateKraftBarcode,
	parseChairsidePouchInput,
	STATUTORY_INDICATOR_TRANSITIONS,
} from "@dental/shared";
// Re-exports from SanPiN autoclave and kraft domains
export { AutoclaveRegisterTab } from "../sanpin/AutoclaveRegisterTab";
export { AutoclaveLog257Modal } from "../sanpin/autoclaveLog/AutoclaveLog257Modal";
export { KraftPackageBarcodeModal } from "../sanpin/kraft/KraftPackageBarcodeModal";
export { PsoRegisterTab } from "../sanpin/PsoRegisterTab";
export { SanPinSterilizationJournal } from "../sanpin/SanPinSterilizationJournal";
export * from "../sanpin/sterilization/SterilizationCycleDrawer";
export * from "../sanpin/sterilization/SterilizationJournalTable";
export * from "../sanpin/sterilization/sterilizationPresets";
