/**
 * apiHandlers.ts — Клиентские вызовы Fastify API для гарантийных писем ДМС
 */

import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import { STATUTORY_DMS_INSURERS } from "./statutoryInsurers.js";
import { STATUTORY_804N_NOMENCLATURE } from "./statutoryNomenclature.js";
import { STATUTORY_DMS_PROGRAMS } from "./statutoryPrograms.js";
import type {
	DmsGuaranteeLetterStatus,
	DmsInsurerMetadata,
	DmsNomenclature804nItem,
	DmsProgramKey,
	DmsProgramPolicyDefinition,
} from "./types.js";

export function getStatutoryInsurerById(id: string): DmsInsurerMetadata | undefined {
	return STATUTORY_DMS_INSURERS.find((ins) => ins.id === id || ins.key === id);
}

export function getStatutoryProgramByKey(key: DmsProgramKey): DmsProgramPolicyDefinition {
	return STATUTORY_DMS_PROGRAMS[key] ?? STATUTORY_DMS_PROGRAMS.standard_therapy;
}

export function getNomenclature804nByCode(code: string): DmsNomenclature804nItem | undefined {
	return STATUTORY_804N_NOMENCLATURE.find((item) => item.code === code);
}

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

/**
 * Получение актуального списка страховых компаний и активных договоров через Fastify API /api/insurance/insurers
 * с надежным локальным фолбеком на случай оффлайн-режима.
 */
export async function fetchStatutoryInsurersFromApi(): Promise<DmsInsurerMetadata[]> {
	try {
		const res = await fetch("/api/insurance/insurers", {
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
		});
		if (!res.ok) return [...STATUTORY_DMS_INSURERS];
		const data = await res.json();
		if (data && Array.isArray(data.insurers) && data.insurers.length > 0) {
			return data.insurers.map((apiIns: { key: string; name: string; inn: string }) => {
				const fallback = STATUTORY_DMS_INSURERS.find((s) => s.key === apiIns.key);
				if (fallback) {
					return {
						...fallback,
						shortName: apiIns.name || fallback.shortName,
						inn: apiIns.inn || fallback.inn,
					};
				}
				return {
					id: apiIns.key as DmsInsurerId,
					key: apiIns.key,
					shortName: apiIns.name,
					fullName: apiIns.name,
					inn: apiIns.inn || "0000000000",
					ogrn: "0000000000000",
					kpp: "000001001",
					phone: "8 (800) 000-00-00",
					email: "dms@insurance.ru",
					portalUrl: "https://dms.ru",
					curatorDepartment: "Отдел урегулирования убытков ДМС",
					defaultSlaHours: 24,
					statutoryRegulations2026: true,
					supportedPrograms: ["standard_therapy", "vip_full_coverage"],
					standardTermsDescription: "100% покрытие терапии и хирургии по стандартам МЗ РФ.",
					requiresXrayForEndo: true,
					requiresCtPreAuth: false,
				} satisfies DmsInsurerMetadata;
			});
		}
		return [...STATUTORY_DMS_INSURERS];
	} catch {
		return [...STATUTORY_DMS_INSURERS];
	}
}
