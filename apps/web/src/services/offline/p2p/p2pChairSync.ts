import {
	type LanChairStatus,
	type LanChairStatusEvent,
	type LanNodeRole,
	type LanP2PMessage,
	type VectorClock,
	createChairStatusEvent,
	createLanP2PMessage,
} from "@dental/shared";

export interface ChairStatusBroadcastParams {
	cabinetNumber: string | number;
	chairId: string;
	status: LanChairStatus;
	patientId?: string;
	patientName?: string;
	doctorId?: string;
	doctorName?: string;
	note?: string;
	branchId?: string;
	vectorClock?: VectorClock;
}

export function buildChairStatusMessage(
	params: ChairStatusBroadcastParams,
	meta: {
		nodeId: string;
		nodeRole: LanNodeRole;
		nodeName: string;
		organizationId: string;
		defaultBranchId?: string;
	},
): LanP2PMessage<LanChairStatusEvent> {
	const event = createChairStatusEvent(params);
	return createLanP2PMessage({
		eventType: "chair_status_changed",
		senderNodeId: meta.nodeId,
		senderRole: meta.nodeRole,
		senderName: meta.nodeName,
		organizationId: meta.organizationId,
		branchId: params.branchId || meta.defaultBranchId,
		payload: event as unknown as Record<string, unknown>,
		...(params.vectorClock ? { vectorClock: params.vectorClock } : {}),
	}) as LanP2PMessage<LanChairStatusEvent>;
}
