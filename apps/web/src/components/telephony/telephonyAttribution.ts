/**
 * telephonyAttribution.ts — CRM Telephony Inbound Lead Capture & Marketing Channel Attribution
 * Clean Modular Architecture (Mandates 8b, 8c, 8e, 8n) <= 120 lines
 */

export {
	type CallAttribution,
	CHANNEL_DISPLAY_NAMES,
	CHANNEL_BADGE_COLORS,
} from "./telephonyAttribution/attributionConstants";

export {
	type MarketingAttributionResult,
	detectMarketingAttribution,
} from "./telephonyAttribution/detectMarketingAttribution";

export {
	resolveCallAdvertisingAttribution,
} from "./telephonyAttribution/resolveCallAdvertisingAttribution";

export {
	captureLeadFromIncomingCall,
} from "./telephonyAttribution/captureLeadFromIncomingCall";
