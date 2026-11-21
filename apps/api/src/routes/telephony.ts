import {
	authenticatePbxWebhook,
	detectMarketingAttribution,
	isForbiddenPrivateIp,
	normalizePhoneNumber,
	type NormalizedPhone,
	UUID_REGEX,
	validateSsrfSafeRecordingUrl,
} from "../services/telephony/telephonySecurity.js";
import { telephonyOutboxService } from "../services/telephonyOutboxService.js";

// Re-export security utilities for backward compatibility
export {
	UUID_REGEX,
	type NormalizedPhone,
	normalizePhoneNumber,
	authenticatePbxWebhook,
	detectMarketingAttribution,
	isForbiddenPrivateIp,
	validateSsrfSafeRecordingUrl,
	telephonyOutboxService,
};

export * from "./telephony/index.js";
