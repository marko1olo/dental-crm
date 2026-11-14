import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { invoiceItems, patientInvoices } from "../../db/schema.js";

export interface LinkOrthoBillingParams {
	organizationId: string;
	patientId: string;
	visitId?: string | null | undefined;
	serviceCode: string;
	serviceName: string;
	priceRub: number;
	priceKopecks: bigint;
}

export interface OrthoBillingResult {
	serviceAdded: boolean;
	invoiceId?: string | undefined;
	serviceCode: string;
	serviceName: string;
	priceRub: number;
	priceKopecks: number;
	error?: string | undefined;
}

/**
 * DEF-ORTHO-05 / Red Team Досье: Связка ортодонтических активаций с прейскурантом и кассовым чеком.
 * Если передан visitId, автоматически добавляет медицинскую услугу активации в черновик счета пациента.
 */
export async function linkOrthoServiceToBillingSafely(params: LinkOrthoBillingParams): Promise<OrthoBillingResult> {
	const { organizationId, patientId, visitId, serviceCode, serviceName, priceRub, priceKopecks } = params;
	if (!visitId) {
		return {
			serviceAdded: false,
			serviceCode,
			serviceName,
			priceRub,
			priceKopecks: Number(priceKopecks),
		};
	}

	try {
		return await db.transaction(async (tx) => {
			let invoice = (
				await tx
					.select()
					.from(patientInvoices)
					.where(and(eq(patientInvoices.organizationId, organizationId), eq(patientInvoices.visitId, visitId)))
					.limit(1)
			)[0];

			if (!invoice) {
				const [created] = await tx
					.insert(patientInvoices)
					.values({
						organizationId,
						patientId,
						visitId,
						status: "draft",
						totalRub: String(priceRub),
						totalAmountRub: priceRub,
					})
					.returning();
				invoice = created;
			} else {
				const newTotalRub = Number(invoice.totalAmountRub ?? invoice.totalRub ?? 0) + priceRub;
				await tx
					.update(patientInvoices)
					.set({
						totalRub: String(newTotalRub),
						totalAmountRub: newTotalRub,
					})
					.where(and(eq(patientInvoices.id, invoice.id), eq(patientInvoices.organizationId, organizationId)));
			}

			if (invoice) {
				await tx.insert(invoiceItems).values({
					organizationId,
					invoiceId: invoice.id,
					name: serviceName,
					serviceCode,
					quantity: "1",
					unitPriceKopecks: Number(priceKopecks),
					totalPriceKopecks: Number(priceKopecks),
					discountPercent: "0",
				});
			}

			return {
				serviceAdded: true,
				invoiceId: invoice?.id,
				serviceCode,
				serviceName,
				priceRub,
				priceKopecks: Number(priceKopecks),
			};
		});
	} catch (err) {
		console.warn("[OrthoBilling] Error adding service to invoice:", err);
		return {
			serviceAdded: false,
			serviceCode,
			serviceName,
			priceRub,
			priceKopecks: Number(priceKopecks),
			error: err instanceof Error ? err.message : String(err),
		};
	}
}
