/**
 * DENTE Dental CRM — Telephony Gateway Service (WebRTC SIP Asterisk & Cloud Fallback Engine).
 * Фасад (SSOT), декомпозированный по доменным модулям `gatewayModules/`.
 */
import { processAsteriskAmiEvent } from "./gatewayModules/telephonyAmiIngest.js";
import {
	clearForcedFailoverCache,
	clearLocalPbxCache,
	evaluateTelephonyGatewayStatus,
	generateWebRtcSipCredentials,
	getDefaultAsteriskConfig,
	setForcedFailover,
	type AsteriskAmiEventPayload,
	type CloudProviderType,
	type LocalAsteriskPbxConfig,
	type TelephonyGatewayStatus,
	type TelephonyMode,
	type TelephonyStructuredLogger,
	type WebRtcSipCredentials,
} from "./gatewayModules/telephonyGatewayConfig.js";
import {
	dispatchAsteriskOriginate,
	dispatchMangoCallback,
	dispatchUisCallback,
	dispatchZadarmaCallback,
	initiateOutboundCall,
} from "./gatewayModules/telephonyOutboundClients.js";
import {
	dispatchAsteriskTransfer,
	transferCall,
} from "./gatewayModules/telephonyTransferClient.js";

export type {
	TelephonyStructuredLogger,
	TelephonyMode,
	CloudProviderType,
	LocalAsteriskPbxConfig,
	WebRtcSipCredentials,
	TelephonyGatewayStatus,
	AsteriskAmiEventPayload,
};

export class TelephonyGatewayService {
	public static getDefaultAsteriskConfig(): LocalAsteriskPbxConfig {
		return getDefaultAsteriskConfig();
	}

	public static generateWebRtcSipCredentials(params: {
		organizationId: string;
		userId: string;
		extension?: string | undefined;
		staffFullName?: string | undefined;
		config?: Partial<LocalAsteriskPbxConfig> | undefined;
	}): WebRtcSipCredentials {
		return generateWebRtcSipCredentials(params);
	}

	public static async evaluateTelephonyGatewayStatus(
		organizationId: string,
		config?: Partial<LocalAsteriskPbxConfig>,
	): Promise<TelephonyGatewayStatus> {
		return evaluateTelephonyGatewayStatus(organizationId, config);
	}

	public static async setForcedFailover(
		organizationId: string,
		forceCloudFallback: boolean,
	): Promise<void> {
		return setForcedFailover(organizationId, forceCloudFallback);
	}

	public static clearLocalPbxCache(): void {
		clearLocalPbxCache();
	}

	public static clearForcedFailoverCache(): void {
		clearForcedFailoverCache();
	}

	public static async processAsteriskAmiEvent(
		organizationId: string,
		payload: AsteriskAmiEventPayload,
	) {
		return processAsteriskAmiEvent(organizationId, payload);
	}

	public static async dispatchAsteriskTransfer(params: {
		callId: string;
		host: string;
		port: number;
		username: string;
		secret: string;
		channel: string;
		exten: string;
		context: string;
		transferType: "blind" | "attended";
	}) {
		return dispatchAsteriskTransfer(params);
	}

	public static async transferCall(params: {
		organizationId: string;
		callId: string;
		targetExtensionOrPhone: string;
		transferType: "blind" | "attended";
		initiatedByUserId?: string | undefined;
		logger?: {
			warn: (obj: unknown, msg?: string) => void;
			error: (obj: unknown, msg?: string) => void;
		} | undefined;
	}) {
		return transferCall(params);
	}

	public static async dispatchMangoCallback(params: {
		callId: string;
		apiKey: string;
		apiSalt: string;
		phone: string;
		extension: string;
	}) {
		return dispatchMangoCallback(params);
	}

	public static async dispatchZadarmaCallback(params: {
		callId: string;
		apiKey: string;
		apiSecret: string;
		phone: string;
		extension: string;
	}) {
		return dispatchZadarmaCallback(params);
	}

	public static async dispatchUisCallback(params: {
		callId: string;
		apiKey: string;
		phone: string;
		extension: string;
	}) {
		return dispatchUisCallback(params);
	}

	public static async dispatchAsteriskOriginate(params: {
		callId: string;
		host: string;
		port: number;
		username: string;
		secret: string;
		phone: string;
		channel: string;
		context: string;
		callerId?: string | undefined;
	}) {
		return dispatchAsteriskOriginate(params);
	}

	public static async initiateOutboundCall(params: {
		organizationId: string;
		callerPhone: { e164: string; national10: string };
		patientId?: string | null | undefined;
		patientName?: string | undefined;
		staffUserId?: string | null | undefined;
		logger?: {
			warn: (obj: unknown, msg?: string) => void;
			error: (obj: unknown, msg?: string) => void;
		} | undefined;
	}) {
		return initiateOutboundCall(params);
	}
}
