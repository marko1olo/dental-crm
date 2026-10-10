/**
 * @file WhatsappIntegrationHub.tsx
 * @description Canonical thin facade for WhatsApp Integration Hub.
 * Decomposed in Wave 21 under Mandate 8b.
 */

import "./WhatsappIntegrationHub.css";

export type {
	WhatsappHubMode,
	StaffOption,
	WhatsappIntegrationHubProps,
	QrSessionStatus,
	WabaTestResult,
	WaTestSendResult,
	TemplateFeatureItem,
} from "./whatsappHub/index.js";

export {
	WhatsappIntegrationHub,
	WhatsappQrAuthCard,
	WhatsappWebhookSettings,
	WhatsappTemplatesList,
	useWhatsappHub,
} from "./whatsappHub/index.js";
