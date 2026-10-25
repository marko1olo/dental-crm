import { DEFAULT_REFERRAL_PRESET, type ReferralRewardPreset } from "../presets/index";
import type { CalculateReferralRewardInput, CalculateReferralRewardResult } from "./referralTypes";

/**
 * Calculates referral reward for patient who referred a friend or family member.
 * Standard solo practice rule: 500 ₽ bonus to referrer once friend spends >= 2 500 ₽.
 */
export function calculateReferralReward(
	inputOrKop: CalculateReferralRewardInput | number,
	presetOverride?: ReferralRewardPreset
): CalculateReferralRewardResult {
	const friendInvoicePaidKop =
		typeof inputOrKop === "number" ? inputOrKop : inputOrKop.friendInvoicePaidKop;
	const preset = presetOverride ?? DEFAULT_REFERRAL_PRESET;
	const minSpend =
		typeof inputOrKop === "object" && inputOrKop.minSpendKop !== undefined
			? inputOrKop.minSpendKop
			: preset.minFriendSpendKop;
	const referrerRewardKop =
		typeof inputOrKop === "object" && inputOrKop.customRewardKop !== undefined
			? inputOrKop.customRewardKop
			: preset.referrerRewardKop;
	const invitedDiscountKop = preset.referredFriendDiscountKop;

	const referrerBonusRub = Math.round(referrerRewardKop / 100);
	const invitedDiscountRub = Math.round(invitedDiscountKop / 100);

	if (friendInvoicePaidKop < minSpend) {
		const missingSpendKop = minSpend - friendInvoicePaidKop;
		const minSpendRub = Math.round(minSpend / 100);
		const currentSpendRub = Math.round(friendInvoicePaidKop / 100);
		const explanationRu = `Сумма первого чека друга (${currentSpendRub} ₽) не достигла порога (${minSpendRub} ₽). Не хватает ${Math.round(missingSpendKop / 100)} ₽.`;
		return {
			isEligible: false,
			rewardKop: 0,
			rewardRub: 0,
			referrerBonusKop: 0,
			referrerBonusRub: 0,
			invitedDiscountKop: 0,
			invitedDiscountRub: 0,
			missingSpendKop,
			explanationRu,
			messageRu: explanationRu,
		};
	}

	const explanationRu = `Условия рекомендации выполнены: начислено ${referrerBonusRub} ₽ бонусов рекомендателю и ${invitedDiscountRub} ₽ скидки другу.`;
	return {
		isEligible: true,
		rewardKop: referrerRewardKop,
		rewardRub: referrerBonusRub,
		referrerBonusKop: referrerRewardKop,
		referrerBonusRub: referrerBonusRub,
		invitedDiscountKop,
		invitedDiscountRub,
		missingSpendKop: 0,
		explanationRu,
		messageRu: explanationRu,
	};
}
