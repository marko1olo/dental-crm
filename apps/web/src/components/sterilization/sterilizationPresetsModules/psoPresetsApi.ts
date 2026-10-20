/**
 * apps/web/src/components/sterilization/sterilizationPresetsModules/psoPresetsApi.ts
 *
 * API коннекторы контроля качества ПСО (Fastify & PostgreSQL 18).
 * Мандат 8b: строго <= 120 строк.
 */

import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import type { PsoQualityRecord } from "./types.js";

export async function saveQuickPsoRecordToApi(
	pso: PsoQualityRecord,
): Promise<{ ok: boolean; id?: string; error?: string }> {
	try {
		const payload = {
			instrumentName: pso.instrumentName,
			batchItemCount: pso.batchItemCount,
			testedSampleCount: pso.testedSampleCount,
			detergentBrand: pso.detergentBrand,
			azopyramPassed: pso.azopyramResult === "negative",
			phenolphthaleinPassed: pso.phenolphthaleinResult === "negative",
			notes: `${pso.notes || ""} • [ПСО: ${pso.operatorName}]`.trim(),
		};

		const res = await fetch("/api/registers/pso", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify(payload),
		});

		if (!res.ok) {
			const errBody = await res.json().catch(() => null);
			return {
				ok: false,
				error:
					errBody?.message || `Ошибка сохранения пробы ПСО (${res.status})`,
			};
		}

		const data = await res.json();
		return { ok: true, id: data?.id };
	} catch (err: unknown) {
		const msg =
			err instanceof Error
				? err.message
				: "Сетевой сбой при сохранении пробы ПСО";
		return { ok: false, error: msg };
	}
}

export async function fetchPsoLogsFromApi(): Promise<
	Record<string, unknown>[]
> {
	try {
		const res = await fetch("/api/registers/pso", {
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
		});
		if (!res.ok) return [];
		const data = await res.json();
		return Array.isArray(data) ? data : [];
	} catch {
		return [];
	}
}
