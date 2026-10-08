/**
 * DENTE CRM — Radiology Pop-Out Window & Studio Inter-Tab Sync Channel
 *
 * MANDATE COMPLIANCE:
 * - Mandate 8e: Doctor autonomy — zero blocking UI modals, pop-out CBCT onto second monitor.
 * - Mandate 8l: Complete radiology PACS functionality without synthetic mocks.
 * - Zero-Manual-F5: Real-time synchronization between pop-out window and CRM parent tab via BroadcastChannel + Storage fallback.
 */

import { logger } from "../../../utils/logger";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";
import type { CbctVoxelVolume } from "../cbctMprMath";

export const CBCT_SYNC_CHANNEL_NAME = "dente_cbct_sync";
export const CBCT_STORAGE_SYNC_KEY = "dente_cbct_sync_event";
export const CBCT_SESSION_CACHE_PREFIX = "dente_cbct_session_";

export type CbctStudioSyncEventType =
	| "IMPLANT_PLACED"
	| "NERVE_TRACED"
	| "CALIPER_MEASURED"
	| "STUDIO_CLOSED"
	| "STUDIO_SNAPSHOT_SAVED"
	| "STUDIO_OPENED";

export interface CbctStudioSyncMessage<T = unknown> {
	readonly id: string;
	readonly type: CbctStudioSyncEventType;
	readonly studyId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly timestamp: number;
	readonly payload: T;
}

export interface ImplantPlacedPayload {
	readonly brand: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly toothFdi: number | string;
	readonly entryPoint?: { x: number; y: number } | undefined;
	readonly apexPoint?: { x: number; y: number } | undefined;
	readonly angulationDeg?: number | undefined;
	readonly nerveSafetyMarginMm?: number | undefined;
	readonly boneQuality?: string | undefined;
	readonly summaryText?: string | undefined;
}

export interface NerveTracedPayload {
	readonly side: "left" | "right";
	readonly pointsCount: number;
	readonly lengthMm: number;
	readonly points?: Array<{ x: number; y: number; z: number }> | undefined;
}

export interface CaliperMeasuredPayload {
	readonly toothFdi?: number | string | undefined;
	readonly ridgeWidthMm: number;
	readonly crestHeightMm: number;
	readonly boneDensityHU?: number | undefined;
	readonly label?: string | undefined;
}

export interface StudioSnapshotPayload {
	readonly snapshotDataUri?: string | undefined;
	readonly toothFdi?: string | number | undefined;
	readonly protocolNote?: string | undefined;
	readonly capturedAtIso: string;
}

export interface StudioClosedPayload {
	readonly reason?: string | undefined;
	readonly durationSeconds?: number | undefined;
}

// In-memory cache for shared volumes between opener and popout window
let inMemorySharedVolume: CbctVoxelVolume | null = null;

export function cacheActiveCbctVolume(volume: CbctVoxelVolume | null): void {
	inMemorySharedVolume = volume;
	if (typeof window !== "undefined") {
		try {
			(window as unknown as { __cbctSharedVolume?: CbctVoxelVolume | null }).__cbctSharedVolume = volume;
		} catch {
			// ignore cross-origin/sandbox quirks
		}
	}
}

export function getCachedActiveCbctVolume(): CbctVoxelVolume | null {
	if (inMemorySharedVolume) return inMemorySharedVolume;
	if (typeof window !== "undefined") {
		const win = window as unknown as { __cbctSharedVolume?: CbctVoxelVolume };
		if (win.__cbctSharedVolume) return win.__cbctSharedVolume;
		try {
			const opener = window.opener as unknown as {
				__cbctSharedVolume?: CbctVoxelVolume;
				__cbctActiveVolume?: CbctVoxelVolume;
				__cbctDemoVolume?: CbctVoxelVolume;
			} | null;
			if (opener?.__cbctSharedVolume) return opener.__cbctSharedVolume;
			if (opener?.__cbctActiveVolume) return opener.__cbctActiveVolume;
			if (opener?.__cbctDemoVolume) return opener.__cbctDemoVolume;
		} catch {
			// Window opener may be blocked or cross-origin
		}
	}
	return null;
}

// BroadcastChannel instance singleton
const inMemorySubscribers = new Set<(message: CbctStudioSyncMessage<any>) => void>();
let broadcastChannelInstance: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
	const BC =
		typeof BroadcastChannel !== "undefined"
			? BroadcastChannel
			: typeof globalThis !== "undefined" && typeof globalThis.BroadcastChannel !== "undefined"
				? globalThis.BroadcastChannel
				: null;
	if (!BC) {
		return null;
	}
	if (!broadcastChannelInstance) {
		try {
			broadcastChannelInstance = new BC(CBCT_SYNC_CHANNEL_NAME);
		} catch (err: unknown) {
			logger.warn("[cbctStudioSyncChannel] BroadcastChannel initialization failed:", err);
			broadcastChannelInstance = null;
		}
	}
	return broadcastChannelInstance;
}

/**
 * Publishes a CBCT radiology studio synchronization event across all windows and tabs.
 */
export function publishCbctSyncEvent<T = unknown>(
	type: CbctStudioSyncEventType,
	payload: T,
	metadata?: Partial<Omit<CbctStudioSyncMessage<T>, "id" | "type" | "timestamp" | "payload">>,
): CbctStudioSyncMessage<T> {
	const message: CbctStudioSyncMessage<T> = {
		id: `cbct_sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		type,
		studyId: metadata?.studyId,
		patientId: metadata?.patientId,
		patientName: metadata?.patientName,
		timestamp: Date.now(),
		payload,
	};

	// 0. Immediate in-process / intra-window subscribers (0ms latency, works in all environments)
	for (const sub of inMemorySubscribers) {
		try {
			sub(message);
		} catch (err: unknown) {
			logger.warn("[cbctStudioSyncChannel] inMemorySubscriber error:", err);
		}
	}

	// 1. BroadcastChannel (cross-tab / secondary window, native HTML5)
	const channel = getBroadcastChannel();
	if (channel) {
		try {
			channel.postMessage(message);
		} catch (err: unknown) {
			logger.warn("[cbctStudioSyncChannel] postMessage failed:", err);
		}
	}

	// 2. localStorage fallback for cross-tab notification in restricted sandboxes
	try {
		safeLocalStorageSetItem(CBCT_STORAGE_SYNC_KEY, JSON.stringify(message));
	} catch {
		// Quota exceeded or private browsing
	}

	return message;
}

/**
 * Subscribes to CBCT radiology studio synchronization events from any window or tab.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeCbctSyncEvents(
	handler: (message: CbctStudioSyncMessage<any>) => void,
): () => void {
	// Register for intra-process / intra-window notifications
	inMemorySubscribers.add(handler);

	if (typeof window === "undefined") {
		return () => {
			inMemorySubscribers.delete(handler);
		};
	}

	// 1. BroadcastChannel listener (inter-window / inter-tab)
	const channel = getBroadcastChannel();
	const onChannelMessage = (ev: MessageEvent<CbctStudioSyncMessage<any>>) => {
		if (ev?.data && ev.data.type) {
			handler(ev.data);
		}
	};
	channel?.addEventListener("message", onChannelMessage);

	// 2. localStorage storage event listener (cross-tab fallback)
	const onStorageEvent = (ev: StorageEvent) => {
		if (ev.key === CBCT_STORAGE_SYNC_KEY && ev.newValue) {
			try {
				const parsed = JSON.parse(ev.newValue) as CbctStudioSyncMessage<any>;
				if (parsed && parsed.type) {
					handler(parsed);
				}
			} catch {
				// invalid payload
			}
		}
	};
	window.addEventListener("storage", onStorageEvent);

	return () => {
		inMemorySubscribers.delete(handler);
		channel?.removeEventListener("message", onChannelMessage);
		window.removeEventListener("storage", onStorageEvent);
	};
}

/**
 * Persists CBCT session state into localStorage/sessionStorage.
 */
export function saveCbctSessionState<T = unknown>(key: string, data: T): void {
	try {
		safeLocalStorageSetItem(`${CBCT_SESSION_CACHE_PREFIX}${key}`, JSON.stringify(data));
	} catch (err: unknown) {
		logger.warn("[cbctStudioSyncChannel] saveCbctSessionState failed:", err);
	}
}

/**
 * Restores CBCT session state from storage.
 */
export function loadCbctSessionState<T = unknown>(key: string): T | null {
	try {
		const raw = safeLocalStorageGetItem(`${CBCT_SESSION_CACHE_PREFIX}${key}`);
		if (!raw) return null;
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}
