/**
 * omnichannelBotEngine.ts — Canonical Facade for Omnichannel Messaging & Bot Engine.
 *
 * Preserves 100% backward-compatible public API by transparently delegating
 * to decomposed modules in `./omnichannel/`.
 *
 * Architecture DAG:
 * - Layer 0: ./omnichannel/types.js
 * - Layer 1: ./omnichannel/intentClassifier.js
 * - Layer 1: ./omnichannel/appointmentSlotMatcher.js
 * - Layer 2: ./omnichannel/operatorHandoverService.js
 * - Layer 2: ./omnichannel/botDialogManager.js
 */

export * from "./omnichannel/types.js";
export * from "./omnichannel/intentClassifier.js";
export {
	extractFirstNameRu,
	buildClinicMapLinks,
	formatAppointmentDateTimeRu,
	buildAppointmentReminder24h,
	buildAppointmentReminder2h,
	buildBirthdayGreeting,
	buildHygieneRecall6m,
	findAvailableOmnichannelSlots,
} from "./omnichannel/appointmentSlotMatcher.js";
export * from "./omnichannel/operatorHandoverService.js";
export * from "./omnichannel/botDialogManager.js";
