/**
 * prescriptionPackages.ts — Clinical 1-Click Fast Prescription Packages Facade
 * DENTE Dental CRM (Mandates 8e, 8n, 8x, 8y & Mandate 8b <= 120 lines).
 */

import { PACKAGES_CORE } from "./prescriptionPackagesCore";
import { PACKAGES_EXTENDED } from "./prescriptionPackagesExtended";
import type { DentalFastPrescriptionPackage } from "./prescriptionPackageTypes";

export * from "./prescriptionPackageTypes";
export * from "./prescriptionPackagesCore";
export * from "./prescriptionPackagesExtended";
export * from "./prescriptionPackagesPediatric";

export const DENTAL_FAST_PRESCRIPTION_PACKAGES_BASE: readonly DentalFastPrescriptionPackage[] =
	[...PACKAGES_CORE, ...PACKAGES_EXTENDED];

export const DENTAL_FAST_PRESCRIPTION_PACKAGES: readonly DentalFastPrescriptionPackage[] =
	DENTAL_FAST_PRESCRIPTION_PACKAGES_BASE.map((p) => ({
		...p,
		titleRu: p.label,
		descriptionRu: p.desc,
		medicationIds: p.drugIds,
	}));
