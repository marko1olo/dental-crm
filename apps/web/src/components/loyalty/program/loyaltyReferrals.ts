import {
	DEFAULT_REFERRAL_PRESET,
	type ReferralRewardPreset,
} from "./loyaltyPresets";
import type { LoyaltyLedgerEntry } from "./loyaltyFamilyBalance";

export interface PatientReferralRecord {
	readonly id: string;
	readonly referrerPatientId: string;
	readonly referrerPatientName: string;
	readonly referredPatientName?: string | undefined;
	readonly invitedPatientName?: string | undefined;
	readonly referredPatientPhone?: string | undefined;
	readonly invitedPatientPhone?: string | undefined;
	readonly status: "pending" | "rewarded" | "cancelled" | "registered" | "first_visit_completed" | "reward_credited";
	readonly statusRu?: string | undefined;
	readonly createdAtIso: string;
	readonly rewardKop?: number | undefined;
	readonly rewardRub?: number | undefined;
	readonly firstVisitInvoiceKop?: number | undefined;
	readonly rewardPreset?: ReferralRewardPreset | undefined;
	readonly isRewardCredited?: boolean | undefined;
	readonly rewardedAtIso?: string | undefined;
	readonly noteRu?: string | undefined;
}

export interface CalculateReferralRewardInput {
	readonly friendInvoicePaidKop: number;
	readonly customRewardKop?: number;
	readonly minSpendKop?: number;
}

export interface CalculateReferralRewardResult {
	readonly isEligible: boolean;
	readonly rewardKop: number;
	readonly rewardRub: number;
	readonly referrerBonusKop: number;
	readonly referrerBonusRub: number;
	readonly invitedDiscountKop: number;
	readonly invitedDiscountRub: number;
	readonly missingSpendKop: number;
	readonly explanationRu: string;
	readonly messageRu: string;
}

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

/**
 * Credits referral bonus to patient balance and creates an audit ledger entry.
 */
export function creditReferralBonus(
	paramsOrReferral:
		| {
				readonly currentBalanceRub: number;
				readonly referral: PatientReferralRecord;
				readonly staffNameRu?: string;
		  }
		| PatientReferralRecord,
	optionalBalanceRub?: number
): {
	readonly updatedBalanceRub: number;
	readonly newBalanceRub: number;
	readonly updatedReferral: PatientReferralRecord;
	readonly ledgerEntry: LoyaltyLedgerEntry;
	readonly bonusRub: number;
} {
	const isObjectParam = "referral" in paramsOrReferral;
	const referral = isObjectParam ? paramsOrReferral.referral : paramsOrReferral;
	const currentBalanceRub = isObjectParam
		? paramsOrReferral.currentBalanceRub
		: (optionalBalanceRub ?? 0);
	const staffNameRu = isObjectParam ? paramsOrReferral.staffNameRu : undefined;

	const bonusRub =
		referral.rewardRub ?? (referral.rewardPreset?.referrerRewardRub ?? 500);
	const updatedBalanceRub = currentBalanceRub + bonusRub;
	const timestampIso = new Date().toLocaleString("ru-RU");

	const friendName =
		referral.referredPatientName || referral.invitedPatientName || "Приглашенный пациент";

	const updatedReferral: PatientReferralRecord = {
		...referral,
		status: "reward_credited",
		statusRu: "Бонус начислен",
		isRewardCredited: true,
		rewardedAtIso: timestampIso,
	};

	const ledgerEntry: LoyaltyLedgerEntry = {
		id: `ref-tx-${Date.now().toString().slice(-4)}`,
		timestampIso,
		patientId: referral.referrerPatientId,
		patientName: referral.referrerPatientName,
		medicalCardNumber: "",
		operationType: "referral_reward",
		operationTypeRu: "Бонус «Привёл друга»",
		invoiceAmountKop: referral.firstVisitInvoiceKop ?? 0,
		pointsDeltaRub: bonusRub,
		balanceAfterRub: updatedBalanceRub,
		paymentMethodRu: "Реферальная программа",
		staffNameRu: staffNameRu ?? "Администратор",
		noteRu: `Вознаграждение за рекомендацию: ${friendName}`,
	};

	return {
		updatedBalanceRub,
		newBalanceRub: updatedBalanceRub,
		updatedReferral,
		ledgerEntry,
		bonusRub,
	};
}
