/**
 * whatsappBridge.ts — Canonical Facade for Omnichannel WhatsApp Bridge & Clinical Triage Subsystem.
 *
 * Decomposed into modular DAG architecture in `./whatsapp/`:
 * - types.ts: Layer 0 Contracts, DTOs & Zod Schemas
 * - webhookPayloadParser.ts: Layer 1 Webhook parsers & sanitization
 * - whatsappRateLimiter.ts: Layer 1 Anti-spam rate limiting & delays
 * - patientContextResolver.ts: Layer 2 Patient matching & context resolution
 * - clinicalTriageAnalyzer.ts: Layer 2 Clinical emergency triage analysis
 * - whatsappMessageDispatcher.ts: Layer 2 Outbound dispatcher & HitL queue
 * - whatsappBridgeCoordinator.ts: Layer 3/4 Bridge coordinator & broadcasts
 * - index.ts: Layer 5 Barrel
 */

export * from "./whatsapp/index.js";
export type * from "./whatsapp/index.js";
