/**
 * index.ts
 *
 * Layer 5: Barrel export for all Telegram referral, family profiles,
 * and loyalty modules. Preserves 100% public API parity.
 */

export type {
	TelegramWebAppUser,
	TelegramWebAppValidationResult,
	ReferralRewardConfig,
	ReferralStartResult,
	FamilyMemberItem,
	FamilyProfileResult,
	ChurnCandidateItem,
	NpsFeedbackInput,
	NpsFeedbackResult,
	ToothComplaintInput,
	WebAppBookingInput,
} from "./types.js";

export { DEFAULT_REFERRAL_CONFIG } from "./types.js";

export {
	isDbConnectionError,
	validateTelegramWebAppData,
	generateReferralLink,
} from "./webAppValidator.js";

export {
	getFamilyProfile,
	confirmFamilyAppointment,
	findChurnCandidates,
} from "./familyAndChurnManager.js";

export {
	awardBonusPoints,
	processReferralStart,
} from "./referralRewardsEngine.js";

export { TelegramReferralLoyaltyService } from "./referralLoyaltyServiceClass.js";
