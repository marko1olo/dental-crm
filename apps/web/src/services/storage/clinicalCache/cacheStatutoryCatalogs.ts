import type { ClinicalCachedEntity } from "../storageTypes";
import { cacheClinicalRecord, getCachedClinicalRecord } from "./cacheStorageIdb";

export async function cacheStatutoryCatalog<T = unknown>(
	catalogKind: "catalog_804n" | "catalog_icd10" | "catalog_templates",
	data: T,
	organizationId?: string,
): Promise<ClinicalCachedEntity<T>> {
	return cacheClinicalRecord<T>(catalogKind, "canonical", data, organizationId, 1);
}

export async function getCachedStatutoryCatalog<T = unknown>(
	catalogKind: "catalog_804n" | "catalog_icd10" | "catalog_templates",
): Promise<T | null> {
	const cached = await getCachedClinicalRecord<T>(catalogKind, "canonical");
	return cached?.data ?? null;
}
