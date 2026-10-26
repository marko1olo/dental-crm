import type { AutoclaveCycleRecord, Form257CycleRecord, KraftPackageItem, PsoTestRecord } from "./journalRecords";

export interface ClinicRequisites {
	readonly clinicName: string;
	readonly legalEntity: string;
	readonly licenseNumber: string;
	readonly address: string;
	readonly chiefDoctorFullName: string;
	readonly seniorNurseFullName: string;
}

export const DEFAULT_CLINIC_REQUISITES: ClinicRequisites = {
	clinicName: "Стоматологическая клиника «ДЕНТЕ»",
	legalEntity: "ООО «ДЕНТЕ КЛИНИК»",
	licenseNumber: "ЛО41-01137-77/00368412 от 14.10.2021",
	address: "г. Москва, ул. Профсоюзная, д. 45",
	chiefDoctorFullName: "Главный врач",
	seniorNurseFullName: "Главная медсестра",
};

export interface MonthlySanpinGenerationOptions {
	readonly year: number; // e.g. 2026
	readonly month: number; // 1-12
	readonly clinicInfo?: ClinicRequisites;
	readonly primaryOperatorFullName?: string;
	readonly secondaryOperatorFullName?: string;
	readonly includeSaturdays?: boolean;
	readonly includeSundays?: boolean;
	readonly dailyPatientLoadLevel?: "standard" | "high" | "moderate";
}

export interface MonthlySanpinJournalBundle {
	readonly year: number;
	readonly month: number;
	readonly monthFormattedRu: string;
	readonly workingDaysCount: number;
	readonly totalCyclesCount: number;
	readonly totalPsoTestsCount: number;
	readonly totalPacksCount: number;
	readonly cycles: readonly AutoclaveCycleRecord[];
	readonly psoRecords: readonly PsoTestRecord[];
	readonly kraftPackages: readonly KraftPackageItem[];
	readonly clinicInfo: ClinicRequisites;
	readonly csv257: string;
	readonly csv366: string;
	readonly printHtml257: string;
	readonly printHtml366: string;
	readonly combinedDossierHtml: string;
}

export interface DailyShiftSanpinLogBundle {
	readonly date: string;
	readonly shiftNumber: number;
	readonly operatorFullName: string;
	readonly operatorPosition: string;
	readonly electronicSignatureHash: string;
	readonly cycles: readonly AutoclaveCycleRecord[];
	readonly psoRecords: readonly PsoTestRecord[];
	readonly kraftPackages: readonly KraftPackageItem[];
	readonly summaryTextRu: string;
}
