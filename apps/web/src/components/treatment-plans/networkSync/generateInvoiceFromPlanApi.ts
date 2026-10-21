import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import type { TreatmentPlanItem } from "../types";

export interface GenerateInvoiceFromPlanApiParams {
	patientId: string;
	resolvedPlanId: string | undefined;
	planTitle: string;
	allItems: readonly TreatmentPlanItem[];
	notes: string;
}

export interface GenerateInvoiceResult {
	invoiceId?: string;
	invoiceNumber?: string;
	finalNetTotalRub?: number;
}

export async function callGenerateInvoiceFromPlanApi(
	params: GenerateInvoiceFromPlanApiParams,
): Promise<GenerateInvoiceResult | null> {
	try {
		const res = await fetch("/api/invoices/generate-from-plan", {
			method: "POST",
			headers: { ...denteAdminSecretRequestHeaders(), "Content-Type": "application/json" },
			body: JSON.stringify({
				patientId: params.patientId,
				planId: params.resolvedPlanId,
				planNumber: params.resolvedPlanId
					? `ПЛАН-№${params.resolvedPlanId.slice(0, 8).toUpperCase()}`
					: undefined,
				planTitle: params.planTitle,
				documentType: "invoice",
				items: params.allItems.map((it, idx) => ({
					itemId: it.id || `item-${idx}`,
					toothNumber: it.toothNumber ?? null,
					nameRu: it.name,
					quantity: it.quantity || 1,
					unitPriceRub: it.unitPriceRub || 0,
					discountRub: it.discountRub || 0,
					code804n: it.code804n || undefined,
					doctorId: it.doctorId ?? null,
				})),
				allowUnplannedServices: true,
				notes: params.notes,
			}),
		});

		if (!res.ok) {
			const errJson = await res.json().catch(() => ({}));
			const errorMsg = errJson.message || `Ошибка сервера (HTTP ${res.status})`;
			showToast(`Ошибка отправки счета в кассу: ${errorMsg}`, "error", 5000);
			return null;
		}

		const createdData = await res.json();
		return {
			invoiceId: createdData?.invoiceId,
			invoiceNumber: createdData?.invoiceNumber,
			finalNetTotalRub:
				typeof createdData?.totalNetRub === "number"
					? createdData.totalNetRub
					: undefined,
		};
	} catch (networkErr: any) {
		logger.error("[treatmentPlanNetworkSync] Ошибка сети при генерации счёта", networkErr);
		showToast(`Сетевая ошибка при отправке счета в кассу: ${networkErr?.message || networkErr}`, "error", 5000);
		return null;
	}
}
