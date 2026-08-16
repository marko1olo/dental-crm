export interface ReferralLinkRecord {
	referralCode: string;
	referrerPatientId: string;
	organizationId: string;
	createdAt: Date;
	isActive: boolean;
}

export interface ReferralAttribution {
	id: string;
	organizationId: string;
	referrerPatientId: string;
	invitedPatientId: string;
	referralCode: string;
	attributedAt: Date;
	isFirstVisitCompleted: boolean;
	isFirstVisitFullyPaid: boolean;
	rewardBonusPoints: number;
	isRewardAllocated: boolean;
	rewardAllocatedAt?: Date;
}

export class PatientReferralLedgerEngine {
	/**
	 * Генерация уникального реферального промокода для пациента
	 */
	public static generateReferralCode(patientId: string, prefix: string = "REF"): string {
		const cleanId = patientId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
		return `${prefix}-${cleanId}`;
	}

	/**
	 * Расчет и начисление бонусов рекомендателю
	 * (СТРОГО после завершения и полной оплаты первого визита)
	 */
	public static evaluateRewardEligibility(
		attribution: ReferralAttribution,
		rewardBonusPoints: number = 1000,
	): {
		isEligible: boolean;
		pointsToCredit: number;
		reason: string;
	} {
		if (attribution.isRewardAllocated) {
			return {
				isEligible: false,
				pointsToCredit: 0,
				reason: "Бонусы по данной рекомендации уже были начислены ранее.",
			};
		}

		if (!attribution.isFirstVisitCompleted) {
			return {
				isEligible: false,
				pointsToCredit: 0,
				reason: "Приглашенный пациент еще не завершил первичный клинический прием.",
			};
		}

		if (!attribution.isFirstVisitFullyPaid) {
			return {
				isEligible: false,
				pointsToCredit: 0,
				reason: "Первичный прием приглашенного пациента еще не оплачен полностью.",
			};
		}

		return {
			isEligible: true,
			pointsToCredit: Math.max(0, rewardBonusPoints),
			reason: "Все условия выполнены: первичный прием завершен и оплачен. Бонусы начислены.",
		};
	}
}
