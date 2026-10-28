import type { Kopecks } from "../../utils/money.js";

export type DmsCoverageEvaluationStatus =
	| "approved"
	| "partial_limit_exceeded"
	| "rejected_expired"
	| "rejected_not_yet_valid"
	| "rejected_limit_exhausted"
	| "rejected_letter_inactive"
	| "rejected_service_excluded"
	| "rejected_service_not_in_allowed_list";

export interface DmsCoverageEvaluation {
	readonly letterId: string;
	readonly status: DmsCoverageEvaluationStatus;
	readonly isApproved: boolean;
	readonly approvedInsurerKopecks: Kopecks;
	readonly overflowToPatientKopecks: Kopecks;
	readonly remainingLimitBeforeKopecks: Kopecks;
	readonly remainingLimitAfterKopecks: Kopecks;
	readonly limitUsageRatioPercent: number;
	readonly warning80PercentReached: boolean;
	readonly limitExceeded: boolean;
	readonly isDoctorWorkBlocked: false;
	readonly coverageIndicatorRu: string;
	readonly rejectionReasonRu?: string | undefined;
	readonly warningMessageRu?: string | undefined;
	readonly actionRecommendationsRu: readonly string[];
}

export interface DmsCoverageEvaluationOptions {
	readonly serviceDate?: string | undefined;
	readonly serviceCode804n?: string | undefined;
	readonly serviceName?: string | undefined;
	readonly isEmergency?: boolean | undefined;
	readonly hasAcutePain?: boolean | undefined;
}

export interface DmsServiceCheckResult {
	readonly isCovered: boolean;
	readonly coverageIndicatorRu: string;
	readonly isDoctorWorkBlocked: false;
	readonly approvedInsurerKopecks: Kopecks;
	readonly patientPortionKopecks: Kopecks;
	readonly remainingLimitAfterKopecks: Kopecks;
	readonly reasonRu: string;
	readonly recommendationRu: string;
}
