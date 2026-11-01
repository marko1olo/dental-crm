import type { StoreApi } from "zustand";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { normalizePhone } from "../../telephonyHelpers";
import { getSharedTelephonyAudioStreamManager } from "../telephonyAudioStreamManager";
import {
	type CallHistoryItem,
	type IncomingCallPayload,
	type TelephonyStore,
	initialTransferState,
} from "../telephonyStoreTypes";

let telephonyCallSeq = 0;

export type SetState = StoreApi<TelephonyStore>["setState"];
export type GetState = StoreApi<TelephonyStore>["getState"];

/**
 * Управление телефонными линиями, удержанием (Hold) и регистрацией входящих звонков.
 * Обеспечивает мгновенное переключение между Линией 1 и Линией 2 без потери звука и состояния.
 */
export function createCallLineManagementActions(set: SetState, get: GetState) {
	return {
		switchLine: (targetLineId: 1 | 2) => {
			const { activeLineId, line1, line2, isMuted } = get();
			if (activeLineId === targetLineId) return;

			let updatedLine1 = { ...line1 };
			let updatedLine2 = { ...line2 };

			if (activeLineId === 1 && line1.state === "connected") {
				updatedLine1 = { ...line1, state: "held" };
			} else if (activeLineId === 2 && line2.state === "connected") {
				updatedLine2 = { ...line2, state: "held" };
			}

			const targetLine = targetLineId === 1 ? updatedLine1 : updatedLine2;
			try {
				if (targetLine.state === "held") {
					getSharedTelephonyAudioStreamManager().setMicrophoneMute(true);
				} else {
					getSharedTelephonyAudioStreamManager().setMicrophoneMute(isMuted);
				}
			} catch {}

			set({
				activeLineId: targetLineId,
				line1: updatedLine1,
				line2: updatedLine2,
				activeCall: targetLine.call,
				isHeld: targetLine.state === "held",
			});
		},

		holdCall: () => {
			const { activeLineId, line1, line2 } = get();
			try {
				getSharedTelephonyAudioStreamManager().setMicrophoneMute(true);
			} catch {}
			if (activeLineId === 1 && line1.call) {
				set({ isHeld: true, line1: { ...line1, state: "held" } });
			} else if (activeLineId === 2 && line2.call) {
				set({ isHeld: true, line2: { ...line2, state: "held" } });
			} else {
				set({ isHeld: true });
			}
		},

		unholdCall: () => {
			const { activeLineId, line1, line2, isMuted } = get();
			try {
				getSharedTelephonyAudioStreamManager().setMicrophoneMute(isMuted);
			} catch {}
			if (activeLineId === 1 && line1.call) {
				set({ isHeld: false, line1: { ...line1, state: "connected" } });
			} else if (activeLineId === 2 && line2.call) {
				set({ isHeld: false, line2: { ...line2, state: "connected" } });
			} else {
				set({ isHeld: false });
			}
		},

		toggleHold: () => {
			if (get().isHeld) get().unholdCall();
			else get().holdCall();
		},

		triggerIncomingCall: (call: IncomingCallPayload) => {
			if (!isDemoShowcaseMode() && (!call.phone || call.phone.trim().length < 4)) {
				console.warn("[TelephonyStore] Production reject: call without valid phone number is prohibited.");
				return;
			}

			let patientId = call.patientId;
			let patientName = call.patientName;
			let phone = call.phone;

			if (isDemoShowcaseMode()) {
				if (!patientId || !patientName || patientName === "Неизвестный номер") {
					patientId = "01a00000-0000-0000-0000-000000000001";
					patientName = "Смирнова Анна Сергеевна";
					if (!phone || phone.trim().length < 4) {
						phone = "+7 916 234-56-78";
					}
				}
			}

			const effectiveCall: IncomingCallPayload = {
				...call,
				patientId,
				patientName,
				phone,
			};

			const state = get();
			const now = Date.now();

			const latestHistory = state.callHistory[0];
			if (
				latestHistory &&
				latestHistory.status === "ringing" &&
				!latestHistory.actionTaken &&
				latestHistory.callStartedAt &&
				now - latestHistory.callStartedAt < 2000 &&
				((effectiveCall.callId && latestHistory.callId === effectiveCall.callId) ||
					(!effectiveCall.callId && latestHistory.phone === effectiveCall.phone))
			) {
				return;
			}

			const normalizedPhone = normalizePhone(effectiveCall.phone) || effectiveCall.phone;
			const id = effectiveCall.callId || `call-${now}-${++telephonyCallSeq}`;
			const callStartedAt = effectiveCall.callStartedAt ?? now;
			const incomingPayload: IncomingCallPayload = {
				...effectiveCall,
				phone: normalizedPhone,
				id,
				status: effectiveCall.status ?? "ringing",
				callStartedAt,
			};

			const historyItem: CallHistoryItem = {
				...incomingPayload,
				id,
				status: call.status ?? "ringing",
				callStartedAt,
				actionTaken: undefined,
				transcript: undefined,
			};

			if (typeof window !== "undefined") {
				try {
					window.dispatchEvent(
						new CustomEvent("dente-telephony-incoming-call", { detail: historyItem }),
					);
				} catch {
					// ignore in non-browser environments
				}
			}

			let assignedLineId: 1 | 2 = 1;
			let updatedLine1 = { ...state.line1 };
			let updatedLine2 = { ...state.line2 };

			if (state.line1.state === "idle") {
				assignedLineId = 1;
				updatedLine1 = { lineId: 1, call: incomingPayload, state: "ringing", durationSeconds: 0, isMuted: false };
			} else if (state.line2.state === "idle") {
				assignedLineId = 2;
				updatedLine2 = { lineId: 2, call: incomingPayload, state: "ringing", durationSeconds: 0, isMuted: false };
			} else {
				assignedLineId = state.activeLineId === 1 ? 2 : 1;
				if (assignedLineId === 2) {
					updatedLine2 = { lineId: 2, call: incomingPayload, state: "ringing", durationSeconds: 0, isMuted: false };
				} else {
					updatedLine1 = { lineId: 1, call: incomingPayload, state: "ringing", durationSeconds: 0, isMuted: false };
				}
			}

			const isCurrentlyInCall = Boolean(
				state.activeCall &&
					(state.activeCall.status === "connected" ||
						state.activeCall.status === "answered" ||
						state.line1.state === "connected" ||
						state.line2.state === "connected"),
			);

			set({
				activeCall: isCurrentlyInCall ? state.activeCall : incomingPayload,
				activeLineId: isCurrentlyInCall ? state.activeLineId : assignedLineId,
				line1: updatedLine1,
				line2: updatedLine2,
				callHistory: [historyItem, ...state.callHistory.slice(0, 49)],
				transferState: initialTransferState,
			});
		},
	};
}
