/**
 * index.ts — Layer 5: Clean Barrel Re-export for WhatsApp Omnichannel Module.
 *
 * Invariants:
 * - Re-exports 100% of domain types, Zod schemas, utilities, analyzers, and coordinators.
 * - Single source of truth for the WhatsApp bridge subsystem.
 */

// Layer 0: Types & Schemas
export type * from "./types.js";
export {
	WhatsAppTriageLlmSchema,
	WhatsAppTriageSchema,
} from "./types.js";

// Layer 1: Webhook Parsers & Sanitization
export {
	sanitizePatientInput,
	parseMetaWebhookPayload,
	parseGreenApiWebhookPayload,
	parseWhatsAppWebhook,
} from "./webhookPayloadParser.js";

// Layer 1: Anti-Spam Rate Limiting
export {
	getRandomAntiSpamDelayMs,
	sleepAntiSpamDelay,
	WhatsAppRateLimiter,
	defaultWhatsAppRateLimiter,
} from "./whatsappRateLimiter.js";

// Layer 2: Patient Context Resolution
export {
	PatientContextResolver,
	defaultPatientContextResolver,
} from "./patientContextResolver.js";

// Layer 2: Clinical Emergency Triage Analyzer
export {
	WhatsAppTriageAnalyzer,
	whatsappTriageAnalyzer,
} from "./clinicalTriageAnalyzer.js";

// Layer 2: Message Dispatcher & HitL Approval Queue
export {
	WhatsAppHitLQueue,
	whatsappHitLQueue,
} from "./whatsappMessageDispatcher.js";

// Layer 3/4: Omnichannel Bridge Coordinator
export {
	WhatsAppBridge,
	defaultWhatsAppBridge,
} from "./whatsappBridgeCoordinator.js";
