export type PortalBudgetStatus = "draft" | "sent" | "viewed" | "accepted" | "rejected";
export type PortalAuthMethod = "phone_last4" | "dob" | "manual_code" | "none";

export interface PortalBudgetItem {
	readonly id: string;
	readonly title: string;
	readonly toothNumber: number | null;
	readonly quantity: number;
	readonly priceRub: number;
	readonly discountRub: number;
	readonly totalRub: number;
}

export interface PortalBudgetSignature {
	readonly signaturePng: string;
	readonly signatureSvg?: string | undefined;
	readonly signedByName: string;
	readonly relationshipToPatient: string;
	readonly ipAddress: string;
	readonly ipHash: string;
	readonly userAgent?: string | undefined;
	readonly signedAtIso: string;
	readonly documentHash: string;
}

export interface StoredPortalBudget {
	readonly token: string;
	readonly planId?: string | undefined;
	readonly organizationId: string;
	readonly patientId: string;
	readonly doctorId?: string | undefined;
	status: PortalBudgetStatus;
	readonly clinicName: string;
	readonly clinicPhone?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly doctorName: string;
	readonly patientFirstName: string;
	readonly patientPhone?: string | null | undefined;
	readonly patientBirthDate?: string | null | undefined;
	readonly authMethod: PortalAuthMethod;
	readonly verbalPinHash?: string | undefined;
	items: PortalBudgetItem[];
	totalPriceRub: number;
	discountRub: number;
	netTotalRub: number;
	currency: string;
	failedAttempts: number;
	totalFailures: number;
	isLocked: boolean;
	lockedUntil?: Date | null | undefined;
	viewedAt?: string | null | undefined;
	signedAt?: string | null | undefined;
	signerName?: string | null | undefined;
	documentHash?: string | null | undefined;
	signature?: PortalBudgetSignature | undefined;
	validUntil?: string | null | undefined;
	createdAt: string;
}

export interface PublicBudgetDto {
	readonly token: string;
	readonly planId?: string | undefined;
	readonly status: PortalBudgetStatus;
	readonly clinicName: string;
	readonly clinicPhone?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly doctorName: string;
	readonly patientFirstName: string;
	readonly items: readonly PortalBudgetItem[];
	readonly totalPriceRub: number;
	readonly discountRub: number;
	readonly netTotalRub: number;
	readonly currency: string;
	readonly requiresVerification: boolean;
	readonly authMethod: PortalAuthMethod;
	readonly isVerified: boolean;
	readonly viewedAt?: string | null | undefined;
	readonly signedAt?: string | null | undefined;
	readonly signerName?: string | null | undefined;
	readonly documentHash?: string | null | undefined;
	readonly validUntil?: string | null | undefined;
}

export const MAX_PORTAL_VERIFY_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 минут

export interface GenerateBudgetPortalTokenOptions {
	readonly planId?: string | undefined;
	readonly organizationId: string;
	readonly patientId: string;
	readonly doctorId?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly patientFirstName?: string | undefined;
	readonly patientPhone?: string | null | undefined;
	readonly patientBirthDate?: string | null | undefined;
	readonly authMethod?: PortalAuthMethod | undefined;
	readonly items?: readonly {
		readonly id?: string | undefined;
		readonly title: string;
		readonly toothNumber?: number | null | undefined;
		readonly quantity?: number | undefined;
		readonly priceRub: number;
		readonly discountRub?: number | undefined;
	}[] | undefined;
	readonly totalPriceRub?: number | undefined;
	readonly discountRub?: number | undefined;
	readonly validUntil?: string | null | undefined;
	readonly customToken?: string | undefined;
}

export interface VerifyBudgetAccessPayload {
	readonly method?: PortalAuthMethod | undefined;
	readonly value?: string | undefined;
	readonly phone_last4?: string | undefined;
	readonly dob?: string | undefined;
}

export interface VerifyBudgetAccessResult {
	success: boolean;
	status: number;
	sessionToken?: string;
	error?: string;
	message?: string;
	isLocked?: boolean;
	remainingAttempts?: number;
}

export interface SignBudgetPayload {
	signaturePng: string;
	signerName?: string | undefined;
	signatureSvg?: string | undefined;
	relationship?: string | undefined;
}

export interface SignBudgetReqMeta {
	ipAddress?: string | undefined;
	userAgent?: string | undefined;
	sessionToken?: string | undefined;
}

export interface SignBudgetResult {
	success: boolean;
	status: number;
	error?: string | undefined;
	message?: string | undefined;
	signedAt?: string | undefined;
	documentHash?: string | undefined;
	signerName?: string | undefined;
	ipHash?: string | undefined;
}

export interface MarkBudgetViewedResult {
	success: boolean;
	status?: PortalBudgetStatus;
	viewedAt?: string | null;
	error?: string;
}
