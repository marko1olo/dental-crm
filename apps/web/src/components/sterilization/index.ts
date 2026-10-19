/**
 * ============================================================================
 * STERILIZATION & AUTOCLAVE LOGBOOK MODULE (DENTE Apple HIG)
 * Компоненты учета стерилизации, журналы работы стерилизаторов,
 * химические индикаторы 5 класса и 1-кликовые пресеты автоклавирования.
 * ============================================================================
 */

export * from "./sterilizationPresets";
export * from "./SterilizationCycleDrawer";
export * from "./SterilizationJournalTable";

// Re-exports from SanPiN autoclave and kraft domains
export { AutoclaveRegisterTab } from "../sanpin/AutoclaveRegisterTab";
export { PsoRegisterTab } from "../sanpin/PsoRegisterTab";
export { KraftPackageBarcodeModal } from "../sanpin/kraft/KraftPackageBarcodeModal";
export { SeniorNurseKraftUnsealModal } from "../sanpin/kraft/SeniorNurseKraftUnsealModal";
export { AutoclaveLog257Modal } from "../sanpin/autoclaveLog/AutoclaveLog257Modal";
export { SanPinSterilizationJournal } from "../sanpin/SanPinSterilizationJournal";
export {
	format043SterilizationRecord,
	parseAndValidateKraftBarcode,
	attachKraftPackageTo043Diary,
	type ParsedKraftBarcode,
	type ChairsidePouchRecord,
	type ChemicalIndicatorClass,
	type IndicatorColorTransitionId,
	type IndicatorColorTransitionDef,
	type ChairsideAutoclaveParams,
	type ChairsideIndicatorState,
	type Form257LinkRef,
	type ChairsideTrayKind,
	type ChairsideTrayPreset,
	type CreateChairsidePouchOptions,
	STATUTORY_INDICATOR_TRANSITIONS,
	DEFAULT_CHAIRSIDE_AUTOCLAVE_PARAMS,
	DEFAULT_CHAIRSIDE_INDICATOR_STATE,
	CHAIRSIDE_TRAY_PRESETS,
	generateChairsidePouchCode,
	normalizeChairsidePouchCode,
	parseChairsidePouchInput,
	createForm257Link,
	formatPouch043StatutorySnippet,
	formatPouch043FullDiaryText,
	insertPouchIntoDiaryText,
	createChairsidePouchRecord,
	exportChairsidePouchToForm257Record,
} from "@dental/shared";
