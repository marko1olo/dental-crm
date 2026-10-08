/**
 * receiptDraftHandlers.ts — Layer 1: Receipt Draft Validation, Catalog Price Safeguards & Pre-Flight.
 *
 * Implements Mandate 8e (Doctor Autonomy on Discounts up to 100%) and protects against price tampering.
 */

import {
	type CreateFiscalReceiptPayloadInput,
	createFiscalReceiptPayloadSchema,
	kopecksToRub,
	parseKopecks,
} from "@dental/shared";
import { and, eq, inArray } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadContext } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { serviceCatalogItems } from "../../../db/schema.js";
import { FiscalReceiptFactory } from "../../../services/kkt/FiscalReceiptFactory.js";

export type CatalogPriceVerificationResult =
	| { success: true }
	| {
			success: false;
			statusCode: number;
			response: {
				error: string;
				message: string;
				details?: unknown;
			};
	  };

/**
 * Validates line items against organization service catalog.
 * Protects against price inflation while preserving Doctor Autonomy (discounts up to 100%).
 */
export async function verifyAndEnforceCatalogPrices(
	orgId: string,
	items: CreateFiscalReceiptPayloadInput["items"],
): Promise<CatalogPriceVerificationResult> {
	const serviceIds = items
		.map((it) => it.serviceId || it.catalogItemId)
		.filter((id): id is string => typeof id === "string" && id.length > 0);

	if (serviceIds.length === 0) {
		return { success: true };
	}

	const catalogRows = await db
		.select()
		.from(serviceCatalogItems)
		.where(
			and(
				eq(serviceCatalogItems.organizationId, orgId),
				inArray(serviceCatalogItems.id, serviceIds),
			),
		);

	const catalogMap = new Map(catalogRows.map((r) => [r.id, r]));

	for (const item of items) {
		const sId = item.serviceId || item.catalogItemId;
		if (!sId) continue;
		const catalogItem = catalogMap.get(sId);
		if (!catalogItem) {
			return {
				success: false,
				statusCode: 400,
				response: {
					error: "FiscalPriceVerificationError",
					message: `Услуга с ID «${sId}» не найдена в каталоге клиники.`,
				},
			};
		}

		const catalogUnitPriceKop = parseKopecks(catalogItem.priceRub);
		let discountKop = 0;
		if (item.discountKopecks !== undefined && item.discountKopecks !== null) {
			discountKop = item.discountKopecks;
		} else if (item.discountPercent !== undefined && item.discountPercent !== null) {
			discountKop = Math.round((catalogUnitPriceKop * item.discountPercent) / 100);
		}

		const expectedUnitPriceKop = Math.max(0, catalogUnitPriceKop - discountKop);
		const expectedTotalItemKop = Math.round(expectedUnitPriceKop * item.quantity);

		if (item.amountKopecks <= catalogUnitPriceKop * item.quantity) {
			// Автономия врача на скидки до 100% (гарантийные переделки, скидки персоналу, округление копеек)
			const actualDiscountKop = catalogUnitPriceKop * item.quantity - item.amountKopecks;
			if (actualDiscountKop > 0) {
				(item as any).discountKopecks = actualDiscountKop;
			}
		} else {
			return {
				success: false,
				statusCode: 400,
				response: {
					error: "FiscalPriceSpoofingError",
					message: `Обнаружена попытка необоснованного завышения цены услуги «${catalogItem.title}»: в каталоге ${kopecksToRub(catalogUnitPriceKop)} ₽/ед., передано ${item.amountKopecks} коп.`,
					details: {
						serviceId: sId,
						serviceTitle: catalogItem.title,
						catalogUnitPriceKopecks: catalogUnitPriceKop,
						expectedAmountKopecks: expectedTotalItemKop,
						receivedAmountKopecks: item.amountKopecks,
					},
				},
			};
		}
	}

	return { success: true };
}

/**
 * POST /api/fiscal/validate
 * Pre-flight validator for line items, kopeck exactness, Chestny ZNAK DataMatrix barcodes, and FFD 1.2 tags.
 */
export async function handleFiscalValidate(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const ctx = await requireClinicalReadContext(request, reply, "fiscal validate");
	if (!ctx) return;

	const parsed = createFiscalReceiptPayloadSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Некорректные параметры фискального чека 54-ФЗ",
			details: parsed.error.issues,
		});
	}

	const verification = await verifyAndEnforceCatalogPrices(ctx.organizationId, parsed.data.items);
	if (!verification.success) {
		return reply.status(verification.statusCode).send(verification.response);
	}

	try {
		const compiled = FiscalReceiptFactory.buildFfd12Receipt(parsed.data);
		return reply.status(200).send({
			success: true,
			valid: true,
			totalKopecks: compiled.totalKopecks,
			totalRub: compiled.tag1020_totalRub,
			taxDeductionCategory: compiled.taxDeductionCategory,
			compiledReceipt: compiled,
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Ошибка валидации фискального чека";
		return reply.status(422).send({
			error: "FiscalValidationFailure",
			message,
		});
	}
}
