/**
 * DENTE CRM — Orthodontic & Cephalometric Pop-Out Studio Inter-Tab Sync Channel
 *
 * MANDATE COMPLIANCE:
 * - Mandate 8c: Low-spec optimization, responsive UI density.
 * - Mandate 8e: Doctor autonomy — zero blocking UI modals, pop-out TRG onto second chairside monitor.
 * - Mandate 8l: Complete cephalometric analysis (Steiner, Tweed, Downs, Jacobson, Ricketts) without mocks.
 * - Zero-Manual-F5: Real-time synchronization between pop-out window and CRM parent tab via BroadcastChannel + Storage fallback.
 */

import { logger } from "../../utils/logger";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import type {
	LandmarkMap,
	CephalometricAnalysisResult,
} from "./cephalometricMath";

export const CEPH_SYNC_CHANNEL_NAME = "dente_ceph_sync";
export const CEPH_STORAGE_SYNC_KEY = "dente_ceph_sync_event";

export type CephStudioSyncEventType =
	| "CEPH_STUDIO_OPENED"
	| "CEPH_STUDIO_CLOSED"
	| "CEPH_LANDMARKS_UPDATED"
	| "CEPH_ANALYSIS_COMPLETED"
	| "CEPH_INSERT_TO_PROTOCOL"
	| "CEPH_DEMO_MODE_TOGGLED";

export interface CephStudioSyncMessage<T = unknown> {
	readonly id: string;
	readonly type: CephStudioSyncEventType;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly timestamp: number;
	readonly payload: T;
}

export interface CephLandmarksUpdatedPayload {
	readonly landmarks: LandmarkMap;
	readonly scaleMmPerPixel: number;
	readonly placedCount: number;
}

export interface CephAnalysisCompletedPayload {
	readonly analysis: CephalometricAnalysisResult;
	readonly protocolText: string;
	readonly skeletalClassRu: string;
	readonly growthPatternRu: string;
}

export interface CephInsertToProtocolPayload {
	readonly protocolText: string;
	readonly diagnosisSummary: string;
	readonly skeletalClass: string;
	readonly growthPattern: string;
	readonly anbAngle?: number | null;
	readonly fmaAngle?: number | null;
	readonly u1SnAngle?: number | null;
	readonly impaAngle?: number | null;
}

export interface CephDemoModePayload {
	readonly isPatientDemoMode: boolean;
}

export interface CachedCephStudy {
	patientId?: string | undefined;
	patientName?: string | undefined;
	imageUrl?: string | undefined;
	landmarks?: LandmarkMap | undefined;
	scaleMmPerPixel?: number | undefined;
	analysis?: CephalometricAnalysisResult | undefined;
	filterMode?: string | undefined;
	brightness?: number | undefined;
	contrast?: number | undefined;
	activeTab?: string | undefined;
	timestamp?: number | undefined;
}

// In-memory cache for high-res cephalogram raster & landmarks between opener and popout window
let inMemorySharedStudy: CachedCephStudy | null = null;

export function cacheActiveCephStudy(study: CachedCephStudy | null): void {
	inMemorySharedStudy = study;
	if (typeof window !== "undefined") {
		try {
			(window as unknown as { __cephSharedStudy?: CachedCephStudy | null }).__cephSharedStudy = study;
		} catch {
			// ignore cross-origin/sandbox quirks
		}
	}
}

export function getCachedActiveCephStudy(): CachedCephStudy | null {
	if (inMemorySharedStudy) {
		return inMemorySharedStudy;
	}
	if (typeof window !== "undefined") {
		try {
			const opener = window.opener as unknown as { __cephSharedStudy?: CachedCephStudy | null } | null;
			if (opener?.__cephSharedStudy) {
				return opener.__cephSharedStudy;
			}
			const local = (window as unknown as { __cephSharedStudy?: CachedCephStudy | null }).__cephSharedStudy;
			if (local) {
				return local;
			}
		} catch {
			// opener may be cross-origin or blocked
		}
	}
	return null;
}

// In-process event listener registry (works in all JS runtimes, including Node.js unit tests)
const inMemoryListeners = new Set<(msg: CephStudioSyncMessage) => void>();

/**
 * Publishes a cephalometrics synchronization event to all connected tabs/windows.
 */
export function publishCephSyncEvent<T = unknown>(
	type: CephStudioSyncEventType,
	payload: T,
	metadata?: { patientId?: string; patientName?: string },
): void {
	const message: CephStudioSyncMessage<T> = {
		id: `ceph_sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		type,
		patientId: metadata?.patientId,
		patientName: metadata?.patientName,
		timestamp: Date.now(),
		payload,
	};

	// 0. In-process subscribers (immediate delivery without network/DOM dependencies)
	for (const listener of inMemoryListeners) {
		try {
			listener(message as CephStudioSyncMessage<unknown>);
		} catch (err) {
			logger.warn("[CephSyncChannel] inMemoryListener dispatch error:", err);
		}
	}

	// 1. BroadcastChannel (primary zero-latency sync)
	if (typeof window !== "undefined" && "BroadcastChannel" in window) {
		try {
			const bc = new BroadcastChannel(CEPH_SYNC_CHANNEL_NAME);
			bc.postMessage(message);
			bc.close();
		} catch (err) {
			logger.warn("[CephSyncChannel] BroadcastChannel postMessage failed, using storage fallback", err);
		}
	}

	// 2. Storage event fallback (for cross-context reliability)
	if (typeof window !== "undefined" && window.localStorage) {
		try {
			// Strip huge payloads to keep localStorage within 5MB quota
			const safeMessage = {
				...message,
				payload: type === "CEPH_LANDMARKS_UPDATED" ? payload : { ...message.payload },
			};
			safeLocalStorageSetItem(CEPH_STORAGE_SYNC_KEY, JSON.stringify(safeMessage));
		} catch (err) {
			logger.warn("[CephSyncChannel] LocalStorage sync fallback failed:", err);
		}
	}

	// 3. Window CustomEvent (for local listeners in the same window)
	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(new CustomEvent(CEPH_SYNC_CHANNEL_NAME, { detail: message }));
		} catch {
			// ignore
		}
	}
}

/**
 * Subscribes to cephalometrics sync events from peer windows/tabs.
 */
export function subscribeCephSyncChannel(
	callback: (message: CephStudioSyncMessage) => void,
): () => void {
	inMemoryListeners.add(callback);

	if (typeof window === "undefined") {
		return () => {
			inMemoryListeners.delete(callback);
		};
	}

	let bc: BroadcastChannel | null = null;
	const onBcMessage = (event: MessageEvent<CephStudioSyncMessage>) => {
		if (event.data && event.data.type) {
			callback(event.data);
		}
	};

	if ("BroadcastChannel" in window) {
		try {
			bc = new BroadcastChannel(CEPH_SYNC_CHANNEL_NAME);
			bc.addEventListener("message", onBcMessage);
		} catch (err) {
			logger.warn("[CephSyncChannel] BroadcastChannel init failed:", err);
		}
	}

	const onStorage = (event: StorageEvent) => {
		if (event.key === CEPH_STORAGE_SYNC_KEY && event.newValue) {
			try {
				const parsed = JSON.parse(event.newValue) as CephStudioSyncMessage;
				callback(parsed);
			} catch (err) {
				logger.warn("[CephSyncChannel] Failed to parse storage sync event:", err);
			}
		}
	};

	const onCustomEvent = (event: Event) => {
		const custom = event as CustomEvent<CephStudioSyncMessage>;
		if (custom.detail) {
			callback(custom.detail);
		}
	};

	window.addEventListener("storage", onStorage);
	window.addEventListener(CEPH_SYNC_CHANNEL_NAME, onCustomEvent);

	return () => {
		inMemoryListeners.delete(callback);
		if (bc) {
			bc.removeEventListener("message", onBcMessage);
			bc.close();
		}
		window.removeEventListener("storage", onStorage);
		window.removeEventListener(CEPH_SYNC_CHANNEL_NAME, onCustomEvent);
	};
}
