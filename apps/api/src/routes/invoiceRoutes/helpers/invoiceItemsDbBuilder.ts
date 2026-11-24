import {
	type validatePlanToInvoice,
	kopecksToNumericString,
	kopecksToRubles,
} from "@dental/shared";
import type {
	CatalogRow,
	GenerateInvoiceItemInput,
	TreatmentPlanItemRow,
} from "../types.js";

export function buildTreatmentItemsToInsert(params: {
	validationReportItems: ReturnType<typeof validatePlanToInvoice>["items"];
	reqItems: GenerateInvoiceItemInput[];
	catalogRows: CatalogRow[];
	targetPlanDbItems: TreatmentPlanItemRow[];
	orgId: string;
	patientId: string;
	doctorUserId: string | undefined;
	invoiceNumber: string;
}) {
	const {
		validationReportItems,
		reqItems,
		catalogRows,
		targetPlanDbItems,
		orgId,
		patientId,
		doctorUserId,
		invoiceNumber,
	} = params;

	return validationReportItems.map((it, idx) => {
		const matchingCatalog = catalogRows.find(
			(c) => c.code === it.code804n || c.id === it.suggested804nAnalogue?.serviceId,
		);
		const reqItem = reqItems[idx];
		const matchingDbPlanItem = targetPlanDbItems.find((pi) => {
			if (reqItem?.serviceId && pi.priceId?.startsWith(reqItem.serviceId)) return true;
			if (it.nameRu && pi.priceId?.includes(it.nameRu)) return true;
			if (
				it.toothNumber !== null &&
				it.toothNumber !== undefined &&
				pi.toothNumber === it.toothNumber
			)
				return true;
			return false;
		});
		const rawDoctor =
			reqItem?.doctorId || matchingDbPlanItem?.doctorId || doctorUserId;
		const plannedDoctor =
			typeof rawDoctor === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawDoctor.trim())
				? rawDoctor.trim()
				: null;
		return {
			organizationId: orgId,
			patientId,
			serviceId: matchingCatalog?.id ?? null,
			toothCode: it.toothNumber ? String(it.toothNumber) : null,
			title: it.nameRu,
			quantity: String(it.quantity),
			unitPriceRub: kopecksToRubles(it.effectiveUnitPriceKopecks),
			priceRub: kopecksToRubles(it.effectiveLineNetKopecks),
			discountRub: kopecksToRubles(it.effectiveDiscountKopecks),
			status: "proposed" as const,
			plannedDoctorUserId: plannedDoctor,
			notes: `Наряд ${invoiceNumber}. Политика: ${it.selectedResolution}${
				it.clinicAbsorptionKopecks > 0
					? ` (Абсорбция клиники: ${kopecksToNumericString(it.clinicAbsorptionKopecks)} ₽)`
					: ""
			}`,
		};
	});
}
