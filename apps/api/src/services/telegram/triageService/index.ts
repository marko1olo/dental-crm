/**
 * triageService/index.ts
 *
 * Layer 5: Public Barrel export for Telegram Interactive Triage domain.
 * Preserves 100% backward compatibility for all 11 baseline exports.
 */

// Layer 0: Types & DTO contracts
export type {
	CariesPreset,
	CrownTypePreset,
	EnableHumanModeParams,
	HandleCallbackQueryParams,
	HandleCallbackQueryResult,
	HandlePhotoIntakeParams,
	HandlePhotoIntakeResult,
	ImplantSystemPreset,
	TelegramInlineButton,
	TelegramInlineKeyboard,
	TreatmentCostOption,
	TriageScreenResult,
	WhiteningPreset,
} from "./types.js";

// Layer 0: Presets
export {
	CARIES_PRESETS,
	CROWN_PRESETS,
	IMPLANT_PRESETS,
	WHITENING_PRESETS,
	findCariesPreset,
	findCrownPreset,
	findImplantPreset,
	findWhiteningPreset,
} from "./presets.js";

// Layer 1: Keyboard Builders
export {
	buildAestheticColorKeyboard,
	buildAestheticKeyboard,
	buildAestheticOrthoKeyboard,
	buildAestheticVeneersKeyboard,
	buildBrokenToothKeyboard,
	buildBrokenToothPainKeyboard,
	buildBrokenToothPhotoHintKeyboard,
	buildBrokenToothSharpKeyboard,
	buildCalculatorRootKeyboard,
	buildCariesCalculatorKeyboard,
	buildCitoBookKeyboard,
	buildCrownCalculatorKeyboard,
	buildEmergencyKeyboard,
	buildGeneralLockSuccessKeyboard,
	buildGumsKeyboard,
	buildHumanTakeoverKeyboard,
	buildImplantCrownSelectionKeyboard,
	buildImplantLockSuccessKeyboard,
	buildImplantResultKeyboard,
	buildImplantSelectionKeyboard,
	buildKidsKeyboard,
	buildPhotoIntakeFailedKeyboard,
	buildPhotoIntakeSuccessKeyboard,
	buildRootTriageKeyboard,
	buildWhiteningCalculatorKeyboard,
} from "./triageKeyboardBuilder.js";

// Layer 2: Cost Calculator & Screen Presenters
export {
	calculateImplantBudget,
	formatRubles,
	getCariesOption,
	getCrownOption,
	getWhiteningOption,
	type ImplantBudgetResult,
} from "./triageCostCalculator.js";

export {
	presentAestheticScreen,
	presentBrokenToothPhotoHintScreen,
	presentBrokenToothScreen,
	presentCalculatorRootScreen,
	presentCariesCalculatorScreen,
	presentCitoBookScreen,
	presentCrownCalculatorScreen,
	presentEmergencyScreen,
	presentGeneralLockSuccessScreen,
	presentGumsScreen,
	presentHumanTakeoverScreen,
	presentImplantCrownSelectionScreen,
	presentImplantLockSuccessScreen,
	presentImplantResultScreen,
	presentImplantSystemSelectionScreen,
	presentKidsScreen,
	presentPhotoIntakeErrorScreen,
	presentPhotoIntakeSuccessScreen,
	presentRootTriageScreen,
	presentWhiteningCalculatorScreen,
} from "./triageScreenPresenter.js";

// Layer 3: Main Service Class
export { TelegramInteractiveTriageService } from "./triageServiceClass.js";
