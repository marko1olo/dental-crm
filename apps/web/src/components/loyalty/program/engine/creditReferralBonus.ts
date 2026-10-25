import type { LoyaltyLedgerEntry } from "./loyaltyTypes";
import type { PatientReferralRecord } from "./referralTypes";

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
