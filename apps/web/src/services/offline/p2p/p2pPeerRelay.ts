import { logger } from "../../../utils/logger";
import { lanMeshReplicationService } from "../lanMeshReplicationService";

export function relayMessageToPeers(
	message: unknown,
	currentNodeId: string,
	customFetch?: typeof fetch,
): boolean {
	const knownPeers = lanMeshReplicationService.getKnownPeers();
	if (knownPeers.length === 0) return false;

	const fetchFn = customFetch || (typeof fetch !== "undefined" ? fetch : null);
	if (!fetchFn) return false;

	let sent = false;
	for (const peer of knownPeers) {
		if (peer.nodeId === currentNodeId) continue;
		try {
			const url = `${peer.baseUrl}/api/lan/p2p/dispatch`;
			fetchFn(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(message),
			}).catch((err: unknown) => {
				logger.warn("[LanP2PDispatcher] Peer relay fetch failed", err);
			});
			sent = true;
		} catch (err: unknown) {
			logger.warn("[LanP2PDispatcher] Error initiating peer relay", err);
		}
	}
	return sent;
}
