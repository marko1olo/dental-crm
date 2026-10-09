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

export * from "./omnichannel/index.js";
