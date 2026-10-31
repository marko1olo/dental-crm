/**
 * @dental/web/components/orthodontics/cephStudioSyncChannel.ts
 * Легковесный BroadcastChannel для синхронизации окон радиологии (Мандат 8b).
 */

export interface CephSyncMessage {
	type: string;
	payload?: unknown;
}

export function cacheActiveCephStudy(_study: unknown): void {}

export function subscribeCephSyncChannel(_handler: unknown): () => void {
	return () => {};
}

export function broadcastCephSyncMessage(msg: CephSyncMessage): void {
	if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
	try {
		const bc = new BroadcastChannel("dente_ceph_sync");
		bc.postMessage(msg);
		bc.close();
	} catch {
		// Офлайн
	}
}

export function subscribeToCephSyncMessages(handler: (msg: CephSyncMessage) => void): () => void {
	if (typeof window === "undefined" || !("BroadcastChannel" in window)) return () => {};
	try {
		const bc = new BroadcastChannel("dente_ceph_sync");
		bc.onmessage = (event) => handler(event.data);
		return () => bc.close();
	} catch {
		return () => {};
	}
}
