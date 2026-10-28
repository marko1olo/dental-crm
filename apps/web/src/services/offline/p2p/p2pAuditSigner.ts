import {
	type LanP2PMessage,
	type StaffActionAuditEntry,
	createLanP2PMessage,
} from "@dental/shared";
import type { P2PNodeMeta } from "./p2pCitoNotifier";

export function buildStaffActionMessage(
	action: StaffActionAuditEntry,
	branchId: string | undefined,
	meta: P2PNodeMeta,
): LanP2PMessage<StaffActionAuditEntry> {
	return createLanP2PMessage({
		eventType: "staff_action_telemetry",
		senderNodeId: meta.nodeId,
		senderRole: meta.nodeRole,
		senderName: meta.nodeName,
		organizationId: meta.organizationId,
		branchId: branchId || meta.defaultBranchId,
		payload: action as unknown as Record<string, unknown>,
	}) as LanP2PMessage<StaffActionAuditEntry>;
}

export function buildPresencePingMessage(meta: P2PNodeMeta): LanP2PMessage {
	return createLanP2PMessage({
		eventType: "peer_presence_ping",
		senderNodeId: meta.nodeId,
		senderRole: meta.nodeRole,
		senderName: meta.nodeName,
		organizationId: meta.organizationId,
		branchId: meta.defaultBranchId,
		payload: {
			status: "online",
			pingedAt: new Date().toISOString(),
		},
	});
}
