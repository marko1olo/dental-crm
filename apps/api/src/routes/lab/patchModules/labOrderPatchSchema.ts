import { z } from "zod";
import type { LabOrderStatus } from "../../../db/labQuery.js";
import { mapStageToLabOrderStatus } from "../types.js";

export const labOrderPatchSchema = z.object({
	stage: z.string().trim().optional(),
	status: z.string().trim().optional(),
	notes: z.string().trim().max(2000).optional().nullable(),
	clinicalNotes: z.string().trim().max(2000).optional().nullable(),
	labComments: z.string().trim().max(2000).optional().nullable(),
	dueDate: z.string().optional().nullable(),
});

export type LabOrderPatchBody = z.infer<typeof labOrderPatchSchema>;

export function resolveTargetLabStatus(body: LabOrderPatchBody): LabOrderStatus | undefined {
	if (body.status) {
		const mapped = mapStageToLabOrderStatus(body.status);
		return mapped ?? (body.status as LabOrderStatus);
	}
	if (body.stage) {
		const mapped = mapStageToLabOrderStatus(body.stage);
		if (mapped) return mapped;
	}
	return undefined;
}
