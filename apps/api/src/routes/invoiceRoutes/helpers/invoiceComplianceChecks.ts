import type {
	CatalogRow,
	GenerateInvoiceFromPlanBody,
	GenerateInvoiceItemInput,
	PatientRow,
	TreatmentPlanItemRow,
} from "../types.js";

export function evaluateOmsCompliance(
	data: GenerateInvoiceFromPlanBody,
	patient: PatientRow,
): { isOmsInvoice: boolean; isAnonPatient: boolean; hasValidOmsIdentity: boolean } {
	const isOmsInvoice =
		data.items.some(
			(it) =>
				(it.categoryRu &&
					(it.categoryRu.toLowerCase().includes("омс") ||
						it.categoryRu.toLowerCase().includes("oms"))) ||
				(it.nameRu &&
					(it.nameRu.toLowerCase().includes("омс") ||
						it.nameRu.toLowerCase().includes("oms"))) ||
				(it.code804n &&
					(it.code804n.toLowerCase().includes("омс") ||
						it.code804n.toLowerCase().includes("oms"))),
		) ||
		Boolean(
			data.notes &&
				(data.notes.toLowerCase().includes("омс") ||
					data.notes.toLowerCase().includes("oms")),
		);

	const adminProfile = (patient.administrativeProfile || {}) as Record<string, unknown>;
	const isAnonPatient =
		Boolean((patient as unknown as { isAnonymous?: boolean }).isAnonymous) ||
		Boolean(patient.fullName?.startsWith("UUID_ANON")) ||
		Boolean(patient.fullName?.toLowerCase().includes("аноним")) ||
		adminProfile["isAnonymous"] === true;

	const policyRaw =
		typeof adminProfile["insurancePolicyNumber"] === "string"
			? adminProfile["insurancePolicyNumber"].trim().replace(/\D/g, "")
			: "";
	const hasValidOmsIdentity = Boolean(
		adminProfile["identityDocument"] &&
			adminProfile["snils"] &&
			policyRaw.length === 16,
	);

	return { isOmsInvoice, isAnonPatient, hasValidOmsIdentity };
}

export function isServiceApprovedInPlanItems(
	item: GenerateInvoiceItemInput,
	planItems: Array<{ priceId: string | null }>,
): boolean {
	const itemServiceId = item.serviceId || item.analogueServiceId;
	return planItems.some((pi) => {
		if (!pi.priceId) return false;
		if (
			itemServiceId &&
			(pi.priceId === itemServiceId ||
				pi.priceId.startsWith(`${itemServiceId}::`))
		)
			return true;
		if (item.nameRu && pi.priceId.includes(item.nameRu)) return true;
		return false;
	});
}

export function findDiscountLimitViolation(
	items: GenerateInvoiceItemInput[],
	catalogRows: CatalogRow[],
	targetPlanDbItems: TreatmentPlanItemRow[],
): { nameRu: string; discountRub: number; lineGrossRub: number } | null {
	for (const it of items) {
		const matchingCatalog = catalogRows.find(
			(c) =>
				(it.serviceId && c.id === it.serviceId) ||
				(it.code804n && c.code === it.code804n) ||
				c.title.toLowerCase() === it.nameRu.toLowerCase(),
		);
		const matchingDbPlanItem = targetPlanDbItems.find(
			(pi) => pi.id === it.itemId || pi.priceId === it.serviceId,
		);
		const effectivePriceRub =
			it.effectiveUnitPriceRub ??
			it.planUnitPriceRub ??
			(matchingDbPlanItem ? Number(matchingDbPlanItem.price || 0) : undefined) ??
			it.unitPriceRub ??
			Number(matchingCatalog?.basePriceRub ?? 0);
		const lineGrossRub = Number((effectivePriceRub * it.quantity).toFixed(2));
		if (it.discountRub !== undefined && it.discountRub > lineGrossRub) {
			return {
				nameRu: it.nameRu,
				discountRub: it.discountRub,
				lineGrossRub,
			};
		}
	}
	return null;
}
