/**
 * types.ts
 *
 * Layer 0: Contracts, DTOs, and configuration for Telegram WebApp,
 * referral rewards, family profiles, churn detection, and loyalty engine.
 */

export type TelegramWebAppUser = {
	id: number;
	first_name: string;
	last_name?: string;
	username?: string;
	language_code?: string;
	is_premium?: boolean;
};

export type TelegramWebAppValidationResult = {
	isValid: boolean;
	user: TelegramWebAppUser | null;
	authDate: Date | null;
	queryId: string | null;
	rawParams: Record<string, string>;
	error?: string;
};

export type ReferralRewardConfig = {
	refereeWelcomeBonusRub: number; // default: 1000 ₽
	referrerBonusRub: number;       // default: 500 ₽
	campaignName: string;
};

export const DEFAULT_REFERRAL_CONFIG: ReferralRewardConfig = {
	refereeWelcomeBonusRub: 1000,
	referrerBonusRub: 500,
	campaignName: "Приведи друга — стоматология DENTE",
};

export type ReferralStartResult = {
	success: boolean;
	isNewReferral: boolean;
	referrerPatientId: string | null;
	referrerName: string | null;
	refereePatientId: string | null;
	refereeBonusRub: number;
	referrerBonusRub: number;
	welcomeMessage: string;
	webAppUrl: string;
	errorMessage?: string | undefined;
};

export type FamilyMemberItem = {
	patientId: string;
	fullName: string;
	birthDate: string | null;
	phone: string | null;
	relation: "self" | "child" | "spouse" | "parent" | "other";
	activeBonusPoints: number;
	upcomingAppointmentsCount: number;
};

export type FamilyProfileResult = {
	familyGroupId: string | null;
	familyGroupName: string;
	headPatientId: string | null;
	familyBalanceRub: number;
	members: FamilyMemberItem[];
};

export type ChurnCandidateItem = {
	patientId: string;
	fullName: string;
	phone: string | null;
	telegramChatId: string | null;
	monthsSinceLastVisit: number;
	lastVisitDate: string | null;
	lastDoctorName: string | null;
	inviteText: string;
	personalDiscountPercent: number;
};

export type NpsFeedbackInput = {
	appointmentId: string;
	score: number; // 1 to 5 (or 1 to 10)
	comment?: string | undefined;
	telegramChatId?: string | number | undefined;
};

export type NpsFeedbackResult = {
	appointmentId: string;
	normalizedScore: number; // 1-5
	routeDestination: "external_review" | "service_recovery_alert";
	replyMessage: string;
	yandexMapsUrl: string | null;
	twoGisUrl: string | null;
	taskCreatedId: string | null;
};

export type ToothComplaintInput = {
	toothNumber: number; // FDI 11-48
	symptom: string;     // Острая боль, Ноет, Скол, Кровоточивость, и т.д.
	painIntensity?: number | undefined; // 1-5
	notes?: string | undefined;
	urgency?: "cito" | "routine" | undefined;
};

export type WebAppBookingInput = {
	doctorId: string;
	date: string; // YYYY-MM-DD
	time: string; // HH:mm
	serviceName?: string | undefined;
	familyMemberPatientId?: string | undefined;
	complaintNotes?: string | undefined;
};
