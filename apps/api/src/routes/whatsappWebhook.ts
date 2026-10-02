/**
 * apps/api/src/routes/whatsappWebhook.ts
 *
 * Canonical Facade per Mandate 8s (The Law of Single Indivisible Authority).
 * Transparently re-exports from whatsappWebhookRoutes to resolve Split-Brain.
 */

export * from "./whatsappWebhookRoutes.js";
export { registerWhatsappWebhookRoutes as default } from "./whatsappWebhookRoutes.js";
