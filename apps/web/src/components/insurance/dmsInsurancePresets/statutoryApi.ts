/**
 * statutoryApi.ts — Справочные данные и API каталогов страховщиков и программ ДМС
 * Мандат 8b: строго <= 120 строк.
 */

import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import { STATUTORY_DMS_INSURERS } from "./statutoryInsurers.js";
import { STATUTORY_804N_NOMENCLATURE } from "./statutoryNomenclature.js";
import { STATUTORY_DMS_PROGRAMS } from "./statutoryPrograms.js";
import type {
	DmsInsurerId,
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
