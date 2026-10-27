/**
 * packages/shared/src/clinical/bundles/bundleRegistry.ts
 * Registry, Lookup & Cashier Export for Diagnosis Service Bundles (Mandates 8b, 8e, 8k, 8n, 8x, 8ap).
 */

import type {
	CanonicalDiagnosisBundle, CanonicalDiagnosisService, Cashier54FzBundleExport,
	Cashier54FzItemPayload, CustomizedBundleItem, CustomizedBundleResult,
} from "./bundleTypes.js";
import { HYGIENE_DIAGNOSIS_BUNDLE, PERIODONTITIS_DIAGNOSIS_BUNDLE } from "./hygieneAndPerioBundles.js";
import { BRACES_FIXATION_DIAGNOSIS_BUNDLE, CROWN_DIAGNOSIS_BUNDLE } from "./orthoAndProstheticBundles.js";
import { EXTRACTION_COMPLEX_DIAGNOSIS_BUNDLE, EXTRACTION_DIAGNOSIS_BUNDLE, IMPLANT_PLACEMENT_DIAGNOSIS_BUNDLE } from "./surgeryBundles.js";
import { CARIES_DIAGNOSIS_BUNDLE, PULPITIS_3CANAL_DIAGNOSIS_BUNDLE, PULPITIS_DIAGNOSIS_BUNDLE } from "./therapyBundles.js";

export const CANONICAL_DIAGNOSIS_BUNDLES: readonly CanonicalDiagnosisBundle[] = [
	CARIES_DIAGNOSIS_BUNDLE, PULPITIS_DIAGNOSIS_BUNDLE, PERIODONTITIS_DIAGNOSIS_BUNDLE,
	EXTRACTION_DIAGNOSIS_BUNDLE, HYGIENE_DIAGNOSIS_BUNDLE, CROWN_DIAGNOSIS_BUNDLE,
];
export const ALL_DIAGNOSIS_BUNDLES: readonly CanonicalDiagnosisBundle[] = [
	...CANONICAL_DIAGNOSIS_BUNDLES, PULPITIS_3CANAL_DIAGNOSIS_BUNDLE,
	EXTRACTION_COMPLEX_DIAGNOSIS_BUNDLE, IMPLANT_PLACEMENT_DIAGNOSIS_BUNDLE, BRACES_FIXATION_DIAGNOSIS_BUNDLE,
];

const TOOTH_STATE_MAP: Record<string, CanonicalDiagnosisBundle> = {
	Caries: CARIES_DIAGNOSIS_BUNDLE, Pulpitis: PULPITIS_DIAGNOSIS_BUNDLE,
	Periodontitis: PERIODONTITIS_DIAGNOSIS_BUNDLE, Missing: EXTRACTION_DIAGNOSIS_BUNDLE,
	ExtractionIndicated: EXTRACTION_DIAGNOSIS_BUNDLE, Crown: CROWN_DIAGNOSIS_BUNDLE,
	Orthodontic: BRACES_FIXATION_DIAGNOSIS_BUNDLE,
};

export function getDiagnosisBundleByToothState(state: string): CanonicalDiagnosisBundle | null {
	return TOOTH_STATE_MAP[state] ?? null;
}

export function getDiagnosisBundleByIcd10(icd10: string): CanonicalDiagnosisBundle | null {
	const c = icd10.trim().toUpperCase();
	if (c.startsWith("K02")) return CARIES_DIAGNOSIS_BUNDLE;
	if (/^K04\.[0-3]/.test(c)) return PULPITIS_DIAGNOSIS_BUNDLE;
	if (/^K04\.[4-9]/.test(c)) return PERIODONTITIS_DIAGNOSIS_BUNDLE;
	if (c.startsWith("K08.1")) return EXTRACTION_DIAGNOSIS_BUNDLE;
	if (c.startsWith("K05")) return HYGIENE_DIAGNOSIS_BUNDLE;
	if (c.startsWith("K08.2")) return CROWN_DIAGNOSIS_BUNDLE;
	if (c.startsWith("K07.2")) return BRACES_FIXATION_DIAGNOSIS_BUNDLE;
	if (c.startsWith("K01.1")) return EXTRACTION_COMPLEX_DIAGNOSIS_BUNDLE;
	return CANONICAL_DIAGNOSIS_BUNDLES.find((b) => b.diagnosisIcd10.toUpperCase() === c) ?? null;
}

// biome-ignore lint/suspicious/noExplicitAny: loose catalog row shape
export function resolveServicePriceAgainstCatalog(service: CanonicalDiagnosisService, catalog: readonly any[] = []) {
	// biome-ignore lint/suspicious/noExplicitAny: loose catalog row shape
	const extractValidRub = (row: any, fallback: number): number => {
		for (const k of ["basePriceRub", "priceRub"]) {
			const v = row?.[k];
			if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
			if (typeof v === "string" && v.trim()) {
				const n = Number(v.replace(",", ".").trim());
				if (Number.isFinite(n) && n > 0) return n;
			}
		}
		return fallback;
	};
	if (Array.isArray(catalog) && catalog.length > 0) {
		const target = String(service.serviceCode || service.code804n || "").trim().toUpperCase();
		const byCode = catalog.find((c) => c?.active !== false && [c?.serviceCode, c?.code, c?.code804n].map((x) => String(x || "").trim().toUpperCase()).includes(target));
		const found = byCode ?? catalog.find((c) => c?.active !== false && String(c?.title || "").toLowerCase().replace(/ё/g, "е").includes(service.title.toLowerCase().replace(/ё/g, "е")));
		if (found) {
			const rub = extractValidRub(found, service.defaultPriceRub);
			return { priceKopecks: Math.round(rub * 100), priceRub: rub, priceId: found.id ?? null, title: found.title ?? service.title, fromCatalog: true };
		}
	}
	return { priceKopecks: service.defaultPriceKopecks, priceRub: service.defaultPriceRub, priceId: null, title: service.title, fromCatalog: false };
}

export function createCustomizedBundle(
	bundle: CanonicalDiagnosisBundle,
	options: { toothCode?: string | number | null | undefined; checkedServiceCodes?: readonly string[] | undefined; catalog?: readonly any[] | undefined } = {},
): CustomizedBundleResult {
	const tooth = options.toothCode !== undefined && options.toothCode !== null ? String(options.toothCode) : null;
	const checkedSet = options.checkedServiceCodes ? new Set(options.checkedServiceCodes) : null;
	const items: CustomizedBundleItem[] = bundle.services.map((svc) => {
		const resolved = resolveServicePriceAgainstCatalog(svc, options.catalog);
		const isChecked = checkedSet !== null ? checkedSet.has(svc.serviceCode) || checkedSet.has(svc.code804n) : svc.requiredByDefault;
		return {
			serviceId: svc.id, serviceCode: svc.serviceCode, nomenclatureCode: svc.nomenclatureCode, code804n: svc.code804n,
			title: resolved.title, priceKopecks: resolved.priceKopecks, priceRub: resolved.priceRub, priceId: resolved.priceId,
			requiredByDefault: svc.requiredByDefault, checked: isChecked, category: svc.category, toothCode: tooth,
		};
	});
	const checked = items.filter((it) => it.checked);
	const totalKopecks = checked.reduce((acc, it) => acc + it.priceKopecks, 0);
	return { bundleId: bundle.id, diagnosisIcd10: bundle.diagnosisIcd10, diagnosisTitle: bundle.diagnosisTitle, items, totalKopecks, totalRub: Math.round(totalKopecks) / 100, checkedCount: checked.length };
}

export function exportCustomizedBundleToCashier54Fz(
	customized: CustomizedBundleResult,
	metadata: { patientId?: string | undefined; visitId?: string | undefined; toothNumber?: number | string | undefined } = {},
): Cashier54FzBundleExport {
	const activeItems = customized.items.filter((it) => it.checked);
	const toothNum = metadata.toothNumber !== undefined ? Number(metadata.toothNumber) || undefined : undefined;
	const toothCodeStr = metadata.toothNumber !== undefined ? String(metadata.toothNumber) : undefined;
	const receiptItems: Cashier54FzItemPayload[] = activeItems.map((item) => ({
		name: `[${item.serviceCode || item.code804n}] ${item.title}${toothCodeStr ? ` (зуб ${toothCodeStr})` : ""}`,
		code804n: item.code804n, serviceCode: item.serviceCode, priceKopecks: item.priceKopecks, quantity: 1, sumKopecks: item.priceKopecks,
		taxRate: "none", paymentSubject: 4, paymentMethod: 4, toothNumber: toothNum, toothCode: toothCodeStr,
	}));
	const totalKopecks = receiptItems.reduce((acc, it) => acc + it.sumKopecks, 0);
	return {
		source: "chairside_diagnosis_package", bundleId: customized.bundleId, diagnosisIcd10: customized.diagnosisIcd10,
		diagnosisTitle: customized.diagnosisTitle, toothCode: toothCodeStr, toothNumber: toothNum,
		patientId: metadata.patientId, visitId: metadata.visitId, totalKopecks, totalRub: Math.round(totalKopecks) / 100,
		itemsCount: receiptItems.length, receiptItems,
	};
}

export const exportCustomizedBundleToCashier = exportCustomizedBundleToCashier54Fz;
