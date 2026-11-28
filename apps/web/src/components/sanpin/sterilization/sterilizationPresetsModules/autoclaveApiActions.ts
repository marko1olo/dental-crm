import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders.js";
import { clientLogger } from "../../../../services/logging/clientLogger.js";
import type { AutoclaveCycleRecord } from "./types.js";

export async function saveQuickAutoclaveCycleToApi(
	cycle: AutoclaveCycleRecord,
): Promise<{ ok: boolean; id?: string; error?: string }> {
	try {
		const payload = {
			deviceName: cycle.autoclaveModel,
			autoclaveId: cycle.autoclaveCode,
			cycleNumber: cycle.cycleNumber,
			temperatureCelsius: cycle.temperatureC,
			pressureBar: cycle.pressureBar,
			durationMin: cycle.exposureMinutes,
			itemsDescription: cycle.loadDescription,
			packagingType: cycle.kraftSize === "150x250" ? "kraft_heat_sealed" : "kraft_self_adhesive",
			indicatorType: cycle.indicatorClass === 5 ? "class5_integrating" : "class4_multivariable",
			passedIndicator: cycle.batchVerdict === "ГОДНА",
			operatorName: cycle.operatorName,
			notes: `${cycle.programName || ""} • ${cycle.indicatorPointsStatus || ""}`.trim(),
		};

		const res = await fetch("/api/sanpin/sterilization", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Idempotency-Key": typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `sanpin-autoclave-${Date.now()}`,
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify(payload),
		});

		if (!res.ok) {
			let errBody: { message?: string } | null = null;
			try {
				errBody = (await res.json()) as { message?: string } | null;
			} catch (parseErr) {
				clientLogger.warn("[autoclaveApiActions] Failed to parse error JSON:", parseErr);
			}
			return { ok: false, error: errBody?.message || `Ошибка сохранения цикла автоклава (${res.status})` };
		}

		const data = await res.json();
		return { ok: true, id: data?.id };
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : "Сетевой сбой при сохранении цикла";
		return { ok: false, error: msg };
	}
}

export async function fetchSterilizationLogsFromApi(): Promise<Record<string, unknown>[]> {
	try {
		const res = await fetch("/api/sanpin/sterilization", {
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
		});
		if (!res.ok) return [];
		const data = await res.json();
		return Array.isArray(data) ? data : [];
	} catch (err) {
		clientLogger.warn("[autoclaveApiActions] Failed to fetch sterilization logs:", err);
		return [];
	}
}
