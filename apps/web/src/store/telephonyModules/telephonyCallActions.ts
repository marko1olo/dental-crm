import type { StoreApi } from "zustand";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import {
	readDenteClinicToken,
	readDenteStaffToken,
} from "../../lib/safeLocalStorage";
import { normalizePhone } from "../telephonyHelpers";
import { getSharedTelephonyAudioStreamManager } from "./telephonyAudioStreamManager";
import {
	type CallHistoryItem,
	type IncomingCallPayload,
	type TelephonyStore,
	SLA_CALLBACK_WINDOW_MS,
	initialLine1,
	initialLine2,
	initialTransferState,
} from "./telephonyStoreTypes";
import { fetchCallHistoryAction } from "./telephonySlaAndLeadActions";

export * from "./telephonySlaAndLeadActions";

let telephonyCallSeq = 0;

type SetState = StoreApi<TelephonyStore>["setState"];
type GetState = StoreApi<TelephonyStore>["getState"];

export function createTelephonyCallActions(set: SetState, get: GetState) {
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

		endCall: (recordingUrl?: string | null) => {
			const { activeCall, callHistory, activeLineId, line1, line2 } = get();
			if (!activeCall) return;

			const endedAt = Date.now();
			const updatedCallId = activeCall.id || activeCall.callId;
			const resolvedRecUrl = recordingUrl || activeCall.recordingUrl || undefined;
			const finalDuration =
				typeof activeCall.durationSeconds === "number" && activeCall.durationSeconds > 0
					? activeCall.durationSeconds
					: Math.max(0, Math.floor((endedAt - (activeCall.callStartedAt || endedAt)) / 1000));

			const updatedHistory = callHistory.map((item) =>
				(updatedCallId && (item.id === updatedCallId || item.callId === updatedCallId)) ||
				item.phone === activeCall.phone
					? {
							...item,
							status: "ended" as const,
							actionTaken: item.actionTaken || ("accepted" as const),
							recordingUrl: resolvedRecUrl || item.recordingUrl,
							endedAt,
							durationSeconds: finalDuration,
						}
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
			});

			// Full stack CTI propagation: persist call completion in PostgreSQL 18 and refresh journal
			try {
				const staffToken = readDenteStaffToken();
				const clinicToken = readDenteClinicToken();
				void fetch("/api/telephony/calls/end", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(staffToken ? { "x-dente-staff-token": staffToken } : {}),
						...(clinicToken ? { "x-dente-clinic-token": clinicToken } : {}),
					},
					body: JSON.stringify({
						callId: updatedCallId,
						phone: activeCall.phone,
						patientId: activeCall.patientId || undefined,
						durationSeconds: finalDuration,
						recordingUrl: resolvedRecUrl,
						notes: activeCall.patientName ? `Пациент: ${activeCall.patientName}` : undefined,
					}),
				})
					.then(() => fetchCallHistoryAction(set, get))
					.catch(() => {});
			} catch {}
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

		recordCallOutcome: (outcome: NonNullable<CallHistoryItem["outcome"]>, note?: string) => {
			const { activeCall, callHistory } = get();
			const now = Date.now();
			const callbackDueAt =
				outcome === "callback_15m"
					? new Date(now + SLA_CALLBACK_WINDOW_MS).toISOString()
					: undefined;

			let updatedHistory = [...callHistory];
			if (activeCall) {
				const updatedCallId = activeCall.id || activeCall.callId;
				let found = false;
				updatedHistory = callHistory.map((item) => {
					if (
						(updatedCallId && (item.id === updatedCallId || item.callId === updatedCallId)) ||
						item.phone === activeCall.phone
					) {
						found = true;
						return {
							...item,
							status: outcome === "rejected" || outcome === "spam" ? ("rejected" as const) : ("answered" as const),
							actionTaken: outcome,
							outcome,
							outcomeNote: note || item.outcomeNote,
							callbackDueAt: callbackDueAt || item.callbackDueAt,
						};
					}
					return item;
				});

				if (!found && callHistory.length > 0) {
					updatedHistory[0] = {
						...callHistory[0]!,
						status: outcome === "rejected" || outcome === "spam" ? ("rejected" as const) : ("answered" as const),
						actionTaken: outcome,
						outcome,
						outcomeNote: note || callHistory[0]!.outcomeNote,
						callbackDueAt: callbackDueAt || callHistory[0]!.callbackDueAt,
					};
				}
			}

			set({
				activeCall: null,
				callHistory: updatedHistory,
				transferState: initialTransferState,
			});
		},

		logAcutePainCall: (phone: string, patientName?: string, reason?: string) => {
			const now = Date.now();
			const item: CallHistoryItem = {
				id: `pain-${now}-${++telephonyCallSeq}`,
				phone,
				patientId: null,
				patientName: patientName || "Пациент с острой болью",
				status: "answered",
				actionTaken: "accepted",
				acutePain: true,
				callStartedAt: now,
				outcomeNote: reason || "Срочный звонок: острая зубная боль",
			};
			set((state) => ({
				callHistory: [item, ...state.callHistory.slice(0, 49)],
			}));
		},

		startCallTransfer: (targetExtension: string, transferType: "blind" | "attended" = "blind") => {
			const { activeCall, callHistory, activeLineId, line1, line2 } = get();
			if (transferType === "blind") {
				const updatedCallId = activeCall?.id || activeCall?.callId;
				const updatedHistory = callHistory.map((item) =>
					(updatedCallId && (item.id === updatedCallId || item.callId === updatedCallId)) ||
					(activeCall && item.phone === activeCall.phone)
						? {
								...item,
								actionTaken: "transferred" as const,
								outcome: "transferred" as const,
								transferTarget: targetExtension,
								outcomeNote: `Переведён на доб. ${targetExtension}`,
							}
						: item,
				);

				set({
					activeCall: null,
					line1: activeLineId === 1 ? initialLine1 : line1,
					line2: activeLineId === 2 ? initialLine2 : line2,
					callHistory: updatedHistory,
					transferState: {
						isTransferring: true,
						targetExtension,
						transferType: "blind",
						status: "transferred",
						failureReason: undefined,
					},
				});
				return;
			}

			set({
				transferState: {
					isTransferring: true,
					targetExtension,
					transferType: "attended",
					status: "dialing",
					failureReason: undefined,
				},
			});
		},

		completeCallTransfer: () => {
			const { activeCall, transferState } = get();
			if (activeCall) {
				get().recordCallOutcome("transferred", `Переведён на доб. ${transferState.targetExtension}`);
			}
			set({
				transferState: {
					...transferState,
					isTransferring: false,
					status: "transferred",
				},
			});
		},

		cancelCallTransfer: () => {
			set({ transferState: initialTransferState });
		},

		fetchCallHistory: () => fetchCallHistoryAction(set, get),
	};
}
