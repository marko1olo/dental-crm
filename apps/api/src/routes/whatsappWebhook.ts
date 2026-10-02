/**
 * whatsappWebhook.ts — Transparent facade & backward compatibility delegate.
 *
 * Consolidates all WhatsApp webhook processing into canonical `whatsappWebhookRoutes.ts`
 * and `whatsappInteractiveActions.ts` while preserving 100% API and export parity.
 */

export {
	configuredWhatsappAppSecret,
	isValidWhatsappSignature,
	isWebhookPath,
	parseIncomingAction,
	processAppointmentCancellation,
	processAppointmentConfirmation,
	processRecallBooking,
	processRecallSnooze,
	registerWhatsappWebhookRoutes,
	type ParsedWebhookAction,
} from "./whatsappWebhookRoutes.js";

export {
	findTargetAppointment,
} from "../services/messaging/whatsappInteractiveActions.js";
