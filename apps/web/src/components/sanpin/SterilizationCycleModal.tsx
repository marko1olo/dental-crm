/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION CYCLE REGISTRATION MODAL (FORM № 257/U)
 * Canonical modular facade delegating to sterilizationModules/ hierarchy:
 * - sterilizationCycleTypes.ts (типы режимов, индикаторы, крафт-пакеты)
 * - CycleParametersForm.tsx (параметры цикла автоклавирования)
 * - PouchBarcodeScanner.tsx (крафт-пакеты, штрихкоды, оператор)
 * - CycleChemicalIndicatorSelect.tsx (индикаторы 5 класса, ПСО азопирам/фенолфталеин)
 * ============================================================================
 */

export type {
	SterilizationCycleModalMode,
	SterilizerCategory,
	SterilizationRegimeOption,
	PackagingShelfLifePreset,
	ChamberPointState,
	SteamPenetrationTestType,
	SteamPenetrationTestOption,
	SterilizationCycleModalProps,
} from "./sterilizationModules/sterilizationCycleTypes";

export {
	STATUTORY_REGIMES_OPTIONS,
	STATUTORY_PACKAGING_PRESETS,
	INITIAL_5_POINTS,
	STEAM_PENETRATION_TEST_OPTIONS,
} from "./sterilizationModules/sterilizationCycleTypes";

import { SterilizationCycleModal } from "./sterilizationModules/SterilizationCycleModal";
export { SterilizationCycleModal };
export default SterilizationCycleModal;
