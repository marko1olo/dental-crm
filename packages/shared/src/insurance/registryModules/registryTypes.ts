import type { Kopecks } from "../../utils/money.js";

export interface DmsRegistryClinicInfo {
	readonly nameRu: string;
	readonly inn: string;
	readonly kpp: string;
	readonly ogrn: string;
	readonly addressRu: string;
	readonly phone: string;
	readonly email?: string | undefined;
	readonly medicalLicenseNumber: string;
	readonly bankNameRu?: string | undefined;
	readonly bankBik?: string | undefined;
	readonly bankAccount?: string | undefined;
	readonly bankCorrAccount?: string | undefined;
	readonly chiefDoctorNameRu: string;
	readonly chiefAccountantNameRu: string;
}

export interface DmsRegistryInsuranceCompanyInfo {
	readonly companyId: string;
	readonly nameRu: string;
	readonly inn: string;
	readonly kpp?: string | undefined;
	readonly contractNumber: string;
	readonly contractDate: string; // ISO YYYY-MM-DD
}

export interface DmsRegistryRecord {
	readonly recordId: string;
	readonly serviceDate: string; // ISO YYYY-MM-DD
	readonly patientFullName: string;
	readonly patientBirthDate: string; // ISO YYYY-MM-DD
	readonly patientGender: "M" | "F" | "М" | "Ж";
	readonly patientSnils?: string | undefined;
	readonly policyNumber: string;
	readonly guaranteeLetterNumber: string;
	readonly guaranteeLetterDate?: string | undefined; // ISO YYYY-MM-DD
	readonly icd10Code: string;
	readonly icd10DescriptionRu: string;
	readonly toothNumberFdi?: number | undefined;
	readonly serviceCode804n: string;
	readonly serviceNameRu: string;
	readonly doctorFullName: string;
	readonly doctorSpecialtyRu?: string | undefined;
	readonly doctorSnils?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: Kopecks;
	readonly totalGrossKopecks: Kopecks;
	readonly franchisePercent: number; // 0..100
	readonly patientPaidKopecks: Kopecks;
	readonly insurerClaimKopecks: Kopecks;
}

export interface DmsRegistryData {
	readonly registryNumber: string;
	readonly registryDate: string; // ISO YYYY-MM-DD
	readonly periodStart: string; // ISO YYYY-MM-DD
	readonly periodEnd: string; // ISO YYYY-MM-DD
	readonly clinic: DmsRegistryClinicInfo;
	readonly insuranceCompany: DmsRegistryInsuranceCompanyInfo;
	readonly records: readonly DmsRegistryRecord[];
}

export interface DmsRegistryTotals {
	readonly totalRecordsCount: number;
	readonly uniquePatientsCount: number;
	readonly totalGrossKopecks: Kopecks;
	readonly totalPatientPaidKopecks: Kopecks;
	readonly totalInsurerClaimKopecks: Kopecks;
	readonly totalGrossRub: string;
	readonly totalPatientPaidRub: string;
	readonly totalInsurerClaimRub: string;
	readonly totalInsurerClaimInWordsRu: string;
}
