/**
 * index.ts — Layer 5: Barrel Re-export for Omnichannel Messaging & Bot Engine.
 *
 * Re-exports:
 * - Layer 0: Contracts, Schemas & DTOs (types.ts)
 * - Layer 1: Inbound Webhook Parser & Intent Classifier (intentClassifier.ts)
 * - Layer 1: Slot Matcher & Appointment Reminders (appointmentSlotMatcher.ts)
 * - Layer 2: Live Operator Handover Service (operatorHandoverService.ts)
 * - Layer 2: Finite State Machine Dialog Manager (botDialogManager.ts)
 */

export * from "./types.js";
export * from "./intentClassifier.js";
export * from "./appointmentSlotMatcher.js";
export * from "./operatorHandoverService.js";
export * from "./botDialogManager.js";
