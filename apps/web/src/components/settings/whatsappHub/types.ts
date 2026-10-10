/**
 * @file types.ts
 * @description Type definitions for WhatsApp Integration Hub (QR Multi-Device & Meta WABA Cloud).
 */

import type { useWhatsappSettings } from "../../../hooks/useWhatsappSettings.js";

export type WhatsappHubMode = "qr" | "waba";

export type QrSessionStatus =
	| "qr_ready"
	| "scanned"
	| "authenticated"
	| "disconnected"
	| "expired";

export interface StaffOption {
	id: string;
	fullName: string;
}

export interface WhatsappIntegrationHubProps {
	staffOptions?: StaffOption[];
	serverBaseUrl?: string;
	useSettingsHook?: typeof useWhatsappSettings;
}

export interface WabaTestResult {
	ok: boolean;
	verifiedName?: string | null;
	displayPhoneNumber?: string | null;
	qualityRating?: string | null;
	message?: string | null;
}

export interface WaTestSendResult {
	ok: boolean;
	message: string;
}

export interface TemplateFeatureItem {
	id: string;
	label: string;
}
