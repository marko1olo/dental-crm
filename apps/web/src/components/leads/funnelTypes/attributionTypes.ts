/**
 * DENTE Dental CRM — Leads Attribution, 152-FZ and Spam Protection Types
 */

import type { CanonicalMarketingChannelKey } from "./marketingChannelTypes";

export interface LeadUtmParameters {
	readonly utm_source?: string | null | undefined;
	readonly utm_medium?: string | null | undefined;
	readonly utm_campaign?: string | null | undefined;
	readonly utm_content?: string | null | undefined;
	readonly utm_term?: string | null | undefined;
}

export interface LeadAttributionDetails {
	readonly channelKey: CanonicalMarketingChannelKey;
	readonly channelLabel: string;
	readonly sourceRaw: string;
	readonly utm: LeadUtmParameters;
	readonly primaryInquiry: string | null;
	readonly hasUtmTags: boolean;
}

export interface PatientAttributionRecord {
	readonly patientName: string;
	readonly phone: string | null;
	readonly advertisingSource: string;
	readonly sourceChannelKey: CanonicalMarketingChannelKey;
	readonly primaryInquiry: string | null;
	readonly utm: LeadUtmParameters;
	readonly administrativeProfile: {
		readonly advertisingSource: string;
		readonly preferredAppointmentNote: string;
		readonly dataProcessingBasisNote: string;
		readonly utmSource?: string | null | undefined;
		readonly utmMedium?: string | null | undefined;
		readonly utmCampaign?: string | null | undefined;
	};
	readonly consents: {
		readonly medicalCareProcessing: boolean;
		readonly marketingPromotions: boolean;
	};
}

export type NotificationSuppressionType =
	| "no_marketing_consent"
	| "service_priority_suppression"
	| "rate_limit_24h"
	| "same_day_collision";

export interface NotificationSpamCollisionInput {
	readonly patientId: string;
	readonly notificationType: "service" | "marketing" | "recall";
	readonly consentMarketing?: boolean | null | undefined;
	readonly hasServiceAppointmentToday?: boolean | undefined;
	readonly lastMarketingSentAt?: string | Date | null | undefined;
	readonly messagesSentTodayCount?: number | undefined;
	readonly targetDate?: Date | undefined;
}

export interface NotificationCollisionCheckResult {
	readonly allowed: boolean;
	readonly reason?: string;
	readonly suppressionType?: NotificationSuppressionType;
	readonly hoursRemaining?: number;
}
