/**
 * @dental/web/components/orthodontics/cephStudioSyncChannel.ts
 * Легковесный BroadcastChannel для синхронизации окон радиологии (Мандат 8b).
 */

import { clientLogger } from "../../services/logging/clientLogger";

export interface CephSyncMessage {
	type: string;
	patientId?: string | undefined;
	payload?: unknown;
}

export function getCephSessionStorageKey(patientId?: string): string {
	return patientId ? `dente_active_ceph_study_${patientId}` : "dente_active_ceph_study";
}

const CEPH_CHANNEL_NAME = "dente_ceph_sync";

export function cacheActiveCephStudy(study: { patientId?: string } | unknown, explicitPatientId?: string): void {
	if (typeof window === "undefined") return;
	const resolvedPatientId =
		explicitPatientId ??
		(study && typeof study === "object" && "patientId" in study && typeof (study as { patientId?: string }).patientId === "string"
			? (study as { patientId: string }).patientId
			: undefined);

	try {
		const key = getCephSessionStorageKey(resolvedPatientId);
		window.sessionStorage.setItem(key, JSON.stringify(study));
		broadcastCephSyncMessage({
			type: "CEPH_STUDY_CACHED",
			patientId: resolvedPatientId,
			payload: study,
		});
	} catch (e) {
		clientLogger.warn("Failed to cache active ceph study", e, { module: "cephStudioSyncChannel" });
	}
}

export function getActiveCephStudy<T = unknown>(patientId?: string): T | null {
	if (typeof window === "undefined") return null;
	try {
		const key = getCephSessionStorageKey(patientId);
		const raw = window.sessionStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		return null;
	}
}

export function clearActiveCephStudy(patientId?: string): void {
	if (typeof window === "undefined") return;
	try {
		const key = getCephSessionStorageKey(patientId);
		window.sessionStorage.removeItem(key);
		broadcastCephSyncMessage({
			type: "CEPH_STUDY_CLEARED",
			patientId,
		});
	} catch {
		// ignore
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
