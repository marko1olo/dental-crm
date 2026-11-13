import type {
	CuratorFunnelStage,
	UpdateCuratorStagePayload,
} from "@dental/shared";
export { updateCuratorStagePayloadSchema } from "@dental/shared";
export type { UpdateCuratorStagePayload };

export interface CuratorStaffUser {
	readonly id: string;
	readonly fullName: string;
	readonly role: string;
}
