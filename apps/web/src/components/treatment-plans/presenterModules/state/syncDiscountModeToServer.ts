import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { logger } from "../../../../utils/logger";

export function syncDiscountModeToServer(
	patientId: string | undefined,
	planId: string | undefined,
	bodyPayload: Record<string, unknown>,
): void {
	if (!patientId || !planId) return;

	fetch(
		`/api/patients/${encodeURIComponent(patientId)}/treatment-plans/${encodeURIComponent(planId)}/discount-mode`,
		{
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify(bodyPayload),
		},
	).catch((err) => logger.warn("Не удалось сохранить скидку на сервере:", err));
}
