/**
 * CallKitBridge.ts — Native Mobile Incoming Call Bridge (CallKit & Android ConnectionService).
 *
 * Implements native incoming telephony integration for mobile devices:
 * 1. Native incoming call screen when receiving SIP calls on Android / iOS devices.
 * 2. Device screen wake-up and native lockscreen incoming call notifications.
 * 3. Media stream handoff to UnifiedAudioClient.ts and useTelephonyStore on answer.
 * 4. Synchronization of mute, hold, transfer, and call termination actions.
 * 5. Graceful fallback to Web Softphone / WebRTC overlay when running in web browser.
 */

import type {
	CallKitCallPayload,
	CallKitEventMap,
	IncomingCallPayload,
} from "@dental/shared";
import {
	isMobileApp,
	getMobileNativeApi,
	triggerHaptic,
	playClinicalAudioFeedback,
} from "../../native/mobileBridge.js";
import { useTelephonyStore } from "../../store/telephonyStore.js";
import { UnifiedAudioClient } from "../voice/UnifiedAudioClient.js";

declare global {
	interface Window {
		RNCallKeep?: {
			setup: (options: Record<string, unknown>) => Promise<void>;
			displayIncomingCall: (
				uuid: string,
				handle: string,
				localizedCallerName?: string,
				handleType?: string,
				hasVideo?: boolean,
			) => void;
			answerIncomingCall: (uuid: string) => void;
			endCall: (uuid: string) => void;
			endAllCalls: () => void;
			setMutedCall: (uuid: string, muted: boolean) => void;
			setOnHold: (uuid: string, hold: boolean) => void;
			addEventListener: (event: string, handler: (data: unknown) => void) => void;
			removeEventListener: (event: string, handler: (data: unknown) => void) => void;
		};
	}
}

export interface CallKitBridgeConfig {
	appName: string;
	imageName?: string | undefined;
	ringtoneResource?: string | undefined;
	includesCallsInRecents: boolean;
	autoConnectAudioOnAnswer: boolean;
}

export const DEFAULT_CALLKIT_CONFIG: CallKitBridgeConfig = {
	appName: "DENTE Dental CRM",
	imageName: "ic_launcher",
	ringtoneResource: "custom_ringtone",
	includesCallsInRecents: true,
	autoConnectAudioOnAnswer: true,
};

export class CallKitBridge {
	private config: CallKitBridgeConfig;
	private isInitialized = false;
	private activeCallId: string | null = null;
	private audioClient: UnifiedAudioClient | null = null;
	private listeners: Partial<CallKitEventMap> = {};

	constructor(config: Partial<CallKitBridgeConfig> = {}) {
		this.config = { ...DEFAULT_CALLKIT_CONFIG, ...config };
	}

	public isSupported(): boolean {
		return isMobileApp();
	}

	/**
	 * Initializes CallKeep / ConnectionService event listeners.
	 */
	public async initialize(customListeners: Partial<CallKitEventMap> = {}): Promise<boolean> {
		if (this.isInitialized) return true;
		this.listeners = customListeners;

		if (typeof window === "undefined") return false;

		// 1. Check if RNCallKeep / Capacitor plugin is available in native app
		if (window.RNCallKeep) {
			try {
				await window.RNCallKeep.setup({
					ios: {
						appName: this.config.appName,
						imageName: this.config.imageName,
						ringtoneSound: this.config.ringtoneResource,
						includesCallsInRecents: this.config.includesCallsInRecents,
					},
					android: {
						alertTitle: "Разрешение на системные звонки",
						alertDescription: "DENTE CRM требуется доступ к управлению звонками клиники",
						cancelButton: "Отмена",
						okButton: "Разрешить",
						imageName: this.config.imageName,
						additionalPermissions: [],
					},
				});

				// Wire answerCall event
				// biome-ignore lint/suspicious/noExplicitAny: native event signature
				window.RNCallKeep.addEventListener("answerCall", (data: any) => {
					const callUuid = data?.callUUID || this.activeCallId || "incoming-call";
					this.handleNativeCallAnswered(callUuid);
				});

				// Wire endCall event
				// biome-ignore lint/suspicious/noExplicitAny: native event signature
				window.RNCallKeep.addEventListener("endCall", (data: any) => {
					const callUuid = data?.callUUID || this.activeCallId || "incoming-call";
					this.handleNativeCallEnded(callUuid);
				});

				// Wire mute event
				// biome-ignore lint/suspicious/noExplicitAny: native event signature
				window.RNCallKeep.addEventListener("didPerformSetMutedCallAction", (data: any) => {
					const isMuted = Boolean(data?.muted);
					const callUuid = data?.callUUID || this.activeCallId || "incoming-call";
					this.handleNativeMuteToggled(callUuid, isMuted);
				});

				// Wire hold event
				// biome-ignore lint/suspicious/noExplicitAny: native event signature
				window.RNCallKeep.addEventListener("didToggleHoldCallAction", (data: any) => {
					const isHeld = Boolean(data?.hold);
					const callUuid = data?.callUUID || this.activeCallId || "incoming-call";
					this.handleNativeHoldToggled(callUuid, isHeld);
				});

				this.isInitialized = true;
				return true;
			} catch (err) {
				console.warn("[CallKitBridge] RNCallKeep setup failed:", err);
			}
		}

		this.isInitialized = true;
		return true;
	}

	/**
	 * Reports an incoming SIP call to the native system UI or Web Softphone store.
	 */
	public async reportIncomingCall(call: IncomingCallPayload): Promise<void> {
		await this.initialize();
		const callId = call.callId || `call_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
		this.activeCallId = callId;

		// 1. Mobile Native App -> Display Native Incoming Call Screen (wakes phone screen)
		if (this.isSupported() && typeof window !== "undefined" && window.RNCallKeep) {
			try {
				const callerTitle = call.patientName || "Пациент DENTE CRM";
				const phoneNumber = call.phone || "Неизвестный номер";

				window.RNCallKeep.displayIncomingCall(
					callId,
					phoneNumber,
					`${callerTitle} (${phoneNumber})`,
					"generic",
					false,
				);

				triggerHaptic("warning");
			} catch (err) {
				console.warn("[CallKitBridge] Native incoming call display failed:", err);
			}
		}

		// 2. Always sync with Telephony Zustand Store
		try {
			useTelephonyStore.getState().triggerIncomingCall({
				...call,
				callId,
				status: "ringing",
			});
		} catch {
			// Telephony store might not be mounted in test environments
		}
	}

	/**
	 * Handoffs call on answer: connects media stream and audio recognition.
	 */
	public async handleNativeCallAnswered(callId: string): Promise<void> {
		this.activeCallId = callId;
		triggerHaptic("success");
		playClinicalAudioFeedback("click");

		// Sync with Telephony Store
		try {
			useTelephonyStore.getState().acceptCall();
		} catch {}

		// Connect audio capture & speech dictation stream if enabled
		if (this.config.autoConnectAudioOnAnswer) {
			try {
				if (!this.audioClient) {
					this.audioClient = new UnifiedAudioClient({
						preferredMode: "gemini_live",
						autoFallback: true,
					});
				}
				await this.audioClient.start();
			} catch (audioErr) {
				console.warn("[CallKitBridge] Audio stream handoff on answer failed:", audioErr);
			}
		}

		if (this.listeners.onCallAnswered) {
			this.listeners.onCallAnswered(callId);
		}
	}

	/**
	 * Handles native call termination.
	 */
	public handleNativeCallEnded(callId: string, reason = "ended"): void {
		triggerHaptic("light");

		if (this.audioClient) {
			try {
				this.audioClient.stop();
			} catch {}
			this.audioClient = null;
		}

		try {
			useTelephonyStore.getState().rejectCall();
		} catch {}

		if (typeof window !== "undefined" && window.RNCallKeep) {
			try {
				window.RNCallKeep.endCall(callId);
			} catch {}
		}

		if (this.activeCallId === callId) {
			this.activeCallId = null;
		}

		if (this.listeners.onCallEnded) {
			this.listeners.onCallEnded(callId, reason);
		}
	}

	/**
	 * Mute synchronization.
	 */
	public handleNativeMuteToggled(callId: string, isMuted: boolean): void {
		try {
			const currentMuted = useTelephonyStore.getState().isMuted;
			if (currentMuted !== isMuted) {
				useTelephonyStore.getState().toggleMute();
			}
		} catch {}

		if (this.listeners.onMuteToggled) {
			this.listeners.onMuteToggled(callId, isMuted);
		}
	}

	/**
	 * Hold synchronization.
	 */
	public handleNativeHoldToggled(callId: string, isHeld: boolean): void {
		try {
			if (isHeld) {
				useTelephonyStore.getState().holdCall();
			} else {
				useTelephonyStore.getState().unholdCall();
			}
		} catch {}

		if (this.listeners.onHoldToggled) {
			this.listeners.onHoldToggled(callId, isHeld);
		}
	}

	/**
	 * Programmatic call end.
	 */
	public endCall(callId?: string): void {
		const targetId = callId || this.activeCallId;
		if (targetId) {
			this.handleNativeCallEnded(targetId);
		}
	}

	public getActiveCallId(): string | null {
		return this.activeCallId;
	}

	public getAudioClient(): UnifiedAudioClient | null {
		return this.audioClient;
	}
}

// Global Singleton Instance
export const callKitBridge = new CallKitBridge();
