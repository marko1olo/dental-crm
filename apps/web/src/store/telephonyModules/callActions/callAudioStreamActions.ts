import type { StoreApi } from "zustand";
import {
	readDenteClinicToken,
	readDenteStaffToken,
} from "../../../lib/safeLocalStorage";
import { getSharedTelephonyAudioStreamManager } from "../telephonyAudioStreamManager";
import {
	type TelephonyStore,
	initialLine1,
	initialLine2,
	initialTransferState,
} from "../telephonyStoreTypes";

export type SetState = StoreApi<TelephonyStore>["setState"];
export type GetState = StoreApi<TelephonyStore>["getState"];

/**
 * Управление аудио-потоками разговора, приёмом вызова, установлением соединения
 * и отключением удалённого аудиоканала (CTI Full Stack Propagation).
 */
export function createCallAudioStreamActions(set: SetState, get: GetState) {
	return {
		answerCall: () => {
			const { activeCall, callHistory, activeLineId, line1, line2 } = get();
			if (!activeCall) return;

			const updatedCallId = activeCall.id || activeCall.callId;
			const updatedHistory = callHistory.map((item) =>
				(updatedCallId && (item.id === updatedCallId || item.callId === updatedCallId)) ||
				item.phone === activeCall.phone
					? { ...item, status: "answered" as const }
					: item,
			);

			const updatedCall = { ...activeCall, status: "answered" as const };
			set({
				activeCall: updatedCall,
				line1: activeLineId === 1 ? { ...line1, state: "connected" as const, call: updatedCall } : line1,
				line2: activeLineId === 2 ? { ...line2, state: "connected" as const, call: updatedCall } : line2,
				callHistory: updatedHistory,
			});

			// Full stack CTI propagation: sync answer to API and notify PBX/WebSocket
			try {
				const staffToken = readDenteStaffToken();
				const clinicToken = readDenteClinicToken();
				void fetch("/api/telephony/calls/answer", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(staffToken ? { "x-dente-staff-token": staffToken } : {}),
						...(clinicToken ? { "x-dente-clinic-token": clinicToken } : {}),
					},
					body: JSON.stringify({
						callId: updatedCallId,
						phone: updatedCall.phone,
						patientId: updatedCall.patientId || undefined,
						lineId: activeLineId,
					}),
				}).catch(() => {});
			} catch {}
		},

		connectCall: () => {
			const { activeCall, callHistory, activeLineId, line1, line2 } = get();
			if (!activeCall) return;

			const updatedCallId = activeCall.id || activeCall.callId;
			const updatedHistory = callHistory.map((item) =>
				(updatedCallId && (item.id === updatedCallId || item.callId === updatedCallId)) ||
				item.phone === activeCall.phone
					? { ...item, status: "connected" as const }
					: item,
			);

			const updatedCall = { ...activeCall, status: "connected" as const };
			set({
				activeCall: updatedCall,
				line1: activeLineId === 1 ? { ...line1, state: "connected" as const, call: updatedCall } : line1,
				line2: activeLineId === 2 ? { ...line2, state: "connected" as const, call: updatedCall } : line2,
				callHistory: updatedHistory,
			});
		},

		acceptCall: () => {
			const { activeCall, callHistory, activeLineId, line1, line2 } = get();
			if (!activeCall) return;

			const updatedCallId = activeCall.id || activeCall.callId;
			const updatedHistory = callHistory.map((item) =>
				(updatedCallId && (item.id === updatedCallId || item.callId === updatedCallId)) ||
				item.phone === activeCall.phone
					? { ...item, status: "answered" as const, actionTaken: "accepted" as const }
					: item,
			);

			set({
				activeCall: null,
				line1: activeLineId === 1 ? initialLine1 : line1,
				line2: activeLineId === 2 ? initialLine2 : line2,
				callHistory: updatedHistory,
				transferState: initialTransferState,
			});
		},

		rejectCall: () => {
			const { activeCall, callHistory, activeLineId, line1, line2 } = get();
			if (!activeCall) return;

			const updatedCallId = activeCall.id || activeCall.callId;
			const updatedHistory = callHistory.map((item) =>
				(updatedCallId && (item.id === updatedCallId || item.callId === updatedCallId)) ||
				item.phone === activeCall.phone
					? { ...item, status: "rejected" as const, actionTaken: "rejected" as const }
					: item,
			);

			const nextL1 = activeLineId === 1 ? initialLine1 : line1;
			const nextL2 = activeLineId === 2 ? initialLine2 : line2;
			if (nextL1.state === "idle" && nextL2.state === "idle") {
				try { getSharedTelephonyAudioStreamManager().detachRemoteAudio(); } catch {}
			}

			set({
				activeCall: null,
				line1: nextL1,
				line2: nextL2,
				callHistory: updatedHistory,
				transferState: initialTransferState,
			});
		},

		dismissCall: () => {
			const { activeCall, callHistory, activeLineId, line1, line2 } = get();
			if (!activeCall) return;

			const updatedCallId = activeCall.id || activeCall.callId;
			const updatedHistory = callHistory.map((item) =>
				(updatedCallId && (item.id === updatedCallId || item.callId === updatedCallId)) ||
				item.phone === activeCall.phone
					? { ...item, actionTaken: "dismissed" as const }
					: item,
			);

			const nextL1 = activeLineId === 1 ? initialLine1 : line1;
			const nextL2 = activeLineId === 2 ? initialLine2 : line2;
			if (nextL1.state === "idle" && nextL2.state === "idle") {
				try { getSharedTelephonyAudioStreamManager().detachRemoteAudio(); } catch {}
			}

			set({
				activeCall: null,
				line1: nextL1,
				line2: nextL2,
				callHistory: updatedHistory,
				transferState: initialTransferState,
			});
		},
	};
}
