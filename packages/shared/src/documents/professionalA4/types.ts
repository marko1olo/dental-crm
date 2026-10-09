/**
 * types.ts
 *
 * Layer 0: Интерфейсы данных и контрактов официальных печатных документов A4.
 * Постановление Правительства РФ № 736, Приказ МЗ РФ № 1051н, 152-ФЗ, 804н, ГОСТ Р 7.0.97-2016.
 */

export interface A4ClinicRequisites {
	readonly name: string;
	readonly legalName?: string | null | undefined;
	readonly shortName?: string | null | undefined;
	readonly address: string;
	readonly actualAddress?: string | null | undefined;
	readonly inn: string;
	readonly kpp?: string | null | undefined;
	readonly ogrn: string;
	readonly licenseNumber: string;
	readonly licenseDate?: string | null | undefined;
	readonly licenseIssuer?: string | null | undefined;
	readonly phone: string;
	readonly email?: string | null | undefined;
	readonly website?: string | null | undefined;
	readonly bankName?: string | null | undefined;
	readonly bik?: string | null | undefined;
	readonly checkingAccount?: string | null | undefined;
	readonly correspondentAccount?: string | null | undefined;
	readonly directorTitle?: string | null | undefined;
	readonly directorFullName?: string | null | undefined;
	readonly city?: string | null | undefined;
}

export interface A4PatientRequisites {
	readonly fullName: string;
	readonly birthDate?: string | null | undefined;
	readonly gender?: "male" | "female" | string | null | undefined;
	readonly phone?: string | null | undefined;
	readonly passportSeries?: string | null | undefined;
	readonly passportNumber?: string | null | undefined;
	readonly passportIssuedBy?: string | null | undefined;
	readonly passportIssuedDate?: string | null | undefined;
	readonly passportDepartmentCode?: string | null | undefined;
	readonly passportRaw?: string | null | undefined;
	readonly address?: string | null | undefined;
	readonly registrationAddress?: string | null | undefined;
	readonly snils?: string | null | undefined;
	readonly omsPolis?: string | null | undefined;
	readonly cardNumber?: string | null | undefined;
}

export interface A4CustomerRequisites extends A4PatientRequisites {
	readonly isDifferentFromPatient?: boolean | undefined;
	readonly relationshipToPatient?: string | null | undefined;
}

export interface A4DocumentServiceItem {
	readonly code804n?: string | null | undefined;
	readonly name: string;
	readonly toothOrArea?: string | number | null | undefined;
	readonly quantity: number;
	readonly unitPriceRub: number;
	readonly discountRub?: number | null | undefined;
	readonly totalRub: number;
}

export interface A4DocumentContractData {
	readonly contractNumber: string;
	readonly contractDate: string;
	readonly clinic: A4ClinicRequisites;
	readonly patient: A4PatientRequisites;
	readonly customer?: A4CustomerRequisites | null | undefined;
	readonly services?: readonly A4DocumentServiceItem[] | null | undefined;
	readonly estimatedTotalRub: number;
	readonly doctorFullName?: string | null | undefined;
	readonly serviceScopeSummary?: string | null | undefined;
	readonly clinicalReason?: string | null | undefined;
}

export interface A4DocumentActData {
	readonly actNumber: string;
	readonly actDate: string;
	readonly contractNumber: string;
	readonly contractDate: string;
	readonly clinic: A4ClinicRequisites;
	readonly patient: A4PatientRequisites;
	readonly customer?: A4CustomerRequisites | null | undefined;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string | null | undefined;
	readonly services: readonly A4DocumentServiceItem[];
	readonly totalAmountRub: number;
	readonly paidAmountRub?: number | null | undefined;
	readonly fiscalReceiptNumber?: string | null | undefined;
	readonly warrantyTermsText?: string | null | undefined;
	readonly patientClaimsText?: string | null | undefined;
}

export interface A4TreatmentPlanStageItem {
	readonly stageNumber: number;
	readonly stageName: string;
	readonly plannedServices: readonly {
		readonly name: string;
		readonly toothOrArea?: string | number | null | undefined;
		readonly timing?: string | null | undefined;
		readonly priceRub: number;
	}[];
	readonly stageTotalRub: number;
	readonly stageTiming?: string | null | undefined;
	readonly clinicalNotes?: string | null | undefined;
}

export interface A4DocumentTreatmentPlanData {
	readonly planNumber?: string | null | undefined;
	readonly planDate: string;
	readonly clinic: A4ClinicRequisites;
	readonly patient: A4PatientRequisites;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string | null | undefined;
	readonly clinicalReason?: string | null | undefined;
	readonly diagnosisSummary?: string | null | undefined;
	readonly stages: readonly A4TreatmentPlanStageItem[];
	readonly totalCostWithoutDiscountRub: number;
	readonly discountRub?: number | null | undefined;
	readonly totalCostWithDiscountRub: number;
	readonly alternativesText?: string | null | undefined;
	readonly risksAndLimitsText?: string | null | undefined;
	readonly approvedVariantName?: string | null | undefined;
}

export interface A4DocumentMedicalCardData {
	readonly cardNumber: string;
	readonly visitDate: string;
	readonly clinic: A4ClinicRequisites;
	readonly patient: A4PatientRequisites;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string | null | undefined;
	readonly complaints: string;
	readonly anamnesisMorbi?: string | null | undefined;
	readonly anamnesisVitae?: string | null | undefined;
	readonly allergyStatus?: string | null | undefined;
	readonly somaticStatus?: string | null | undefined;
	readonly statusLocalis: string;
	readonly diagnosisIcd10: string;
	readonly diagnosisDescription: string;
	readonly diagnosisTooth?: string | number | null | undefined;
	readonly teethFormulaMap?: Record<number | string, { state: string; label?: string }> | null | undefined;
	readonly teethFormulaSummary?: string | null | undefined;
	readonly treatmentProtocol: string;
	readonly materialsUsed?: string | null | undefined;
	readonly recommendations: string;
	readonly nextVisitDate?: string | null | undefined;
}

export interface A4DocumentInformedConsentData {
	readonly consentNumber?: string | null | undefined;
	readonly consentDate: string;
	readonly clinic: A4ClinicRequisites;
	readonly patient: A4PatientRequisites;
	readonly customer?: A4CustomerRequisites | null | undefined;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string | null | undefined;
	readonly interventionName: string;
	readonly toothOrArea?: string | number | null | undefined;
	readonly diagnosisSummary?: string | null | undefined;
	readonly plannedInterventionsList?: readonly string[] | null | undefined;
	readonly possibleComplicationsText?: string | null | undefined;
	readonly alternativesText?: string | null | undefined;
	readonly patientQuestionsAnswered?: boolean | undefined;
	readonly contractNumber?: string | null | undefined;
	readonly contractDate?: string | null | undefined;
}

export interface A4DocumentPersonalDataConsentData {
	readonly consentNumber?: string | null | undefined;
	readonly consentDate: string;
	readonly clinic: A4ClinicRequisites;
	readonly patient: A4PatientRequisites;
	readonly customer?: A4CustomerRequisites | null | undefined;
	readonly purposeList?: readonly string[] | null | undefined;
	readonly thirdPartyTransfersAllowed?: boolean | undefined;
	readonly egiszTransferAllowed?: boolean | undefined;
}
