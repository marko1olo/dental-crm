/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION & AUTOCLAVE LOGBOOK MODULE
 * Экспорт компонентов учета стерилизации, журналов 257/у и 366/у,
 * химических индикаторов 4-5 классов и 1-кликовой привязки к форме 043/у.
 * ============================================================================
 */

export * from "./KraftPackageQuickScanner";
export * from "./SterilizationStudioModal";

// Re-exports from SanPiN autoclave and kraft domains
export { AutoclaveRegisterTab } from "../sanpin/AutoclaveRegisterTab";
export { PsoRegisterTab } from "../sanpin/PsoRegisterTab";
export { SanpinCycleModal } from "../sanpin/SanpinCycleModal";
export { KraftPackageBarcodeModal } from "../sanpin/kraft/KraftPackageBarcodeModal";
export { SeniorNurseKraftUnsealModal } from "../sanpin/kraft/SeniorNurseKraftUnsealModal";
export { AutoclaveLog257Modal } from "../sanpin/autoclaveLog/AutoclaveLog257Modal";
export {
	format043SterilizationRecord,
	parseAndValidateKraftBarcode,
	attachKraftPackageTo043Diary,
	type ParsedKraftBarcode,
} from "@dental/shared";
