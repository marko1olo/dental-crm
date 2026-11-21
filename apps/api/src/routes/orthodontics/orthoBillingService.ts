import { and, eq } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import { formatKopecksToRub, kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { db, type TenantDb } from "../../db/client.js";
import { invoiceItems, patientInvoices } from "../../db/schema.js";

export interface LinkOrthoBillingParams {
	organizationId: string;
	patientId: string;
	visitId?: string | null | undefined;
	serviceCode: string;
	serviceName: string;
	priceRub?: number | undefined;
	priceKopecks: bigint;
	tx?: TenantDb | undefined;
	logger?: FastifyBaseLogger | undefined;
}

export interface OrthoBillingResult {
	serviceAdded: boolean;
	invoiceId?: string | undefined;
	serviceCode: string;
	serviceName: string;
	priceRub: number;
	priceKopecks: number;
	amountKopecks?: bigint | undefined;
	error?: string | undefined;
}

/**
 * DEF-ORTHO-05 / Red Team Досье: Связка ортодонтических активаций с прейскурантом и кассовым чеком.
 * DEF-ORTHO-API-01: priceKopecks — единственный источник правды (SSOT); priceRub рассчитывается автоматически из priceKopecks.
 * Мандат 8bm: Сложение сметы счёта ведётся строго в целочисленных копейках (amountKopecks: bigint / Zero Float Drift).
 * Если передан visitId, автоматически добавляет медицинскую услугу активации в черновик счета пациента.
 */
export async function linkOrthoServiceToBillingSafely(params: LinkOrthoBillingParams): Promise<OrthoBillingResult> {
	const { organizationId, patientId, visitId, serviceCode, serviceName, priceKopecks } = params;
	const itemKopecks = BigInt(priceKopecks);
	const priceRub = kopecksToRubles(Number(itemKopecks));

	if (!visitId) {
		return {
			serviceAdded: false,
			serviceCode,
			serviceName,
			priceRub,
			priceKopecks: Number(itemKopecks),
			amountKopecks: itemKopecks,
		};
	}

	try {
		const runWithTx = async (tx: TenantDb) => {
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
				// Мандат 8bm: Zero-Float Drift — сложение строго в целочисленных копейках без Math.round((prevTotalRub + addedRub) * 100) / 100
				const rawAmount = invoice.totalAmountRub ?? invoice.totalRub ?? 0;
				const existingKopecks = BigInt(
					typeof rawAmount === "number"
						? rublesToKopecks(rawAmount)
						: rublesToKopecks(Number(rawAmount) || 0),
				);
				const newTotalKopecks = existingKopecks + itemKopecks;
				const newTotalRub = kopecksToRubles(Number(newTotalKopecks));
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
					unitPriceKopecks: Number(itemKopecks),
					totalPriceKopecks: Number(itemKopecks),
					discountPercent: "0",
				});
			}

			return {
				serviceAdded: true,
				invoiceId: invoice?.id,
				serviceCode,
				serviceName,
				priceRub,
				priceKopecks: Number(itemKopecks),
				amountKopecks: itemKopecks,
			};
		};

		return params.tx ? await runWithTx(params.tx) : await db.transaction(runWithTx);
	} catch (err) {
		if (params.logger) {
			params.logger.warn(
				{
					err,
					organizationId,
					patientId,
					visitId,
					priceFormatted: formatKopecksToRub(itemKopecks),
				},
				"[OrthoBilling] Error adding service to invoice",
			);
		}
		return {
			serviceAdded: false,
			serviceCode,
			serviceName,
			priceRub,
			priceKopecks: Number(itemKopecks),
			amountKopecks: itemKopecks,
			error: err instanceof Error ? err.message : String(err),
		};
	}
}
