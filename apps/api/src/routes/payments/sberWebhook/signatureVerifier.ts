import { verifySberbankChecksum } from "../../sberbankRoutes/sberbankSecurityHelpers.js";

/**
 * Validates Sberbank POS / SberPay HMAC-SHA256 checksum across standard acquiring formats.
 * Re-exports unified canonical SSOT from sberbankSecurityHelpers.
 */
export const verifySberPosWebhookChecksum = verifySberbankChecksum;
