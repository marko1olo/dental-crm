import { randomUUID } from "node:crypto";
import type { validatePlanToInvoice } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import { patientInvoices } from "../../../db/schema/billing.js";
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
		}
	});

	return { invoiceId, createdItemIds };
}
