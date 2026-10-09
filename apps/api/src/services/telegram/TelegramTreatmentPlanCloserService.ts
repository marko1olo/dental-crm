import * as closer from "./planCloser/index.js";

export type {
	BankInstallmentOption,
	CloserCallbackParams,
	CloserCallbackResult,
	CloserScreenResult,
	CreateCuratorCallInput,
	CreateInstallmentLeadInput,
	PendingTreatmentPlanSummary,
	TelegramInlineButton,
	TelegramInlineKeyboard,
	TreatmentPlanStageInfo,
} from "./planCloser/types.js";

export {
	formatRub,
	sanitizePlanTitleForMessenger,
} from "./planCloser/planMessagePresenter.js";

export { BANK_PROVIDERS } from "./planCloser/constants.js";

export class TelegramTreatmentPlanCloserService {
	static calculateInstallmentOption = closer.calculateInstallmentOption;
	static calculateAllInstallmentOptions = closer.calculateAllInstallmentOptions;
	static buildDefaultStages = closer.buildDefaultStages;
	static parseTeethNumbers = closer.parseTeethNumbers;
	static getPlanCloserRootScreen = closer.getPlanCloserRootScreen;
	static getPlanStagesScreen = closer.getPlanStagesScreen;
	static getInstallmentCalcScreen = closer.getInstallmentCalcScreen;
	static getInstallmentSubmittedScreen = closer.getInstallmentSubmittedScreen;
	static getObjectionsRootScreen = closer.getObjectionsRootScreen;
	static getObjectionFearScreen = closer.getObjectionFearScreen;
	static getObjectionCostScreen = closer.getObjectionCostScreen;
	static getObjectionFamilyScreen = closer.getObjectionFamilyScreen;
	static getObjectionDelayScreen = closer.getObjectionDelayScreen;
	static getCuratorCallBookedScreen = closer.getCuratorCallBookedScreen;
	static getPendingTreatmentPlansForPatient = closer.getPendingTreatmentPlansForPatient;
	static getPendingPlanById = closer.getPendingPlanById;
	static getSyntheticFallbackPlan = closer.getSyntheticFallbackPlan;
	static createInstallmentLead = closer.createInstallmentLead;
	static createCuratorCallRequest = closer.createCuratorCallRequest;
	static findFollowUpCandidates = closer.findFollowUpCandidates;
	static sendPlanFollowUpMessage = closer.sendPlanFollowUpMessage;
	static handleCallbackQuery = closer.handleCallbackQuery;
}
