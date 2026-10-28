import { logger } from "../../../utils/logger";
import { BROADCAST_CHANNEL_NAME } from "./types";

export function createP2PBroadcastChannel(
	onMessage: (data: unknown) => void,
): BroadcastChannel | null {
	if (typeof BroadcastChannel === "undefined") return null;

	try {
		const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
		if (typeof (bc as unknown as { unref?: () => void })?.unref === "function") {
			(bc as unknown as { unref: () => void }).unref();
		}
		bc.onmessage = (event: MessageEvent) => {
			onMessage(event.data);
		};
		bc.onmessageerror = (err) => {
			logger.warn("[LanP2PDispatcher] BroadcastChannel error", err);
		};
		return bc;
	} catch (err) {
		logger.warn("[LanP2PDispatcher] BroadcastChannel not supported or failed to init", err);
		return null;
	}
}

export function broadcastViaChannel(channel: BroadcastChannel | null, message: unknown): boolean {
	if (!channel) return false;
	try {
		channel.postMessage(message);
		return true;
	} catch (err) {
		logger.warn("[LanP2PDispatcher] Failed to send via BroadcastChannel:", err);
		return false;
	}
}

export function closeP2PBroadcastChannel(channel: BroadcastChannel | null): void {
	if (!channel) return;
	try {
		channel.close();
	} catch (err: unknown) {
		logger.warn("[LanP2PDispatcher] Error closing BroadcastChannel", err);
	}
}
