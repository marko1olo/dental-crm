/**
 * DENTE Dental CRM — Service Catalog Batch Reprice API Client
 * Mandates 8b, 8n: Real PostgreSQL ACID Updates via Fastify
 */

import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import type { PriceRoundingMode } from "./servicePricelistEngine";

export interface BatchRepriceApiOptions {
	readonly percentChange?: number;
	readonly fixedRubChange?: number;
	readonly category?: string;
	readonly specialty?: string;
	readonly roundMode?: PriceRoundingMode;
	readonly serviceIds?: readonly string[];
}

export interface BatchRepriceApiResponse {
	readonly success: boolean;
	readonly updatedCount: number;
	readonly items?: readonly any[];
}

export async function requestBatchRepriceApi(
	options: BatchRepriceApiOptions,
	adminSecret?: string,
): Promise<BatchRepriceApiResponse | null> {
	try {
		const res = await fetch("/api/services/batch-update", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders(
				{ "Content-Type": "application/json" },
				adminSecret,
			),
			body: JSON.stringify(options),
		});

		if (res.ok) {
			const data = (await res.json()) as BatchRepriceApiResponse;
			if (data && data.success) {
				return data;
			}
		} else if (res.status === 404) {
			// Fallback to canonical pricelist reprice route
			const fallbackRes = await fetch("/api/pricelist/batch-reprice", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders(
					{ "Content-Type": "application/json" },
					adminSecret,
				),
				body: JSON.stringify(options),
			});
			if (fallbackRes.ok) {
				return (await fallbackRes.json()) as BatchRepriceApiResponse;
			}
		}
	} catch {
		// Silent offline/fallback mode (Mandate 8e, 8n)
	}
	return null;
}
