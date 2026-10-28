import { type LanP2PMessage, validateLanP2PMessage } from "@dental/shared";
import { logger } from "../../../utils/logger";

export const DEDUP_TTL_MS = 60_000;
export const MAX_SEEN_MESSAGE_IDS = 5_000;

export function recordSeenMessage(
	map: Map<string, number>,
	messageId: string,
	now: number = Date.now(),
): void {
	if (map.has(messageId)) map.delete(messageId);
	map.set(messageId, now);

	if (map.size > MAX_SEEN_MESSAGE_IDS) {
		const excess = map.size - MAX_SEEN_MESSAGE_IDS;
		let removed = 0;
		for (const oldId of map.keys()) {
			map.delete(oldId);
			removed++;
			if (removed >= excess) break;
		}
	}
}

export function cleanupOldSeenIds(map: Map<string, number>, now: number = Date.now()): void {
	for (const [id, time] of map.entries()) {
		if (now - time > DEDUP_TTL_MS) {
			map.delete(id);
		}
	}
}

export function validateIncomingP2PMessage(params: {
	raw: unknown;
	sourceTransport: string;
	currentNodeId: string;
	organizationId?: string;
	branchId?: string;
	seenMap: Map<string, number>;
}): LanP2PMessage | null {
	const validation = validateLanP2PMessage(params.raw);
	if (!validation.valid || !validation.message) {
		logger.warn(`[LanP2PDispatcher] Rejected malformed message from ${params.sourceTransport}:`, validation.error);
		return null;
	}

	const msg = validation.message;
	if (msg.senderNodeId === params.currentNodeId) return null;

	if (params.organizationId && (!msg.organizationId || msg.organizationId !== params.organizationId)) {
		logger.warn(`[LanP2PDispatcher] Rejected message from mismatched organization: expected '${params.organizationId}', got '${msg.organizationId}'`);
		return null;
	}

	if (params.branchId && msg.branchId && msg.branchId !== params.branchId) {
		logger.warn(`[LanP2PDispatcher] Rejected message from mismatched branch: expected '${params.branchId}', got '${msg.branchId}'`);
		return null;
	}

	const now = Date.now();
	if (params.seenMap.size > MAX_SEEN_MESSAGE_IDS / 2) {
		cleanupOldSeenIds(params.seenMap, now);
	}

	if (params.seenMap.has(msg.messageId)) return null;
	recordSeenMessage(params.seenMap, msg.messageId, now);

	return msg;
}
