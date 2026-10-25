import { logger } from "../../../utils/logger";
import { safeLocalStorageSetItem } from "../../../lib/safeLocalStorage";
import {
	CEPH_SYNC_CHANNEL_NAME,
	CEPH_STORAGE_SYNC_KEY,
	type CephStudioSyncEventType,
	type CephStudioSyncMessage,
} from "./types";

const inMemoryListeners = new Set<(msg: CephStudioSyncMessage) => void>();

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

	for (const listener of inMemoryListeners) {
		try {
			listener(message as CephStudioSyncMessage<unknown>);
		} catch (err) {
			logger.warn("[CephSyncChannel] inMemoryListener dispatch error:", err);
		}
	}

	if (typeof window !== "undefined" && "BroadcastChannel" in window) {
		try {
			const bc = new BroadcastChannel(CEPH_SYNC_CHANNEL_NAME);
			bc.postMessage(message);
			bc.close();
		} catch (err) {
			logger.warn("[CephSyncChannel] BroadcastChannel postMessage failed, using storage fallback", err);
		}
	}

	if (typeof window !== "undefined" && window.localStorage) {
		try {
			const safeMessage = {
				...message,
				payload: type === "CEPH_LANDMARKS_UPDATED" ? payload : { ...message.payload },
			};
			safeLocalStorageSetItem(CEPH_STORAGE_SYNC_KEY, JSON.stringify(safeMessage));
		} catch (err) {
			logger.warn("[CephSyncChannel] LocalStorage sync fallback failed:", err);
		}
	}

	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(new CustomEvent(CEPH_SYNC_CHANNEL_NAME, { detail: message }));
		} catch {
			// ignore
		}
	}
}

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
		if (event.data?.type) callback(event.data);
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
		if (custom.detail) callback(custom.detail);
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
