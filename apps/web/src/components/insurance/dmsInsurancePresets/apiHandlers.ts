/**
 * apiHandlers.ts — Клиентские вызовы Fastify API для гарантийных писем ДМС
 * Мандат 8b: строго <= 120 строк.
 */

import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import type { DmsGuaranteeLetterStatus } from "./types.js";

export * from "./statutoryApi.js";

export async function saveGuaranteeLetterToApi(letter: {
	readonly id?: string | undefined;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly patientBirthDate?: string | null | undefined;
	readonly policyNumber: string;
	readonly insurerKey: string;
	readonly insurerName: string;
	readonly letterNumber: string;
	readonly issueDate: string;
	readonly validFrom: string;
	readonly validUntil: string;
	readonly maxCoverageRub: number;
	readonly usedAmountRub?: number | undefined;
	readonly franchisePct?: number | undefined;
	readonly franchiseType?: "percent" | "fixed_rub" | undefined;
	readonly franchiseFixedRub?: number | undefined;
	readonly programExclusions?: readonly string[] | undefined;
	readonly approvedServiceCodes?: readonly string[] | undefined;
	readonly approvedTeethFdi?: readonly string[] | undefined;
	readonly approvedDiagnosisCodes?: readonly string[] | undefined;
	readonly notes?: string | undefined;
	readonly status?: DmsGuaranteeLetterStatus | undefined;
}): Promise<{ ok: boolean; letter?: unknown; error?: string }> {
	try {
		const isUuid = typeof letter.id === "string" && /^[0-9a-fA-F-]{36}$/.test(letter.id);
		const method = isUuid ? "PUT" : "POST";
		const url = isUuid ? `/api/insurance/guarantee-letters/${letter.id}` : "/api/insurance/guarantee-letters";

		const payload = {
			...letter,
			usedAmountRub: letter.usedAmountRub ?? 0,
			franchisePct: letter.franchisePct ?? 0,
			franchiseType: letter.franchiseType ?? "percent",
			franchiseFixedRub: letter.franchiseFixedRub ?? 0,
			programExclusions: letter.programExclusions ? [...letter.programExclusions] : [],
			approvedServiceCodes: letter.approvedServiceCodes ? [...letter.approvedServiceCodes] : [],
			approvedTeethFdi: letter.approvedTeethFdi ? [...letter.approvedTeethFdi] : [],
			approvedDiagnosisCodes: letter.approvedDiagnosisCodes ? [...letter.approvedDiagnosisCodes] : [],
			notes: letter.notes ?? "",
			status: letter.status ?? "active",
		};

		const res = await fetch(url, {
			method,
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify(payload),
		});

		if (!res.ok) {
			const errBody = await res.json().catch(() => null);
			return { ok: false, error: errBody?.message || `Ошибка сохранения гарантийного письма (${res.status})` };
		}

		const data = await res.json();
		return { ok: true, letter: data };
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : "Сетевой сбой при сохранении гарантийного письма";
		return { ok: false, error: msg };
	}
}

export async function fetchPatientGuaranteeLettersFromApi(patientId?: string): Promise<unknown[]> {
	try {
		const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";
		const res = await fetch(`/api/insurance/guarantee-letters${query}`, {
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
		});
		if (!res.ok) return [];
		const data = await res.json();
		return Array.isArray(data) ? data : [];
	} catch {
		return [];
	}
}
