/**
 * types.ts — Контракты моделей генераторов документов ДМС
 */

import type { ClinicLegalInfo } from "../dmsInsuranceEngine.js";
import type { DmsInsurerId, DmsInsurerMetadata, DmsProgramKey } from "../dmsInsurancePresets.js";

export interface DmsPreAuthRequestPayload {
	readonly clinicInfo?: ClinicLegalInfo | undefined;
	readonly insurerId: DmsInsurerId;
	readonly patient: {
		readonly id: string;
		readonly fullName: string;
		readonly policyNumber: string;
		readonly birthDate?: string | undefined;
		readonly phone?: string | undefined;
	};
	readonly programKey: DmsProgramKey;
	readonly diagnosisMkb10: {
		readonly code: string;
		readonly title: string;
	};
	readonly toothNumber?: string | undefined;
	readonly requestedServices: readonly {
		readonly code804n: string;
		readonly name: string;
		readonly quantity: number;
		readonly priceKopecks: number;
	}[];
	readonly clinicalJustification: string;
	readonly attachedXrayStudies: readonly {
		readonly id: string;
		readonly type: "periapical" | "optg" | "ct_3d";
		readonly title: string;
		readonly date: string;
		readonly uri?: string | undefined;
	}[];
	readonly attendingDoctor: {
		readonly fullName: string;
		readonly specialty: string;
		readonly signatureDate: string;
	};
}

export interface DmsPreAuthDocument {
	readonly documentId: string;
	readonly requestNumber: string;
	readonly requestDate: string;
	readonly slaDeadlineTimestamp: string;
	readonly insurer: DmsInsurerMetadata;
	readonly totalRequestedKopecks: number;
	readonly payload: DmsPreAuthRequestPayload;
	readonly printableHtml: string;
}

export interface DmsRegistryVisitServiceItem {
	readonly visitId: string;
	readonly visitDate: string;
	readonly patientFullName: string;
	readonly policyNumber: string;
	readonly guaranteeLetterNumber?: string | undefined;
	readonly diagnosisMkb10: string;
	readonly toothNumber?: string | undefined;
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly doctorFullName: string;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly totalBillKopecks: number;
	readonly dmsAcceptedKopecks: number;
	readonly patientPaidKopecks: number;
}

export interface DmsRegistryGenerationPayload {
	readonly registryNumber: string;
	readonly periodStart: string;
	readonly periodEnd: string;
	readonly insurerId: DmsInsurerId;
	readonly clinicInfo?: ClinicLegalInfo | undefined;
	readonly visitServices: readonly DmsRegistryVisitServiceItem[];
}

export interface DmsStatutoryRegistry {
	readonly registryNumber: string;
	readonly creationDate: string;
	readonly periodStart: string;
	readonly periodEnd: string;
	readonly insurer: DmsInsurerMetadata;
	readonly clinicInfo: ClinicLegalInfo;
	readonly items: readonly DmsRegistryVisitServiceItem[];
	readonly totalVisitsCount: number;
	readonly uniquePatientsCount: number;
	readonly grandTotalBillKopecks: number;
	readonly grandTotalDmsKopecks: number;
	readonly grandTotalPatientKopecks: number;
}
