import type {
	PriceLockResolutionPolicy,
	validatePlanToInvoice,
} from "@dental/shared";
import type {
	CatalogRow,
	GenerateInvoiceFromPlanBody,
	GenerateInvoiceItemInput,
	TreatmentPlanItemRow,
} from "../types.js";

export function buildEffectiveItemResolutionOverrides(
	items: GenerateInvoiceItemInput[],
): Record<string, PriceLockResolutionPolicy> {
	const effectiveItemResolutionOverrides: Record<string, PriceLockResolutionPolicy> = {};
	items.forEach((it, idx) => {
		const itId = it.itemId || it.serviceId || `item-${idx + 1}`;
		if (it.resolutionPolicy) {
			effectiveItemResolutionOverrides[itId] = it.resolutionPolicy as PriceLockResolutionPolicy;
		}
	});
	return effectiveItemResolutionOverrides;
}

export function formatInvoiceNumber(
	documentType: GenerateInvoiceFromPlanBody["documentType"],
	patientId: string,
): string {
	const timestamp = Date.now().toString().slice(-6);
	const prefix =
		documentType === "work_order"
			? "НРД"
			: documentType === "completed_act"
				? "АКТ"
				: "СЧТ";
	return `${prefix}-${patientId.slice(0, 4).toUpperCase()}-${timestamp}`;
}

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
		const plannedDoctor =
			reqItem?.doctorId || matchingDbPlanItem?.doctorId || doctorUserId || null;
		return {
			organizationId: orgId,
			patientId,
			serviceId: matchingCatalog?.id ?? null,
			toothCode: it.toothNumber ? String(it.toothNumber) : null,
			title: it.nameRu,
			quantity: String(it.quantity),
			unitPriceRub: Number((it.effectiveUnitPriceKopecks / 100).toFixed(2)),
			priceRub: Number((it.effectiveLineNetKopecks / 100).toFixed(2)),
			discountRub: Number((it.effectiveDiscountKopecks / 100).toFixed(2)),
			status: "proposed" as const,
			plannedDoctorUserId: plannedDoctor,
			notes: `Наряд ${invoiceNumber}. Политика: ${it.selectedResolution}${
				it.clinicAbsorptionKopecks > 0
					? ` (Абсорбция клиники: ${(it.clinicAbsorptionKopecks / 100).toFixed(2)} ₽)`
					: ""
			}`,
		};
	});
}
