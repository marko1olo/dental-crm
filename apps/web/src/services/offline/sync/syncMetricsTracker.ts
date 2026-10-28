import { generateMutationUuid } from "./syncStorageBridge";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";

export const CLIENT_ID_STORAGE_KEY = "dente_client_instance_id_v1";

export function getOrCreateClientId(): string {
	if (typeof window === "undefined") {
		return "node-offline-client-0";
	}
	try {
		let id = safeLocalStorageGetItem(CLIENT_ID_STORAGE_KEY);
		if (!id) {
			id = `client-${generateMutationUuid()}`;
			safeLocalStorageSetItem(CLIENT_ID_STORAGE_KEY, id, true);
		}
		return id;
	} catch {
		return "browser-fallback-client";
	}
}

export function calculateBackoffDelay(
	attempt: number,
	baseMs = 500,
	maxMs = 10000,
	jitter = true,
): number {
	const exponential = Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, attempt)));
	if (!jitter) return Math.round(exponential);
	let rand = (Date.now() % 1000) / 1000;
	if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
		const u8 = new Uint8Array(1);
		crypto.getRandomValues(u8);
		rand = (u8[0] ?? 0) / 255;
	}
	const factor = 0.5 + rand * 0.5;
	return Math.max(50, Math.round(exponential * factor));
}
