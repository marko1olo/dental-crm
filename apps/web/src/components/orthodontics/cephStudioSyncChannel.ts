/**
 * @dental/web/components/orthodontics/cephStudioSyncChannel.ts
 * Легковесный BroadcastChannel для синхронизации окон радиологии (Мандат 8b).
 */

export interface CephSyncMessage {
	type: string;
	payload?: unknown;
}

const CEPH_STORAGE_KEY = "dente_active_ceph_study";
const CEPH_CHANNEL_NAME = "dente_ceph_sync";

export function cacheActiveCephStudy(study: unknown): void {
	if (typeof window === "undefined") return;
	try {
		window.sessionStorage.setItem(CEPH_STORAGE_KEY, JSON.stringify(study));
		broadcastCephSyncMessage({ type: "CEPH_STUDY_CACHED", payload: study });
	} catch (e) {
		console.warn("[CephSyncChannel] Failed to cache active ceph study:", e);
	}
}

export function getActiveCephStudy<T = unknown>(): T | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.sessionStorage.getItem(CEPH_STORAGE_KEY);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		return null;
	}
}

export function broadcastCephSyncMessage(msg: CephSyncMessage): void {
	if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
	try {
		const bc = new BroadcastChannel(CEPH_CHANNEL_NAME);
		bc.postMessage(msg);
		bc.close();
	} catch {
		// Офлайн
	}
}

export function subscribeToCephSyncMessages(handler: (msg: CephSyncMessage) => void): () => void {
	if (typeof window === "undefined" || !("BroadcastChannel" in window)) return () => {};
	try {
		const bc = new BroadcastChannel(CEPH_CHANNEL_NAME);
		bc.onmessage = (event: MessageEvent<CephSyncMessage>) => {
			if (event?.data) {
				handler(event.data);
			}
		};
		return () => {
			bc.close();
		};
	} catch {
		return () => {};
	}
}

export function subscribeCephSyncChannel(handler: (msg: CephSyncMessage) => void): () => void {
	return subscribeToCephSyncMessages(handler);
}
