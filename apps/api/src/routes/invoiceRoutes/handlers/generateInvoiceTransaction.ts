import { randomUUID } from "node:crypto";
import type { validatePlanToInvoice } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import { invoiceItems, patientInvoices } from "../../../db/schema/billing.js";
import { treatmentItems, treatmentPlans } from "../../../db/schema/clinical.js";
import { buildTreatmentItemsToInsert } from "../invoiceCalculationHelpers.js";
import type {
	CatalogRow,
	GenerateInvoiceFromPlanBody,
	TreatmentPlanItemRow,
} from "../types.js";

/** Executes ACID transaction inserting invoice and associated treatment items */
export async function executeGenerateInvoiceTransaction(params: {
	orgId: string;
	data: GenerateInvoiceFromPlanBody;
	totalNetRub: number;
	invoiceNumber: string;
	validationReport: ReturnType<typeof validatePlanToInvoice>;
	catalogRows: CatalogRow[];
	targetPlanDbItems: TreatmentPlanItemRow[];
}): Promise<{ invoiceId: string; createdItemIds: string[] }> {
	const {
		orgId,
		data,
		totalNetRub,
		invoiceNumber,
		validationReport,
		catalogRows,
		targetPlanDbItems,
	} = params;

	const invoiceId = randomUUID();
	const createdItemIds: string[] = [];

	await withTenantCtx(orgId, async (tx) => {
		if (data.planId) {
			await tx
				.select()
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.id, data.planId),
						eq(treatmentPlans.organizationId, orgId),
					),
				)
				.for("update")
				.limit(1);
		}

		await tx.insert(patientInvoices).values({
			id: invoiceId,
			organizationId: orgId,
			patientId: data.patientId,
			treatmentPlanId: data.planId ?? null,
			totalRub: String(totalNetRub),
			totalAmountRub: totalNetRub,
			status: "draft",
			issuedAt: new Date(),
		});

		if (validationReport.items.length > 0) {
			const itemsToInsert = buildTreatmentItemsToInsert({
				validationReportItems: validationReport.items,
				reqItems: data.items,
				catalogRows,
				targetPlanDbItems,
				orgId,
				patientId: data.patientId,
				doctorUserId: data.doctorUserId,
				invoiceNumber,
			});

			const insertedRows = await tx
				.insert(treatmentItems)
				.values(itemsToInsert)
				.returning({ id: treatmentItems.id });

			for (const inserted of insertedRows) {
				createdItemIds.push(inserted.id);
			}

			// [SEV-1.3] Вставка строк счёта в invoiceItems для полного соответствия ст. 4.7 54-ФЗ
			const invoiceItemsToInsert = validationReport.items.map((it) => {
				const matchingCatalog = catalogRows.find(
					(c) => c.code === it.code804n || c.id === it.suggested804nAnalogue?.serviceId,
				);
				const qty = Number.isFinite(Number(it.quantity)) && Number(it.quantity) > 0 ? Number(it.quantity) : 1;
				const unitPriceKop = Number.isFinite(Number(it.effectiveUnitPriceKopecks)) ? Math.max(0, Math.round(Number(it.effectiveUnitPriceKopecks))) : 0;
				const grossKop = unitPriceKop * qty;
				const discountKop = Number.isFinite(Number(it.effectiveDiscountKopecks)) ? Math.max(0, Math.round(Number(it.effectiveDiscountKopecks))) : 0;
				const safeGrossKop = Math.max(0, grossKop);
				const safeDiscountKop = Math.min(safeGrossKop, discountKop);
				const discountBasisPoints = safeGrossKop > 0 ? Math.round((safeDiscountKop * 10000) / safeGrossKop) : 0;
				const discountPct = Math.min(100, Math.max(0, discountBasisPoints / 100));

				return {
					organizationId: orgId,
					invoiceId,
					priceListItemId: matchingCatalog?.id ?? null,
					name: it.nameRu,
					quantity: String(it.quantity),
					unitPriceKopecks: unitPriceKop,
					discountPercent: discountPct.toFixed(2),
					totalPriceKopecks: Number.isFinite(Number(it.effectiveLineNetKopecks)) ? Math.max(0, Math.round(Number(it.effectiveLineNetKopecks))) : Math.max(0, safeGrossKop - safeDiscountKop),
					serviceCode: it.code804n ?? matchingCatalog?.code ?? null,
					toothCode: it.toothNumber ? String(it.toothNumber) : null,
				};
			});

			await tx.insert(invoiceItems).values(invoiceItemsToInsert);
		}
	});

	return { invoiceId, createdItemIds };
}
