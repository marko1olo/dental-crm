import { create } from "zustand";
import { isDemoShowcaseMode } from "../lib/demoMode";
import { getSharedTelephonyAudioStreamManager } from "./telephonyModules/telephonyAudioStreamManager";
import { createTelephonyCallActions } from "./telephonyModules/telephonyCallActions";
import {
	type PlaybackSpeed,
	type TelephonyStore,
	initialLine1,
	initialLine2,
	initialTransferState,
} from "./telephonyModules/telephonyStoreTypes";

export * from "./telephonyTypes";
export * from "./telephonyHelpers";
export * from "./telephonyModules/telephonyStoreTypes";
export * from "./telephonyModules/telephonyCallActions";

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

	...createTelephonyCallActions(set, get),

	openCallHistoryModal: () => set({ isCallHistoryModalOpen: true }),
	closeCallHistoryModal: () => set({ isCallHistoryModalOpen: false }),

	setIsCallDrawerOpen: (isCallDrawerOpen) => set({ isCallDrawerOpen }),
	openCallDrawer: () => set({ isCallDrawerOpen: true }),
	closeCallDrawer: () => set({ isCallDrawerOpen: false }),
	toggleCallDrawer: () =>
		set((state) => ({ isCallDrawerOpen: !state.isCallDrawerOpen })),

	toggleMute: () => {
		const nextMuted = !get().isMuted;
		try {
			getSharedTelephonyAudioStreamManager().setMicrophoneMute(nextMuted);
		} catch {}
		set({ isMuted: nextMuted });
	},
	setVolumeLevel: (volumeLevel) => {
		const clamped = Math.max(0, Math.min(1, volumeLevel));
		try {
			getSharedTelephonyAudioStreamManager().setStreamVolume(clamped);
		} catch {}
		set({ volumeLevel: clamped });
	},
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

export function resolveTelephonyWsUrl(): string {
	const configured = (
		import.meta as unknown as { env?: Record<string, string> }
	).env?.VITE_WS_URL;
	if (configured) return configured;
	if (typeof window === "undefined") return "";
	const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
	return `${protocol}//${window.location.host}/api/ws/telephony`;
}

/**
 * Резервный WS-адрес телефонии напрямую к API (мимо dev-прокси).
 * Нужен, когда vite-стенд поднят без ws-апгрейда (VITE_ENABLE_WS_PROXY !== "true"):
 * прокси принимает TCP, но рукопожатие висит, и события входящих звонков
 * TELEPHONY_INCOMING_CALL не доходят до софтфона.
 */
export function resolveTelephonyFallbackWsUrl(): string {
	const env = (import.meta as unknown as { env?: Record<string, string> }).env;
	if (env?.VITE_WS_URL) return "";
	if (typeof window === "undefined") return "";
	const apiOrigin = env?.VITE_API_ORIGIN || "http://127.0.0.1:4100";
	try {
		const parsed = new URL(apiOrigin);
		const scheme = parsed.protocol === "https:" ? "wss:" : "ws:";
		return `${scheme}//${parsed.host}/api/ws/telephony`;
	} catch {
		return "ws://127.0.0.1:4100/api/ws/telephony";
	}
}

if (typeof window !== "undefined") {
	(
		window as unknown as { __denteTelephonyStore?: typeof useTelephonyStore }
	).__denteTelephonyStore = useTelephonyStore;
}

/**
 * Валидатор защиты продакшена от спонтанных синтетических звонков (Zero-Mocks Invariant).
 * В боевом режиме (!isDemoShowcaseMode()) запрещены любые таймерные синтетические звонки.
 */
export function assertNoSyntheticCallsInProduction(): boolean {
	return !isDemoShowcaseMode();
}
