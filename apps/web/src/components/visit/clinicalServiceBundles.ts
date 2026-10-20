/**
 * apps/web/src/components/visit/clinicalServiceBundles.ts
 * DENTE Dental CRM — Clinical Service Packages & 804n Nomenclature Mapping.
 */

import {
	CARIES_DIAGNOSIS_BUNDLE,
	PULPITIS_DIAGNOSIS_BUNDLE,
	PERIODONTITIS_DIAGNOSIS_BUNDLE,
	EXTRACTION_DIAGNOSIS_BUNDLE,
	HYGIENE_DIAGNOSIS_BUNDLE,
	CROWN_DIAGNOSIS_BUNDLE,
	CANONICAL_DIAGNOSIS_BUNDLES,
	getDiagnosisBundleByToothState,
	getDiagnosisBundleByIcd10,
	resolveServicePriceAgainstCatalog,
	createCustomizedBundle,
	exportCustomizedBundleToCashier54Fz,
	type CanonicalDiagnosisBundle,
	type CanonicalDiagnosisService,
	type CustomizedBundleItem,
	type CustomizedBundleResult,
	type Cashier54FzItemPayload,
	type Cashier54FzBundleExport,
} from "@dental/shared";
import { CLINICAL_SERVICE_BUNDLES, type ClinicalServiceBundle } from "./clinicalServiceBundlesData.js";

export {
	CARIES_DIAGNOSIS_BUNDLE,
	PULPITIS_DIAGNOSIS_BUNDLE,
	PERIODONTITIS_DIAGNOSIS_BUNDLE,
	EXTRACTION_DIAGNOSIS_BUNDLE,
	HYGIENE_DIAGNOSIS_BUNDLE,
	CROWN_DIAGNOSIS_BUNDLE,
	CANONICAL_DIAGNOSIS_BUNDLES,
	getDiagnosisBundleByToothState,
	getDiagnosisBundleByIcd10,
	resolveServicePriceAgainstCatalog,
	createCustomizedBundle,
	exportCustomizedBundleToCashier54Fz,
	type CanonicalDiagnosisBundle,
	type CanonicalDiagnosisService,
	type CustomizedBundleItem,
	type CustomizedBundleResult,
	type Cashier54FzItemPayload,
	type Cashier54FzBundleExport,
};

export * from "./clinicalServiceBundlesData.js";

export function resolveClinicalServiceBundlesAgainstCatalog(
	catalog: readonly any[] = [],
): readonly ClinicalServiceBundle[] {
	if (!Array.isArray(catalog) || catalog.length === 0) {
		return CLINICAL_SERVICE_BUNDLES;
	}

	return CLINICAL_SERVICE_BUNDLES.map((bundle) => {
		let totalKopecks = 0;
		const resolvedServices = bundle.services.map((svc) => {
			const resolved = resolveServicePriceAgainstCatalog(
				{
					id: `${bundle.id}_${svc.code804n}`,
					code804n: svc.code804n,
					title: svc.title,
					defaultPriceKopecks: Math.round(svc.priceRub * 100),
					defaultPriceRub: svc.priceRub,
					requiredByDefault: true,
					category: "Терапия",
				},
				catalog,
			);
			totalKopecks += resolved.priceKopecks;
			return {
				code804n: svc.code804n,
				title: resolved.fromCatalog ? resolved.title : svc.title,
				priceRub: resolved.priceRub,
			};
		});

		return {
			...bundle,
			totalPriceRub: Math.round(totalKopecks) / 100,
			services: resolvedServices,
		};
	});
}
