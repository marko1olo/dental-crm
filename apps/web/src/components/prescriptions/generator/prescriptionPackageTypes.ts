/**
 * prescriptionPackageTypes.ts — Clinical 1-Click Fast Prescription Package Types
 * DENTE Dental CRM (Mandate 8b <= 120 lines).
 */

export interface DentalFastPrescriptionPackage {
	readonly id: string;
	readonly label: string;
	readonly desc: string;
	readonly drugIds: readonly string[];
	readonly badge: string;
	readonly titleRu?: string | undefined;
	readonly descriptionRu?: string | undefined;
	readonly medicationIds?: readonly string[] | undefined;
}
