/**
 * Canonical Clinical Telephony Facade (Layer 5 - Facade <= 250 lines)
 * Re-exports clinical types, call session resolution logic, WebRTC audio stream manager,
 * messaging templates, and shared telephony utilities.
 */

export * from "./telephonyModules/telephonyClinicalTypes";
export * from "./telephonyModules/telephonyMessagingEngine";
export * from "./telephonyModules/telephonyCallSessionEngine";
export * from "./telephonyModules/telephonyAudioStreamManager";

export {
	formatDurationTimer,
	generateWaveformBars,
	resolvePatientCategory,
} from "@dental/shared";
