/**
 * DENTE Dental CRM — PublicOnlineBookingWidget Facade.
 *
 * Canonical backwards-compatible delegation facade re-exporting from ./PublicBookingWidget
 * per Mandate 8s (Zero Dead-Ends & Single SSOT).
 */

export * from "./PublicBookingWidget";
export {
	PublicBookingWidget as PublicOnlineBookingWidget,
	default,
} from "./PublicBookingWidget";
