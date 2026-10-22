import type { Kopecks } from "@dental/shared";

export type DentalLabGateStatus =
	| "CLEARED" // Оплачено >= 50%, наряд разрешен к отправке в ЗТЛ
	| "BLOCKED_REQUIRES_ADVANCE" // Оплачено < 50%, требуется внесение аванса или рассрочка
	| "CHIEF_DOCTOR_OVERRIDE" // Одобрено главным врачом под личную ответственность
	| "DOCTOR_OVERRIDE"; // Согласовано лечащим врачом (клиническая необходимость / срочно)

export interface DoctorClinicalOverride {
	readonly authorized: boolean;
	readonly doctorName: string;
	readonly timestampIso: string;
	readonly reason: string;
}

export type FinancialGateCheckResult = DentalLabFinancialGateResult;

export interface DentalLabFinancialGateParams {
	readonly stageTotalKopecks?: Kopecks | undefined;
	readonly paidKopecks: Kopecks;
	readonly availableDepositKopecks?: Kopecks | undefined;
	readonly labOrderPriceKopecks?: Kopecks | undefined;
	readonly minAdvancePercent?: number | undefined;
	readonly chiefDoctorOverride?:
		| {
				readonly authorized: boolean;
				readonly doctorName: string;
				readonly timestampIso: string;
				readonly reason?: string | undefined;
		  }
		| undefined;
	readonly doctorOverride?:
		| {
				readonly authorized: boolean;
				readonly doctorName: string;
				readonly timestampIso: string;
				readonly reason?: string | undefined;
		  }
		| undefined;
	readonly treatmentPlanAgeDays?: number | undefined;
	readonly isPlanExpired?: boolean | undefined;
	readonly isUrgentTemporary?: boolean | undefined;
}

export interface DentalLabFinancialGateResult {
	readonly isGatePassed: boolean;
	readonly isBlocked: boolean;
	readonly canDispatch: boolean;
	readonly gateStatus: DentalLabGateStatus;
	readonly isUrgentBypassed?: boolean | undefined;
	readonly minAdvancePercent: number;
	readonly stageTotalKopecks: Kopecks;
	readonly totalPaidAndCoveredKopecks: Kopecks;
	readonly requiredAdvanceKopecks: Kopecks;
	readonly missingAdvanceKopecks: Kopecks;
	readonly missingAdvanceRub: number;
	readonly paidPercent: number;
	readonly warningMessageRu: string;
	readonly detailedReasonRu: string;
	readonly chiefDoctorOverrideAuthorized: boolean;
	readonly isPlanExpiredNotice?: string | undefined;
	readonly canSendInOneClick: boolean;
	readonly isSoftWarning: boolean;
	readonly overrideMeta?:
		| {
				readonly doctorName: string;
				readonly timestampIso: string;
				readonly reason?: string | undefined;
		  }
		| undefined;
}
