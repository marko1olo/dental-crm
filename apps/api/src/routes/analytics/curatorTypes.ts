import type { CuratorFunnelStage } from "@dental/shared";

export interface UpdateCuratorStagePayload {
	readonly patientId: string;
	readonly stage: CuratorFunnelStage;
	readonly notes?: string | null | undefined;
	readonly curatorId?: string | null | undefined;
}

export interface CuratorStaffUser {
	readonly id: string;
	readonly fullName: string;
	readonly role: string;
}
