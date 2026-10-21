/**
 * types.ts — Контракты реестров ДМС и договоров со страховыми компаниями
 */

export interface DmsInsuranceContractRecord {
	readonly id: string;
	readonly insurerKey: string;
	readonly insurerShortName: string;
	readonly insurerFullName: string;
	readonly inn: string;
	readonly ogrn: string;
	readonly kpp: string;
	readonly contractNumber: string;
	readonly contractDate: string;
	readonly validUntil: string;
	readonly defaultFranchisePct: number;
	readonly curatorFullName: string;
	readonly curatorPhone: string;
	readonly curatorEmail: string;
	readonly portalUrl: string;
	readonly slaHours: number;
	readonly status: "active" | "expiring_soon" | "suspended" | "draft";
	readonly notes?: string | undefined;
}

export interface DmsRegistryItemRecord {
	readonly id: string;
	readonly visitId: string;
	readonly visitDate: string;
	readonly patientFullName: string;
	readonly policyNumber: string;
	readonly guaranteeLetterNumber?: string | undefined;
	readonly insurerKey: string;
	readonly insurerName: string;
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly toothNumber?: string | number | undefined;
	readonly diagnosisMkb10: string;
	readonly doctorFullName: string;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly totalPriceKopecks: number;
	readonly dmsCoveredKopecks: number;
	readonly patientPaidKopecks: number;
	readonly isExcluded: boolean;
	readonly status: "accepted" | "pending_expert" | "copay_required" | "rejected";
}

export interface ClinicLegalProfile {
	readonly legalName: string;
	readonly brandName: string;
	readonly inn: string;
	readonly ogrn: string;
	readonly kpp: string;
	readonly address: string;
	readonly phone: string;
	readonly licenseNumber: string;
	readonly licenseDate: string;
	readonly chiefDoctorFullName: string;
	readonly chiefAccountantFullName?: string | undefined;
	readonly bankName?: string | undefined;
	readonly bankBic?: string | undefined;
	readonly bankAccount?: string | undefined;
}
