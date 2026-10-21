/**
 * apps/web/src/components/treatment-plans/qr/planVerificationPayload.ts
 *
 * Формирование верификационной строки для согласования плана лечения.
 */

import type { PlanVerificationQrPayloadData } from "./qrTypes";

export function generatePlanVerificationQrPayload(
	data: PlanVerificationQrPayloadData,
): string {
	const origin =
		data.baseUrl ||
		(typeof window !== "undefined" && window.location.origin
			? window.location.origin
			: "https://dente.clinic");

	const params = new URLSearchParams({
		plan: data.planNumber,
		pid: data.patientId,
		sum: String(data.totalAmountRub),
		tier: data.tierTitle,
		inn: data.clinicInn,
		lic: data.clinicLicense.slice(0, 20),
		ts: data.agreedAtIso || new Date().toISOString(),
	});

	return `${origin}/verify/treatment-plan?${params.toString()}`;
}
