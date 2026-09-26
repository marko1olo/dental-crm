import { create } from "zustand";
import type {
	CallTransferState,
	TelephonyLineSession,
	TelephonyStore,
} from "./telephonyTypes";

export * from "./telephonyTypes";
export * from "./telephonyHelpers";


const initialTransferState: CallTransferState = {
	isTransferring: false,
	targetExtension: "",
	transferType: "blind",
	status: "idle",
	failureReason: undefined,
};

const initialLine1: TelephonyLineSession = {
	lineId: 1,
	call: null,
	state: "idle",
	durationSeconds: 0,
	isMuted: false,
};

const initialLine2: TelephonyLineSession = {
	lineId: 2,
	call: null,
	state: "idle",
	durationSeconds: 0,
	isMuted: false,
};

let telephonyCallSeq = 0;

export const useTelephonyStore = create<TelephonyStore>((set, get) => ({
	activeCall: null,
	callHistory: [],
	agentState: "online",
	activeLineId: 1,
	isHeld: false,
	line1: initialLine1,
	line2: initialLine2,
	isCallHistoryModalOpen: false,
	isCallDrawerOpen: false,
	isMuted: false,
	volumeLevel: 0.8,
	playbackSpeed: 1,
	activeRecordingUrl: null,
	isPlayingRecording: false,
	transferState: initialTransferState,
	isWsConnected: false,

	setWsConnected: (isWsConnected) => set({ isWsConnected }),
	setAgentState: (agentState) => set({ agentState }),

	switchLine: (targetLineId) => {
		const { activeLineId, line1, line2 } = get();
		if (activeLineId === targetLineId) return;

		// When switching away from a connected call, put the previous line on hold
		let updatedLine1 = { ...line1 };
		let updatedLine2 = { ...line2 };

		if (activeLineId === 1 && line1.state === "connected") {
			updatedLine1 = { ...line1, state: "held" };
		} else if (activeLineId === 2 && line2.state === "connected") {
			updatedLine2 = { ...line2, state: "held" };
		}

		const targetLine = targetLineId === 1 ? updatedLine1 : updatedLine2;
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
		if (activeLineId === 1 && line1.call) {
			set({
				isHeld: true,
				line1: { ...line1, state: "held" },
			});
		} else if (activeLineId === 2 && line2.call) {
			set({
				isHeld: true,
				line2: { ...line2, state: "held" },
			});
		} else {
			set({ isHeld: true });
		}
	},

	unholdCall: () => {
		const { activeLineId, line1, line2 } = get();
		if (activeLineId === 1 && line1.call) {
			set({
				isHeld: false,
				line1: { ...line1, state: "connected" },
			});
		} else if (activeLineId === 2 && line2.call) {
			set({
				isHeld: false,
				line2: { ...line2, state: "connected" },
			});
		} else {
			set({ isHeld: false });
		}
	},

	toggleHold: () => {
		const { isHeld } = get();
		if (isHeld) {
			get().unholdCall();
		} else {
			get().holdCall();
		}
	},

	triggerIncomingCall: (call) => {
		const state = get();
		const now = Date.now();

		// Rapid duplicate suppression (within 2 seconds for identical callId or still ringing unhandled phone)
		const latestHistory = state.callHistory[0];
		if (
			latestHistory &&
			latestHistory.status === "ringing" &&
			!latestHistory.actionTaken &&
			latestHistory.callStartedAt &&
			now - latestHistory.callStartedAt < 2000 &&
			((call.callId && latestHistory.callId === call.callId) ||
				(!call.callId && latestHistory.phone === call.phone))
		) {
			return;
		}

		const id = call.callId || `call-${now}-${++telephonyCallSeq}`;
		const callStartedAt = call.callStartedAt ?? now;
		const incomingPayload: IncomingCallPayload = {
			...call,
			id,
			status: call.status ?? "ringing",
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
					new CustomEvent("dente-telephony-incoming-call", {
						detail: historyItem,
					}),
				);
			} catch {
				// ignore in non-browser environments
			}
		}

		// Two-line concurrency routing: line 1 vs line 2
		let assignedLineId: 1 | 2 = 1;
		let updatedLine1 = { ...state.line1 };
		let updatedLine2 = { ...state.line2 };

		if (state.line1.state === "idle") {
			assignedLineId = 1;
			updatedLine1 = {
				lineId: 1,
				call: incomingPayload,
				state: "ringing",
				durationSeconds: 0,
				isMuted: false,
			};
		} else if (state.line2.state === "idle") {
			assignedLineId = 2;
			updatedLine2 = {
				lineId: 2,
				call: incomingPayload,
				state: "ringing",
				durationSeconds: 0,
				isMuted: false,
			};
		} else {
			// Both lines busy: override secondary line or queue
			assignedLineId = state.activeLineId === 1 ? 2 : 1;
			if (assignedLineId === 2) {
				updatedLine2 = {
					lineId: 2,
					call: incomingPayload,
					state: "ringing",
					durationSeconds: 0,
					isMuted: false,
				};
			} else {
				updatedLine1 = {
					lineId: 1,
					call: incomingPayload,
					state: "ringing",
					durationSeconds: 0,
					isMuted: false,
				};
			}
		}

		const isCurrentlyInCall =
			Boolean(
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
		const updatedHistory = callHistory.map((item) => {
			if (
				(updatedCallId && (item.id === updatedCallId || item.callId === updatedCallId)) ||
				item.phone === activeCall.phone
			) {
				return { ...item, status: "answered" as const };
			}
			return item;
		});

		const updatedCall = { ...activeCall, status: "answered" as const };
		const updatedLine1 =
			activeLineId === 1
				? { ...line1, state: "connected" as const, call: updatedCall }
				: line1;
		const updatedLine2 =
			activeLineId === 2
				? { ...line2, state: "connected" as const, call: updatedCall }
				: line2;

		set({
			activeCall: updatedCall,
			line1: updatedLine1,
			line2: updatedLine2,
			callHistory: updatedHistory,
		});
	},

	connectCall: () => {
		const { activeCall, callHistory, activeLineId, line1, line2 } = get();
		if (!activeCall) return;

		const updatedCallId = activeCall.id || activeCall.callId;
		const updatedHistory = callHistory.map((item) => {
			if (
				(updatedCallId && (item.id === updatedCallId || item.callId === updatedCallId)) ||
				item.phone === activeCall.phone
			) {
				return { ...item, status: "connected" as const };
			}
			return item;
		});

		const updatedCall = { ...activeCall, status: "connected" as const };
		const updatedLine1 =
			activeLineId === 1
				? { ...line1, state: "connected" as const, call: updatedCall }
				: line1;
		const updatedLine2 =
			activeLineId === 2
				? { ...line2, state: "connected" as const, call: updatedCall }
				: line2;

		set({
			activeCall: updatedCall,
			line1: updatedLine1,
			line2: updatedLine2,
			callHistory: updatedHistory,
		});
	},

	acceptCall: () => {
		const { activeCall, callHistory, activeLineId, line1, line2 } = get();
		if (!activeCall) return;

		const updatedCallId = activeCall.id || activeCall.callId;
		const updatedHistory = callHistory.map((item) => {
			if (
				(updatedCallId && (item.id === updatedCallId || item.callId === updatedCallId)) ||
				item.phone === activeCall.phone
			) {
				return {
					...item,
					status: "answered" as const,
					actionTaken: "accepted" as const,
				};
			}
			return item;
		});

		const updatedLine1 = activeLineId === 1 ? initialLine1 : line1;
		const updatedLine2 = activeLineId === 2 ? initialLine2 : line2;

		set({
			activeCall: null,
			line1: updatedLine1,
			line2: updatedLine2,
			callHistory: updatedHistory,
			transferState: initialTransferState,
		});
	},

	rejectCall: () => {
		const { activeCall, callHistory, activeLineId, line1, line2 } = get();
		if (!activeCall) return;

		const updatedCallId = activeCall.id || activeCall.callId;
		const updatedHistory = callHistory.map((item) => {
			if (
				(updatedCallId && (item.id === updatedCallId || item.callId === updatedCallId)) ||
				item.phone === activeCall.phone
			) {
				return {
					...item,
					status: "rejected" as const,
					actionTaken: "rejected" as const,
				};
			}
			return item;
		});

		const updatedLine1 = activeLineId === 1 ? initialLine1 : line1;
		const updatedLine2 = activeLineId === 2 ? initialLine2 : line2;

		set({
			activeCall: null,
			line1: updatedLine1,
			line2: updatedLine2,
			callHistory: updatedHistory,
			transferState: initialTransferState,
		});
	},

	endCall: (recordingUrl?: string | null) => {
		const { activeCall, callHistory, activeLineId, line1, line2 } = get();
		if (!activeCall) return;

		const updatedCallId = activeCall.id || activeCall.callId;
		const resolvedRecUrl =
			recordingUrl || activeCall.recordingUrl || undefined;

		const updatedHistory = callHistory.map((item) => {
			if (
				(updatedCallId && (item.id === updatedCallId || item.callId === updatedCallId)) ||
				item.phone === activeCall.phone
			) {
				return {
					...item,
					status: "ended" as const,
					actionTaken: item.actionTaken || ("accepted" as const),
					recordingUrl: resolvedRecUrl || item.recordingUrl,
				};
			}
			return item;
		});

		const updatedLine1 = activeLineId === 1 ? initialLine1 : line1;
		const updatedLine2 = activeLineId === 2 ? initialLine2 : line2;

		set({
			activeCall: null,
			line1: updatedLine1,
			line2: updatedLine2,
			callHistory: updatedHistory,
		});
	},

	dismissCall: () => {
		const { activeCall, callHistory, activeLineId, line1, line2 } = get();
		if (!activeCall) return;

		const updatedCallId = activeCall.id || activeCall.callId;
		const updatedHistory = callHistory.map((item) => {
			if (
				(updatedCallId && (item.id === updatedCallId || item.callId === updatedCallId)) ||
				item.phone === activeCall.phone
			) {
				return { ...item, actionTaken: "dismissed" as const };
			}
			return item;
		});

		const updatedLine1 = activeLineId === 1 ? initialLine1 : line1;
		const updatedLine2 = activeLineId === 2 ? initialLine2 : line2;

		set({
			activeCall: null,
			line1: updatedLine1,
			line2: updatedLine2,
			callHistory: updatedHistory,
			transferState: initialTransferState,
		});
	},

	recordCallOutcome: (outcome, note) => {
		const { activeCall, callHistory } = get();
		const now = Date.now();
		const callbackDueAt =
			outcome === "callback_15m"
				? new Date(now + 15 * 60 * 1000).toISOString()
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
						status:
							outcome === "rejected" || outcome === "spam"
								? ("rejected" as const)
								: ("answered" as const),
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
					status:
						outcome === "rejected" || outcome === "spam"
							? ("rejected" as const)
							: ("answered" as const),
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

	logAcutePainCall: (phone, patientName, reason) => {
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

	startCallTransfer: (targetExtension, transferType = "blind") => {
		const { activeCall, callHistory, activeLineId, line1, line2 } = get();
		if (transferType === "blind") {
			const updatedCallId = activeCall?.id || activeCall?.callId;
			const updatedHistory = callHistory.map((item) => {
				if (
					(updatedCallId &&
						(item.id === updatedCallId || item.callId === updatedCallId)) ||
					(activeCall && item.phone === activeCall.phone)
				) {
					return {
						...item,
						actionTaken: "transferred" as const,
						outcome: "transferred" as const,
						transferTarget: targetExtension,
						outcomeNote: `Переведён на доб. ${targetExtension}`,
					};
				}
				return item;
			});

			const updatedLine1 = activeLineId === 1 ? initialLine1 : line1;
			const updatedLine2 = activeLineId === 2 ? initialLine2 : line2;

			set({
				activeCall: null,
				line1: updatedLine1,
				line2: updatedLine2,
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
			get().recordCallOutcome(
				"transferred",
				`Переведён на доб. ${transferState.targetExtension}`,
			);
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

	openCallHistoryModal: () => set({ isCallHistoryModalOpen: true }),
	closeCallHistoryModal: () => set({ isCallHistoryModalOpen: false }),

	setIsCallDrawerOpen: (isCallDrawerOpen) => set({ isCallDrawerOpen }),
	openCallDrawer: () => set({ isCallDrawerOpen: true }),
	closeCallDrawer: () => set({ isCallDrawerOpen: false }),
	toggleCallDrawer: () =>
		set((state) => ({ isCallDrawerOpen: !state.isCallDrawerOpen })),

	toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
	setVolumeLevel: (volumeLevel) =>
		set({ volumeLevel: Math.max(0, Math.min(1, volumeLevel)) }),
	setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
	cyclePlaybackSpeed: () => {
		const speeds: PlaybackSpeed[] = [1, 1.25, 1.5, 2];
		const current = get().playbackSpeed;
		const nextIndex = (speeds.indexOf(current) + 1) % speeds.length;
		set({ playbackSpeed: speeds[nextIndex] ?? 1 });
	},

	playRecording: (url) =>
		set({
			activeRecordingUrl: url,
			isPlayingRecording: true,
		}),

	stopRecording: () =>
		set({
			activeRecordingUrl: null,
			isPlayingRecording: false,
		}),

	clearHistory: () => set({ callHistory: [] }),
}));
