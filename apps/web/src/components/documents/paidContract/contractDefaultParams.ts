/**
 * paidContract/contractDefaultParams.ts
 * Parameter types for creating default paid contract data (Mandate 8b <= 120 lines)
 */

import type {
	PaidContractCustomerRequisites,
	PaidContractRepresentativeRequisites,
	PaidContractServiceItem,
} from "./contractDataTypes";

export interface CreateDefaultPaidContractParams {
	contractNumber?: string | undefined;
	contractDate?: string | undefined;
	city?: string | undefined;
	patientFullName?: string | undefined;
	patientBirthDate?: string | undefined;
	patientPassport?: string | undefined;
	patientAddress?: string | undefined;
	patientPhone?: string | undefined;
	patientSnils?: string | undefined;
	cardNumber?: string | undefined;
	directorTitle?: string | undefined;
	directorFullName?: string | undefined;
	doctorFullName?: string | undefined;
	doctorSpecialty?: string | undefined;
	clinicFullName?: string | undefined;
	clinicShortName?: string | undefined;
	clinicLegalAddress?: string | undefined;
	clinicActualAddress?: string | undefined;
	clinicInn?: string | undefined;
	clinicKpp?: string | undefined;
	clinicOgrn?: string | undefined;
	clinicLicense?: string | undefined;
	clinicPhone?: string | undefined;
	clinicBankName?: string | undefined;
	clinicBik?: string | undefined;
	clinicCheckingAccount?: string | undefined;
	clinicCorrAccount?: string | undefined;
	clinicalReason?: string | undefined;
	serviceScopeSummary?: string | undefined;
	services?: PaidContractServiceItem[] | undefined;
	totalAmountKopecks?: number | undefined;
	serviceStart?: string | undefined;
	serviceEndOrCondition?: string | undefined;
	customer?: Partial<PaidContractCustomerRequisites> | undefined;
	representative?: Partial<PaidContractRepresentativeRequisites> | undefined;
}
