import { and, eq, notInArray } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import { formatKopecksToRub, formatKopecksToRubles, kopecksToRubles, parseKopecks, toExactKopecks } from "@dental/shared";
import { withSavepoint, withTenantCtx, type TenantDb } from "../../db/rls.js";
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
	amountKopecks?: number | undefined;
	error?: string | undefined;
}

function resolveOrthoInvoiceTotalKopecks(invoice: {
	totalPriceKopecks?: bigint | null;
	totalAmountRub?: string | number | null;
	totalRub?: string | number | null;
}): bigint {
	const legacyKopecks = BigInt(parseKopecks(invoice.totalAmountRub ?? invoice.totalRub ?? 0));
	if (typeof invoice.totalPriceKopecks === "bigint" && (invoice.totalPriceKopecks > 0n || legacyKopecks === 0n)) {
		return invoice.totalPriceKopecks;
	}
	return legacyKopecks;
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
	const exactItemKopecks = toExactKopecks(itemKopecks);
	const priceRub = kopecksToRubles(itemKopecks);

	if (!visitId) {
		return {
			serviceAdded: false,
			serviceCode,
			serviceName,
			priceRub,
			priceKopecks: exactItemKopecks,
			amountKopecks: exactItemKopecks,
		};
	}

	try {
		const runWithTx = async (tx: TenantDb) => {
			let invoice = (
				await tx
					.select()
					.from(patientInvoices)
					.where(
						and(
							eq(patientInvoices.organizationId, organizationId),
							eq(patientInvoices.patientId, patientId),
							eq(patientInvoices.visitId, visitId),
							notInArray(patientInvoices.status, ["voided", "paid"]),
						),
					)
					.limit(1)
					.for("update")
			)[0];

			if (!invoice) {
				const [created] = await tx
					.insert(patientInvoices)
					.values({
						organizationId,
						patientId,
						visitId,
						status: "draft",
						totalRub: formatKopecksToRubles(itemKopecks),
						totalAmountRub: priceRub,
						totalPriceKopecks: itemKopecks,
					})
					.returning();
				invoice = created;
			} else {
				const existingKopecks = resolveOrthoInvoiceTotalKopecks(invoice);
				const newTotalKopecks = existingKopecks + itemKopecks;
				const newTotalRub = kopecksToRubles(newTotalKopecks);
				await tx
					.update(patientInvoices)
					.set({
						totalRub: formatKopecksToRubles(newTotalKopecks),
						totalAmountRub: newTotalRub,
						totalPriceKopecks: newTotalKopecks,
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
					unitPriceKopecks: exactItemKopecks,
					totalPriceKopecks: exactItemKopecks,
					discountPercent: "0",
				});
			}

			return {
				serviceAdded: true,
				invoiceId: invoice?.id,
				serviceCode,
				serviceName,
				priceRub,
				priceKopecks: exactItemKopecks,
				amountKopecks: exactItemKopecks,
			};
		};

		return params.tx
			? await withSavepoint(params.tx, runWithTx)
			: await withTenantCtx(organizationId, runWithTx);
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
			priceKopecks: exactItemKopecks,
			amountKopecks: exactItemKopecks,
			error: err instanceof Error ? err.message : String(err),
		};
	}
}
