/**
 * DENTE Dental CRM — PublicOnlineBookingWidget Facade.
 *
 * Canonical root facade re-exporting the embeddable online booking widget
 * from ./booking/PublicBookingWidget per Mandate 8s (Zero Dead-Ends & Single SSOT).
 */

export * from "./booking/PublicBookingWidget.js";
export {
	PublicBookingWidget as PublicOnlineBookingWidget,
	default,
} from "./booking/PublicBookingWidget.js";
