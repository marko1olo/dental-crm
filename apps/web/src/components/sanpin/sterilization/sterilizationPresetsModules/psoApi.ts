import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders.js";
import { clientLogger } from "../../../../services/logging/clientLogger.js";
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
			notes: `${pso.notes || ""} • [Очистка: ${pso.operatorName}]`.trim(),
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
			let errBody: { message?: string } | null = null;
			try {
				errBody = (await res.json()) as { message?: string } | null;
			} catch (parseErr) {
				clientLogger.warn("[psoApi] Failed to parse error JSON:", parseErr);
			}
			return {
				ok: false,
				error:
					errBody?.message || `Ошибка сохранения контроля очистки (${res.status})`,
			};
		}

		const data = await res.json();
		return { ok: true, id: data?.id };
	} catch (err: unknown) {
		const msg =
			err instanceof Error
				? err.message
				: "Сетевой сбой при сохранении контроля очистки";
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
	} catch (err) {
		clientLogger.warn("[psoApi] Failed to fetch PSO logs:", err);
		return [];
	}
}
