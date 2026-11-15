import type { StoreApi } from "zustand";
import { showToast } from "../../../components/GlobalToast";
import {
	readDenteClinicToken,
	readDenteStaffToken,
} from "../../../lib/safeLocalStorage";
import { getSharedTelephonyAudioStreamManager } from "../telephonyAudioStreamManager";
import {
	type CallHistoryItem,
	type CallTransferType,
	type TelephonyStore,
	SLA_CALLBACK_WINDOW_MS,
	initialLine1,
	initialLine2,
	initialTransferState,
} from "../telephonyStoreTypes";
import { fetchCallHistoryAction } from "../telephonySlaAndLeadActions";

let acutePainCallSeq = 0;

export type SetState = StoreApi<TelephonyStore>["setState"];
export type GetState = StoreApi<TelephonyStore>["getState"];

/**
 * Перевод звонка (Transfer) на врача/администратора, фиксация исходов,
 * экстренная регистрация острой боли и завершение разговора (End Call).
 */
export function createCallTransferAndDtmfActions(set: SetState, get: GetState) {
	return {
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
				id: `pain-${now}-${++acutePainCallSeq}`,
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

		startCallTransfer: (targetExtension: string, transferType: CallTransferType = "blind") => {
			const { activeCall, callHistory, activeLineId, line1, line2 } = get();
			const updatedCallId = activeCall?.id || activeCall?.callId;
			if (transferType === "blind") {
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

				// Dispatch real SIP blind transfer to backend API
				try {
					const staffToken = readDenteStaffToken();
					const clinicToken = readDenteClinicToken();
					void fetch("/api/telephony/sip/transfer", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...(staffToken ? { "x-dente-staff-token": staffToken } : {}),
							...(clinicToken ? { "x-dente-clinic-token": clinicToken } : {}),
						},
						body: JSON.stringify({
							callId: updatedCallId || `call-${Date.now()}`,
							targetExtensionOrPhone: targetExtension,
							transferType: "blind",
						}),
					})
						.then(async (res) => {
							if (!res.ok) {
								const errData = (await res.json().catch(() => ({}))) as { message?: string };
								const errMsg = errData.message || `Ошибка перевода звонка (${res.status})`;
								console.warn("[Telephony] SIP transfer error:", errMsg);
								showToast(errMsg, "error");
							} else {
								showToast(`Звонок успешно переведён на ${targetExtension}`, "success");
							}
						})
						.catch((err) => {
							console.warn("[Telephony] SIP transfer network error:", err);
							showToast("Сетевая ошибка при переводе звонка", "error");
						});
				} catch (err) {
					console.warn("[Telephony] SIP transfer dispatch error:", err);
				}
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
			const callId = activeCall?.id || activeCall?.callId;
			const targetExtension = transferState.targetExtension;
			if (activeCall) {
				get().recordCallOutcome("transferred", `Переведён на доб. ${targetExtension}`);
			}
			if (targetExtension) {
				try {
					const staffToken = readDenteStaffToken();
					const clinicToken = readDenteClinicToken();
					void fetch("/api/telephony/sip/transfer", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...(staffToken ? { "x-dente-staff-token": staffToken } : {}),
							...(clinicToken ? { "x-dente-clinic-token": clinicToken } : {}),
						},
						body: JSON.stringify({
							callId: callId || `call-${Date.now()}`,
							targetExtensionOrPhone: targetExtension,
							transferType: "attended",
						}),
					})
						.then(async (res) => {
							if (!res.ok) {
								const errData = (await res.json().catch(() => ({}))) as { message?: string };
								const errMsg = errData.message || `Ошибка перевода звонка (${res.status})`;
								console.warn("[Telephony] Attended SIP transfer error:", errMsg);
								showToast(errMsg, "error");
							} else {
								showToast(`Звонок переведён на ${targetExtension}`, "success");
							}
						})
						.catch((err) => {
							console.warn("[Telephony] Attended SIP transfer network error:", err);
							showToast("Сетевая ошибка при переводе звонка", "error");
						});
				} catch (err) {
					console.warn("[Telephony] Attended SIP transfer dispatch error:", err);
				}
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
	};
}
