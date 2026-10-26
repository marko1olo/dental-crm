/**
 * paidContract/contractDefaultFactory.ts
 * Default contract factory with clinic & patient requisites (Mandate 8b <= 120 lines)
 */

import { calculatePaidContractGrandTotalKopecks } from "./money";
import { DEFAULT_LEGAL_CLAUSES } from "./contractLegalClauses";
import type { PaidContractData, PaidContractServiceItem } from "./contractDataTypes";
import type { CreateDefaultPaidContractParams } from "./contractDefaultParams";
import {
	parsePassportSeriesNumber,
	resolveDefaultClinic,
	resolveDefaultCustomer,
	resolveDefaultPatient,
	resolveDefaultRepresentative,
} from "./contractDefaultParties";

export type { CreateDefaultPaidContractParams } from "./contractDefaultParams";

const DEFAULT_SERVICES: PaidContractServiceItem[] = [
	{
		code: "B01.065.001",
		name: "Прием (осмотр, консультация) врача-стоматолога первичный",
		toothOrArea: "Полость рта",
		quantity: 1,
		unitPriceKopecks: 150000,
		discountKopecks: 0,
		totalKopecks: 150000,
	},
];

export function createDefaultPaidContract(params: CreateDefaultPaidContractParams): PaidContractData {
	const today = params.contractDate || new Date().toISOString().slice(0, 10);
	const [year, month, day] = today.split("-");
	const formattedDate = year && month && day ? `${day}.${month}.${year}` : today;

	const passport = parsePassportSeriesNumber(params.patientPassport);
	const resolvedServices = params.services || DEFAULT_SERVICES;
	const resolvedTotal = params.totalAmountKopecks !== undefined
		? params.totalAmountKopecks
		: calculatePaidContractGrandTotalKopecks(resolvedServices);

	return {
		contractNumber: params.contractNumber || `ДПМУ-${year || "2026"}-001`,
		contractDate: formattedDate,
		city: params.city || "г. Москва",
		clinic: resolveDefaultClinic(params),
		patient: resolveDefaultPatient(params, passport),
		customer: resolveDefaultCustomer(params, passport),
		representative: resolveDefaultRepresentative(params),
		clinicalReason: params.clinicalReason || DEFAULT_LEGAL_CLAUSES.clinicalReason,
		serviceScopeSummary: params.serviceScopeSummary || DEFAULT_LEGAL_CLAUSES.serviceScopeSummary,
		services: resolvedServices,
		serviceStart: params.serviceStart || formattedDate,
		serviceEndOrCondition: params.serviceEndOrCondition || "До завершения плана лечения",
		totalAmountKopecks: resolvedTotal,
		paymentTerms: DEFAULT_LEGAL_CLAUSES.paymentTerms,
		priceChangeRules: DEFAULT_LEGAL_CLAUSES.priceChangeRules,
		freeCareNotice: DEFAULT_LEGAL_CLAUSES.freeCareNotice,
		medicalRecommendationWarning: DEFAULT_LEGAL_CLAUSES.medicalRecommendationWarning,
		refusalAndRefundTerms: DEFAULT_LEGAL_CLAUSES.refusalAndRefundTerms,
		warrantyTerms: DEFAULT_LEGAL_CLAUSES.warrantyTerms,
		disputeResolutionTerms: DEFAULT_LEGAL_CLAUSES.disputeResolutionTerms,
		personalDataConsentRef: DEFAULT_LEGAL_CLAUSES.personalDataConsentRef,
		informedConsentRef: DEFAULT_LEGAL_CLAUSES.informedConsentRef,
		doctorFullName: params.doctorFullName || "Петров Петр Петрович",
		doctorSpecialty: params.doctorSpecialty || "Врач-стоматолог-терапевт",
		signedAt: formattedDate,
		signMethod: "paper",
		confirmedDisclosures: {
			clinicInfoConfirmed: true,
			serviceListAndPriceConfirmed: true,
			paidBasisUnderstood: true,
			writtenChangesConfirmed: true,
			freeCareNoticeUnderstood: true,
			recommendationsWarningUnderstood: true,
		},
	};
}
