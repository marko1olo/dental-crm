/**
 * Canonical Patient Personal Portal Router Facade (Mandate 8b / /decomposer)
 * Decomposed into modular domain route handlers in ./portal/:
 * - types.ts (Layer 0: schemas and contracts)
 * - portalUtils.ts (Layer 1: pure utilities and crypto helpers)
 * - portalAuthStore.ts (Layer 2: rate limit stores and token revocation)
 * - portalAuthRoutes.ts (Layer 3: OTP login, verification, logout)
 * - portalKioskRoutes.ts (Layer 3: self-checkin terminal)
 * - portalPatientProfileRoutes.ts (Layer 3: patient profile, somatic questionnaire)
 * - portalDocumentsRoutes.ts (Layer 3: consents, 63-FZ PEP, treatment plans)
 * - portalPaymentsRoutes.ts (Layer 3: SBP QR codes, fiscal payments)
 * - portalAppointmentsRoutes.ts (Layer 3: appointments booking, cancellation, imaging)
 */

import {
	OTP_EXPIRY_SECONDS,
	OTP_MAX_REQUESTS_PER_IP,
	OTP_MAX_REQUESTS_PER_PHONE,
	OTP_RATE_LIMIT_WINDOW_MS,
	PORTAL_CONSENT_REGISTRY,
	PORTAL_ROLES,
	PORTAL_TOKEN_KIND,
	PORTAL_TOKEN_TTL_SECONDS,
	otpIpRequestCounts,
	otpPhoneRequestCounts,
	portalRevokedBeforeByPatient,
	portalRoutes,
	resetPortalOtpRateLimitsForTesting,
	resetPortalRevokedTokensForTesting,
	revokedPortalTokens,
} from "./portal/index.js";

export {
	OTP_EXPIRY_SECONDS,
	OTP_MAX_REQUESTS_PER_IP,
	OTP_MAX_REQUESTS_PER_PHONE,
	OTP_RATE_LIMIT_WINDOW_MS,
	PORTAL_CONSENT_REGISTRY,
	PORTAL_ROLES,
	PORTAL_TOKEN_KIND,
	PORTAL_TOKEN_TTL_SECONDS,
	otpIpRequestCounts,
	otpPhoneRequestCounts,
	portalRevokedBeforeByPatient,
	portalRoutes,
	resetPortalOtpRateLimitsForTesting,
	resetPortalRevokedTokensForTesting,
	revokedPortalTokens,
};

export * from "./portal/index.js";
export default portalRoutes;
