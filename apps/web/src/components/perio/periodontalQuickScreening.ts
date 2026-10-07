/**
 * periodontalQuickScreening.ts — Модуль экспресс-скрининга пародонта (PSR / CPITN)
 * и регламентных клинических протоколов Формы 043/у.
 *
 * Клинические стандарты:
 * - Скрининг пародонта PSR / CPITN (ВОЗ / СтАР) по 6 секстантам
 * - Фиксация физиологической нормы пародонта и профильных патологий
 * - Мандат 8e (Автономия врача): мгновенная фиксация клинического статуса
 * - Мандат 8b: строго <= 800 строк
 * - 0% эмодзи, отсутствие dev-жаргона
 */

export {
	applyGingivitisPreset,
	applyHealthyPeriodontiumPreset,
	applyPeriodontitisMildPreset,
	applyPeriodontitisModeratePreset,
	applyPeriodontitisSeverePreset,
	applyPsrSextantCode,
	createDefaultPerioTeeth,
	generatePsrDiaryProtocol,
	getPsrMaxCode,
	hasPsrAsterisk,
	PERIO_EXPRESS_PRESETS,
	PSR_CODE_DEFINITIONS,
	type PerioExpressPreset,
	type PerioExpressPresetId,
	type PsrCode,
	type PsrCodeDefinition,
} from "./perioMath";

export { generateComprehensivePerio043Text } from "@dental/shared";

export {
	applyExpressPerioPreset,
	applyTherapistPathologyPreset,
	dispatchPresetSideEffects,
	generatePerioProtocolText,
	type PresetApplyResult,
} from "./chart/perioPresets";
