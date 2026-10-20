/**
 * receiptFfdValidator.ts — Layer 1 & 2: 54-FZ FFD 1.2 Validation, Catalog Guard & Zero-Act Builder.
 *
 * Implements:
 * - Schema validation for 54-FZ FFD 1.2 receipt payload
 * - Organization taxation system resolution and fallback normalization
 * - Catalog prices enforcement (prevents price manipulation)
 * - 100% warranty discount zero-due statutory act generation (Mandate 8e)
 */

import {
	createFiscalReceiptPayloadSchema,
	type CreateFiscalReceiptPayloadOutput as CreateFiscalReceiptPayload,
} from "@dental/shared";
import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/client.js";
import { organizations } from "../../../db/schema.js";
import { normalizeTaxationSystem } from "../../../db/settings/clinicFiscalQueries.js";
import { FiscalReceiptFactory, type Ffd12ReceiptPayload } from "../../../services/kkt/FiscalReceiptFactory.js";
import { verifyAndEnforceCatalogPrices } from "./receiptDraftHandlers.js";

export interface PreparedFiscalDataResult {
	readonly success: boolean;
	readonly data?: CreateFiscalReceiptPayload | undefined;
	readonly statusCode?: number | undefined;
	readonly errorResponse?: Record<string, unknown> | undefined;
}

export async function validateAndPrepareFiscalData(
	request: FastifyRequest,
	orgId: string,
): Promise<PreparedFiscalDataResult> {
	const parsed = createFiscalReceiptPayloadSchema.safeParse(request.body);
	if (!parsed.success) {
		return {
			success: false,
			statusCode: 400,
			errorResponse: {
				error: "ValidationError",
				message: "Некорректные параметры фискального чека 54-ФЗ",
				details: parsed.error.issues,
			},
		};
	}

	const rawData = parsed.data;
	const headerIdempotencyKey =
		(request.headers["idempotency-key"] as string | undefined) ||
		(request.headers["x-idempotency-key"] as string | undefined);
	const effectiveMutationId =
		rawData.clientMutationId?.trim() || headerIdempotencyKey?.trim() || undefined;

	let resolvedTaxationSystem = rawData.taxationSystem;
	const rawBody = (request.body ?? {}) as Record<string, unknown>;
	if (rawBody.taxationSystem === undefined) {
		try {
			const [orgRow] = await db
				.select({ flags: organizations.workspaceFeatureFlags })
				.from(organizations)
				.where(eq(organizations.id, orgId))
				.limit(1);
			const orgFlags = (orgRow?.flags as Record<string, unknown> | null) ?? {};
			if (typeof orgFlags.taxationSystem === "string") {
				resolvedTaxationSystem = normalizeTaxationSystem(orgFlags.taxationSystem);
			}
		} catch {
			// Fallback to parsed default taxationSystem
		}
	}

	const data: CreateFiscalReceiptPayload = {
		...rawData,
		taxationSystem: resolvedTaxationSystem,
		clientMutationId: effectiveMutationId,
	};

	const verification = await verifyAndEnforceCatalogPrices(orgId, data.items);
	if (!verification.success) {
		return {
			success: false,
			statusCode: verification.statusCode,
			errorResponse: verification.response as Record<string, unknown>,
		};
	}

	return {
		success: true,
		data,
	};
}

/**
 * 54-FZ & FFD 1.2: 100% Warranty Discount / 0.00 ₽ Internal Act Payload Builder.
 * Zero-total receipts must NEVER be sent to physical KKT (causes hardware errors).
 * An internal statutory warranty/write-off act is generated instead.
 */
export function buildWarrantyZeroActPayload(
	data: CreateFiscalReceiptPayload,
	now: Date = new Date(),
): {
	readonly actNumber: string;
	readonly compiled: Ffd12ReceiptPayload;
	readonly payloadToStore: Record<string, unknown>;
} {
	const actNumber = `АКТ-ГАР-${now.getFullYear()}-${Date.now().toString().slice(-4)}`;
	const compiled = FiscalReceiptFactory.buildFfd12Receipt(data);
	const payloadToStore: Record<string, unknown> = {
		...compiled,
		clientMutationId: data.clientMutationId ?? null,
		isWarrantyZeroAct: true,
		warrantyActNumber: actNumber,
		receiptNumber: actNumber,
		fnSerial: "0000000000000000",
		fiscalDocumentNumber: "0",
		fiscalSign: "0000000000",
		ofdVerificationUrl: "",
		qrString: null,
		receiptIssuedAt: now.toISOString(),
	};

	return { actNumber, compiled, payloadToStore };
}
