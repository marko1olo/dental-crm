/**
 * DENTE CRM — Cross-Tab State Synchronization Engine
 *
 * Provides instantaneous (<10ms) state synchronization between adjacent open browser tabs
 * without requiring manual page reload (F5):
 * 1. Visit status changes (e.g. "in_treatment", "completed", "cancelled")
 * 2. Patient balance updates (cash payments, card POS, SBP QR, deposits)
 * 3. Clinical entity updates (odontogram findings, diary autosave snapshots)
 *
 * Dual-Transport Reliability:
 * - Primary: BroadcastChannel ("dente_cross_tab_sync_v1")
 * - Secondary/Fallback: localStorage ("dente_crosstab_sync_event_v1") via storage event
 * - Self-Echo Suppression: sourceTabId filtering prevents tabs from handling their own events
 * - Deduplication: 30s LRU cache prevents double-processing across dual transports
 */

import { logger } from "../../utils/logger";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import type {
	ClinicalEntityChangedPayload,
	CrossTabSyncEvent,
	CrossTabSyncEventType,
	PatientBalanceChangedPayload,
	VisitStatusChangedPayload,
} from "./storageTypes";

export const CROSS_TAB_CHANNEL_NAME = "dente_cross_tab_sync_v1";
export const LOCAL_STORAGE_CROSS_TAB_KEY = "dente_crosstab_sync_event_v1";

let tabInstanceId = "";
export function getCrossTabInstanceId(): string {
	if (!tabInstanceId) {
		tabInstanceId = `tab-${Math.random().toString(36).slice(2, 9)}-${Date.now()}`;
	}
	return tabInstanceId;
}

let broadcastChannelInstance: BroadcastChannel | null = null;
let isStorageListenerAttached = false;

const seenEventIds = new Map<string, number>();
const SEEN_EVENT_TTL_MS = 30_000;
const MAX_SEEN_EVENTS = 1_000;

const visitStatusListeners = new Set<(payload: VisitStatusChangedPayload) => void>();
const patientBalanceListeners = new Set<(payload: PatientBalanceChangedPayload) => void>();
const clinicalEntityListeners = new Set<(payload: ClinicalEntityChangedPayload) => void>();
const anyEventListeners = new Set<(event: CrossTabSyncEvent) => void>();

let totalSentCount = 0;
let totalReceivedCount = 0;
let lastReceivedEventIso: string | null = null;

function cleanupSeenEventIds(nowMs: number): void {
	if (seenEventIds.size > MAX_SEEN_EVENTS) {
		for (const [id, time] of seenEventIds.entries()) {
			if (nowMs - time > SEEN_EVENT_TTL_MS) {
				seenEventIds.delete(id);
			}
		}
	}
}

function handleIncomingCrossTabEvent(rawEvent: unknown): void {
	if (!rawEvent || typeof rawEvent !== "object") return;
	const event = rawEvent as CrossTabSyncEvent;

	if (!event.eventId || !event.type || !event.sourceTabId) return;

	// 1. Filter out own tab echoes
	if (event.sourceTabId === getCrossTabInstanceId()) return;

	// 2. Deduplicate events delivered by both BroadcastChannel & localStorage
	const nowMs = Date.now();
	if (seenEventIds.has(event.eventId)) return;
	seenEventIds.set(event.eventId, nowMs);
	cleanupSeenEventIds(nowMs);

	totalReceivedCount++;
	lastReceivedEventIso = new Date().toISOString();

	// 3. Dispatch to internal listener callbacks
	try {
		anyEventListeners.forEach((listener) => {
			try {
				listener(event);
			} catch (err) {
				logger.warn("[CrossTabSync] Error in anyEvent listener:", err);
			}
		});

		switch (event.type) {
			case "visit_status_changed": {
				const payload = event.payload as VisitStatusChangedPayload;
				visitStatusListeners.forEach((listener) => {
					try {
						listener(payload);
					} catch (err) {
						logger.warn("[CrossTabSync] Error in visitStatus listener:", err);
					}
				});

				if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
					window.dispatchEvent(
						new CustomEvent("dente-cross-tab-visit-status-changed", {
							detail: payload,
						}),
					);
				}
				break;
			}
			case "patient_balance_changed": {
				const payload = event.payload as PatientBalanceChangedPayload;
				patientBalanceListeners.forEach((listener) => {
					try {
						listener(payload);
					} catch (err) {
						logger.warn("[CrossTabSync] Error in patientBalance listener:", err);
					}
				});

				if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
					window.dispatchEvent(
						new CustomEvent("dente-cross-tab-patient-balance-changed", {
							detail: payload,
						}),
					);
				}
				break;
			}
			case "clinical_entity_changed": {
				const payload = event.payload as ClinicalEntityChangedPayload;
				clinicalEntityListeners.forEach((listener) => {
					try {
						listener(payload);
					} catch (err) {
						logger.warn("[CrossTabSync] Error in clinicalEntity listener:", err);
					}
				});

				if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
					window.dispatchEvent(
						new CustomEvent("dente-cross-tab-clinical-entity-changed", {
							detail: payload,
						}),
					);
				}
				break;
			}
		}
	} catch (err) {
		logger.warn("[CrossTabSync] Error dispatching incoming event:", err);
	}
}

function initBroadcastChannel(): void {
	if (broadcastChannelInstance) return;
	if (typeof BroadcastChannel !== "undefined") {
		try {
			broadcastChannelInstance = new BroadcastChannel(CROSS_TAB_CHANNEL_NAME);
			if (typeof (broadcastChannelInstance as unknown as { unref?: () => void }).unref === "function") {
				(broadcastChannelInstance as unknown as { unref: () => void }).unref();
			}
			broadcastChannelInstance.onmessage = (e: MessageEvent) => {
				handleIncomingCrossTabEvent(e.data);
			};
			broadcastChannelInstance.onmessageerror = (err) => {
				logger.warn("[CrossTabSync] BroadcastChannel error:", err);
			};
		} catch (err) {
			logger.warn("[CrossTabSync] BroadcastChannel initialization failed:", err);
			broadcastChannelInstance = null;
		}
	}
}

function initStorageEventListener(): void {
	if (isStorageListenerAttached || typeof window === "undefined" || !window.addEventListener) return;
	isStorageListenerAttached = true;
	window.addEventListener("storage", (e: StorageEvent) => {
		if (e.key === LOCAL_STORAGE_CROSS_TAB_KEY && e.newValue) {
			try {
				const parsed = JSON.parse(e.newValue);
				handleIncomingCrossTabEvent(parsed);
			} catch (err) {
				logger.debug("[CrossTabSync] Error parsing storage event payload:", err);
			}
		}
	});
}

/**
 * Initializes cross-tab synchronization listeners on app startup.
 */
export function ensureCrossTabSyncInitialized(): void {
	initBroadcastChannel();
	initStorageEventListener();
}

/**
 * Broadcasts a cross-tab event across open browser tabs using dual transports.
 */
export function broadcastCrossTabEvent<T>(
	type: CrossTabSyncEventType,
	payload: T,
): CrossTabSyncEvent<T> {
	ensureCrossTabSyncInitialized();

	const eventId = `cte-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
	const event: CrossTabSyncEvent<T> = {
		eventId,
		type,
		payload,
		timestamp: Date.now(),
		sourceTabId: getCrossTabInstanceId(),
	};

	// Mark in local dedup so we never process our own event if storage event reflects
	seenEventIds.set(eventId, Date.now());
	totalSentCount++;

	// 1. Primary: BroadcastChannel
	if (broadcastChannelInstance) {
		try {
			broadcastChannelInstance.postMessage(event);
		} catch (err) {
			logger.warn("[CrossTabSync] Failed to post to BroadcastChannel:", err);
		}
	}

	// 2. Secondary/Fallback: localStorage storage event
	try {
		const serialized = JSON.stringify(event);
		safeLocalStorageSetItem(LOCAL_STORAGE_CROSS_TAB_KEY, serialized);
	} catch (err) {
		logger.debug("[CrossTabSync] Failed to mirror event to localStorage:", err);
	}

	return event;
}

/**
 * Broadcasts a visit status change to all other open tabs.
 */
export function broadcastVisitStatusChange(
	payload: Omit<VisitStatusChangedPayload, "sourceTabId">,
): CrossTabSyncEvent<VisitStatusChangedPayload> {
	return broadcastCrossTabEvent<VisitStatusChangedPayload>("visit_status_changed", {
		...payload,
		sourceTabId: getCrossTabInstanceId(),
	});
}

/**
 * Broadcasts a patient balance change to all other open tabs.
 */
export function broadcastPatientBalanceChange(
	payload: Omit<PatientBalanceChangedPayload, "sourceTabId">,
): CrossTabSyncEvent<PatientBalanceChangedPayload> {
	return broadcastCrossTabEvent<PatientBalanceChangedPayload>("patient_balance_changed", {
		...payload,
		sourceTabId: getCrossTabInstanceId(),
	});
}

/**
 * Broadcasts a generic clinical entity update to all other open tabs.
 */
export function broadcastClinicalEntityChange(
	payload: Omit<ClinicalEntityChangedPayload, "sourceTabId">,
): CrossTabSyncEvent<ClinicalEntityChangedPayload> {
	return broadcastCrossTabEvent<ClinicalEntityChangedPayload>("clinical_entity_changed", {
		...payload,
		sourceTabId: getCrossTabInstanceId(),
	});
}

/**
 * Registers a listener for cross-tab visit status updates.
 */
export function onCrossTabVisitStatusChange(
	listener: (payload: VisitStatusChangedPayload) => void,
): () => void {
	ensureCrossTabSyncInitialized();
	visitStatusListeners.add(listener);
	return () => {
		visitStatusListeners.delete(listener);
	};
}

/**
 * Registers a listener for cross-tab patient balance updates.
 */
export function onCrossTabPatientBalanceChange(
	listener: (payload: PatientBalanceChangedPayload) => void,
): () => void {
	ensureCrossTabSyncInitialized();
	patientBalanceListeners.add(listener);
	return () => {
		patientBalanceListeners.delete(listener);
	};
}

/**
 * Registers a listener for cross-tab clinical entity updates.
 */
export function onCrossTabClinicalEntityChange(
	listener: (payload: ClinicalEntityChangedPayload) => void,
): () => void {
	ensureCrossTabSyncInitialized();
	clinicalEntityListeners.add(listener);
	return () => {
		clinicalEntityListeners.delete(listener);
	};
}

/**
 * Registers a listener for any cross-tab event.
 */
export function onAnyCrossTabEvent(
	listener: (event: CrossTabSyncEvent) => void,
): () => void {
	ensureCrossTabSyncInitialized();
	anyEventListeners.add(listener);
	return () => {
		anyEventListeners.delete(listener);
	};
}

export interface CrossTabSyncStatus {
	tabId: string;
	isBroadcastChannelActive: boolean;
	totalSentCount: number;
	totalReceivedCount: number;
	lastReceivedEventIso: string | null;
}

export function getCrossTabSyncStatus(): CrossTabSyncStatus {
	return {
		tabId: getCrossTabInstanceId(),
		isBroadcastChannelActive: broadcastChannelInstance !== null,
		totalSentCount,
		totalReceivedCount,
		lastReceivedEventIso,
	};
}

/**
 * Resets cross-tab sync state (used in automated unit tests).
 */
export function resetCrossTabSyncForTesting(): void {
	if (broadcastChannelInstance) {
		try {
			broadcastChannelInstance.close();
		} catch {
			// ignore
		}
		broadcastChannelInstance = null;
	}
	visitStatusListeners.clear();
	patientBalanceListeners.clear();
	clinicalEntityListeners.clear();
	anyEventListeners.clear();
	seenEventIds.clear();
	totalSentCount = 0;
	totalReceivedCount = 0;
	lastReceivedEventIso = null;
	tabInstanceId = "";
	isStorageListenerAttached = false;
}
