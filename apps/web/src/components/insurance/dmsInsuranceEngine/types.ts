/**
 * types.ts — Контракты моделей сплит-расчетов и проверки ДМС
 */

import type { DmsPreAuthApprovalStatus } from "../dmsInsurancePresets.js";

export type { DmsPreAuthApprovalStatus };

export interface DmsBillItemInput {
	readonly id: string;
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly toothNumber?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
}

export interface DmsVerificationResult {
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly toothNumber?: string | undefined;
	readonly status: DmsPreAuthApprovalStatus;
	readonly statusLabel: string;
	readonly isCovered: boolean;
	readonly dmsPayableKopecks: number;
	readonly patientPayableKopecks: number;
	readonly reason: string;
	readonly exclusionRuleId?: string | undefined;
	readonly isExcludedByRule: boolean;
	readonly approvedByGuaranteeLetter: boolean;
}

export interface DmsSplitOptions {
	readonly franchisePercent?: number | undefined;
	readonly franchiseFixedKopecks?: number | undefined;
	readonly currentVisitDate?: string | undefined;
	readonly isEmergency?: boolean | undefined;
	readonly hasAcutePain?: boolean | undefined;
}

export interface DmsSplitLineBreakdown {
	readonly itemId: string;
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly toothNumber?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly lineTotalKopecks: number;
	readonly dmsCoveredKopecks: number;
	readonly patientCoPayKopecks: number;
	readonly status: DmsPreAuthApprovalStatus;
	readonly statusLabel: string;
	readonly statusDescription: string;
	readonly franchiseDeductionKopecks: number;
}

export interface DmsSplitInvoiceSummary {
	readonly lineItems: readonly DmsSplitLineBreakdown[];
	readonly totalBillKopecks: number;
	readonly totalDmsCoveredKopecks: number;
	readonly totalPatientCoPayKopecks: number;
	readonly letterInitialLimitKopecks: number;
	readonly letterUsedAmountKopecks: number;
	readonly letterRemainingLimitKopecks: number;
	readonly letterExcessKopecks: number;
	readonly isFullyCoveredByDms: boolean;
	readonly hasPatientCoPay: boolean;
	readonly balanceInvariantHolds: boolean;
	readonly warningMessage?: string | undefined;
	readonly isEmergency?: boolean | undefined;
}

export interface ClinicLegalInfo {
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
}

export const DEFAULT_CLINIC_LEGAL_INFO: ClinicLegalInfo = {
	legalName: "ООО «Дента-Премиум Клиник»",
	brandName: "DENTE Клиника Стоматологии",
	inn: "7704123456",
	ogrn: "1037704012345",
	kpp: "770401001",
	address: "г. Москва, ул. Стоматологическая, д. 12, стр. 1",
	phone: "",
	licenseNumber: "ЛО41-01137-77/00589123",
	licenseDate: "15.03.2021",
	chiefDoctorFullName: "Д-р Смирнов Константин Владимирович",
};
