/**
 * registryTypes.ts — Контракты реестров ДМС и агрегированных результатов
 */

import type { DmsInsurerDefinition } from "../insuranceCatalogs.js";
import type { DmsSplitLineResult, PatientPaymentSplit } from "./letterTypes.js";

export interface DmsSplitCalculationResult {
	readonly lineItems: readonly DmsSplitLineResult[];
	readonly lines: readonly DmsSplitLineResult[];
	readonly totalBillKopecks: number;
	readonly totalInsuranceCoveredKopecks: number;
	readonly dmsCoveredKopecks: number;
	readonly totalPatientOutOfPocketKopecks: number;
	readonly patientTotalKopecks: number;
	readonly totalBillRubles: number;
	readonly totalInsuranceCoveredRubles: number;
	readonly totalPatientOutOfPocketRubles: number;
	readonly letterApprovedLimitKopecks: number;
	readonly letterRemainingLimitKopecks: number;
	readonly remainingLimitKopecks: number;
	readonly letterExcessAmountKopecks: number;
	readonly hasUnapprovedTeeth: boolean;
	readonly hasExcludedServices: boolean;
	readonly integrityInvariantHolds: boolean;
	readonly warningMessage?: string | undefined;
	readonly isEmergency?: boolean | undefined;
	readonly patientPaymentSplit?: PatientPaymentSplit | undefined;
}

export interface DmsRegistryItem {
	readonly itemIndex: number;
	readonly serviceDate: string;
	readonly patientFullName: string;
	readonly policyNumber: string;
	readonly guaranteeLetterNumber?: string | undefined;
	readonly serviceCode: string;
	readonly serviceName: string;
	readonly toothNumber?: string | undefined;
	readonly diagnosisIcd10?: string | undefined;
	readonly quantity: number;
	readonly unitPriceRubles: number;
	readonly totalAmountRubles: number;
	readonly dmsAcceptedAmountRubles: number;
	readonly patientPaidAmountRubles: number;
	readonly taxRateVat: "exempt_149_nk_rf";
}

export interface DmsReconciliationRegistry {
	readonly registryNumber: string;
	readonly registryDate: string;
	readonly insurer: DmsInsurerDefinition;
	readonly clinicName: string;
	readonly clinicInn: string;
	readonly clinicOgrn: string;
	readonly periodStart: string;
	readonly periodEnd: string;
	readonly items: readonly DmsRegistryItem[];
	readonly totalRegistryAmountRubles: number;
	readonly totalDmsClaimedRubles: number;
	readonly totalPatientCoPaymentRubles: number;
	readonly totalServicesCount: number;
	readonly totalPatientsCount: number;
}
