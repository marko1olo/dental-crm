/**
 * apps/web/src/components/treatment-plans/curator/curatorApi.ts
 *
 * Сетевые запросы для сохранения профиля куратора.
 */

import type { CuratorPlanAssignmentPayload } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";

export async function persistCuratorAdministrativeProfile(
	payload: CuratorPlanAssignmentPayload,
): Promise<void> {
	try {
		await fetch(`/api/patients/${payload.patientId}/administrative-profile`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify({
				curatorId: payload.curatorId,
				curatorFullName: payload.curatorFullName,
				curatorAssignedAt: new Date().toISOString(),
				curatorFunnelStage: payload.initialStage,
				curatorCommissionPercent: payload.customCommissionPercent,
				curatorNotes: payload.notes,
			}),
		});
	} catch (err) {
		// Non-fatal if offline
	}
}
