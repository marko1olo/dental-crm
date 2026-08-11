import type { ClinicalToothRow, DentalMedicalCard043uPayload, OutpatientMedicalCard025uPayload } from "@dental/shared";
import { useCallback, useMemo } from "react";

export function useDocumentFallbacks(scope: any) {
    const {
        
    
    treatmentPlanClinicalReason,
        dashboard,
        treatmentPlanDiagnosisSummary,
        treatmentPlanTeethOrArea,
        inferredTreatmentArea,
        procedureConsentToothOrArea,
        treatmentAcceptanceTeethOrArea,
        procedureConsentDiagnosisOrIndication,
        treatmentAcceptanceDiagnosisSummary,
        procedureConsentProcedureName,
        treatmentAcceptanceClinicalGoal,
        documentTextLines,
        clinicalToothRowsText,
        clinicalToothSurfacesValue,
        clinicalToothStatusValue,
        manualRubAmount,
        paidContractTotalRub,
        treatmentAcceptancePlannedTotalRub,
        completedActPaidRub,
        activePaidPaymentsForVisit,
        treatmentEstimatePatientOrPayerFullName,
        documentPatient,
        treatmentEstimateTreatmentBasis,
        compactDocumentText,
        treatmentEstimateTotalRub,
        plannedServiceLinesForFinancialPayload,
        paymentReceiptPayerFullName,
        firstPaymentReceiptPayment,
        paymentReceiptPayerBirthDate,
        paymentReceiptPayerInn,
        paymentReceiptPayerIdentityDocument,
        paymentReceiptPayerRelationship,
        paymentReceiptIssuedBy,
        activeDoctor,
        installmentScheduleTotalRub,
        installmentSchedulePrepaidRub,
        installmentScheduleBaseDocumentTitle,
        activeUsableDocuments,
        minorRepresentativeFullName,
        minorRepresentativeRelationship,
        minorRepresentativeIdentityDocument,
        minorRepresentativePhone,
        minorConsentPatientFullName,
        minorConsentPatientBirthDate,
        minorConsentInterventionScope,
        minorConsentDiagnosisOrIndication,
        warrantyServiceOrWorkName,
        warrantyTeethOrArea,
        warrantyLinkedActOrContract,
        attendanceStartedAt,
        activeAppointment,
        formatDateTime,
        attendanceEndedAt,
        attendanceSignedByFullName,
        completedActDoctorFullName,
        completedActServicesSummary,
        completedActTotalRub,
        installmentSchedulePayerFullName,
        installmentScheduleResponsibleFullName,
        minorConsentDoctorFullName,
        paidContractCareReason,
        paidContractCustomerFullName,
        paidContractDoctorFullName,
        paidContractServiceScope,
        paymentInvoiceBankDetails,
        paymentInvoicePayerFullName,
        postVisitProcedureName,
        postVisitToothOrArea,
        postVisitDoctorFullName,
        treatmentAcceptanceEstimatedTotalRub,
        treatmentEstimateDoctorFullName,
        treatmentPlanEstimatedTotalRub,
        treatmentPlanDoctorFullName,
        warrantyDoctorFullName,
        recordExtractComplaintAndAnamnesis,
        recordExtractObjectiveStatus,
        recordExtractDiagnosis,
        recordExtractTreatmentProvided,
        outpatient025uMedicalCardNumber,
        recordExtractSourceVisitIds,
        clinicProfileDraft,
        recordExtractDoctorFullName,
        recordExtractPeriodEnd,
        toDateInputValue,
    } = scope;

    function treatmentPlanClinicalReasonValue(): string {
		return (
			treatmentPlanClinicalReason.trim() ||
			dashboard?.activeVisit?.complaint?.trim() ||
			"плановое стоматологическое лечение по результатам осмотра"
		);
	}

    function treatmentPlanDiagnosisSummaryValue(): string {
		return (
			treatmentPlanDiagnosisSummary.trim() ||
			dashboard?.activeVisit?.diagnosis?.trim() ||
			dashboard?.activeVisit?.complaint?.trim() ||
			""
		);
	}

    function treatmentPlanTeethOrAreaValue(): string {
		return treatmentPlanTeethOrArea.trim() || inferredTreatmentArea || "";
	}

    function clinicalToothRowsValue(): ClinicalToothRow[] {
		const fallbackArea =
			procedureConsentToothOrArea.trim() ||
			treatmentPlanTeethOrAreaValue() ||
			treatmentAcceptanceTeethOrArea.trim() ||
			inferredTreatmentArea ||
			"область лечения";
		const fallbackFinding =
			procedureConsentDiagnosisOrIndication.trim() ||
			treatmentPlanDiagnosisSummaryValue() ||
			treatmentAcceptanceDiagnosisSummary.trim() ||
			recordExtractDiagnosisValue() ||
			"клиническая находка требует уточнения врачом";
		const fallbackIndication =
			treatmentPlanClinicalReasonValue() ||
			recordExtractComplaintAndAnamnesisValue() ||
			"медицинское показание к лечению";
		const fallbackAction =
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			procedureConsentProcedureName.trim() ||
			treatmentAcceptanceClinicalGoal.trim() ||
			"согласованное стоматологическое лечение";

		return documentTextLines(clinicalToothRowsText).map((line, index) => {
			const [
				toothOrArea,
				surfaces,
				status,
				diagnosisOrFinding,
				indication,
				plannedAction,
				prognosis,
				periodontalStatus,
				implantOrProstheticNotes,
				orthodonticNotes,
			] = line.split("|").map((part) => part.trim());

			return {
				toothOrArea: toothOrArea || fallbackArea || `зона ${index + 1}`,
				surfaces: clinicalToothSurfacesValue(surfaces || ""),
				status: clinicalToothStatusValue(status || ""),
				diagnosisOrFinding: diagnosisOrFinding || fallbackFinding,
				indication: indication || fallbackIndication,
				plannedAction: plannedAction || fallbackAction,
				prognosis: prognosis || null,
				periodontalStatus: periodontalStatus || null,
				implantOrProstheticNotes: implantOrProstheticNotes || null,
				orthodonticNotes: orthodonticNotes || null,
			};
		});
	}

    function _paidContractTotalRubValue(): number {
		const manual = manualRubAmount(paidContractTotalRub);
		return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
	}

    function completedActPaidRubValue(): number {
		const manual = manualRubAmount(completedActPaidRub);
		if (manual > 0) return manual;
		return activePaidPaymentsForVisit().reduce(
			(total, payment) => total + payment.amountRub,
			0,
		);
	}

    function _treatmentEstimatePatientOrPayerFullNameValue(): string {
		return (
			treatmentEstimatePatientOrPayerFullName.trim() ||
			documentPatient?.fullName ||
			""
		);
	}

    function _treatmentEstimateTreatmentBasisValue(): string {
		return (
			treatmentEstimateTreatmentBasis.trim() ||
			compactDocumentText(
				dashboard?.activeVisit?.diagnosis,
				dashboard?.activeVisit?.complaint,
				dashboard?.activeVisit?.treatmentPlan,
			) ||
			"плановое стоматологическое лечение по результатам осмотра"
		);
	}

    function _treatmentEstimateTotalRubValue(): number {
		const manual = manualRubAmount(treatmentEstimateTotalRub);
		return manual > 0 ? manual : paymentInvoiceTotalRubValue();
	}

    function paymentInvoiceTotalRubValue(): number {
		return (
			plannedServiceLinesForFinancialPayload().reduce(
				(total, line) => total + line.totalRub,
				0,
			) || treatmentAcceptancePlannedTotalRub()
		);
	}

    function _paymentReceiptPayerFullNameValue(): string {
		return (
			paymentReceiptPayerFullName.trim() ||
			firstPaymentReceiptPayment()?.payerFullName?.trim() ||
			""
		);
	}

    function _paymentReceiptPayerBirthDateValue(): string {
		return (
			paymentReceiptPayerBirthDate.trim() ||
			firstPaymentReceiptPayment()?.payerBirthDate?.trim() ||
			""
		);
	}

    function _paymentReceiptPayerInnValue(): string {
		return (
			paymentReceiptPayerInn.trim() ||
			firstPaymentReceiptPayment()?.payerInn?.trim() ||
			""
		);
	}

    function _paymentReceiptPayerIdentityDocumentValue(): string {
		return (
			paymentReceiptPayerIdentityDocument.trim() ||
			firstPaymentReceiptPayment()?.payerIdentityDocument?.trim() ||
			""
		);
	}

    function _paymentReceiptPayerRelationshipValue(): string {
		return (
			paymentReceiptPayerRelationship.trim() ||
			firstPaymentReceiptPayment()?.payerRelationship?.trim() ||
			"пациент"
		);
	}

    function _paymentReceiptIssuedByValue(): string {
		return (
			paymentReceiptIssuedBy.trim() ||
			activeDoctor?.fullName ||
			"Администратор клиники"
		);
	}

    function installmentScheduleTotalRubValue(): number {
		const manual = manualRubAmount(installmentScheduleTotalRub);
		return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
	}

    function installmentSchedulePrepaidRubValue(): number {
		const manual = manualRubAmount(installmentSchedulePrepaidRub);
		if (manual > 0) return manual;
		return activePaidPaymentsForVisit().reduce(
			(total, payment) => total + payment.amountRub,
			0,
		);
	}

    function installmentScheduleRemainingRubValue(): number {
		return Math.max(
			0,
			installmentScheduleTotalRubValue() - installmentSchedulePrepaidRubValue(),
		);
	}

    function _installmentScheduleBaseDocumentTitleValue(): string {
		return (
			installmentScheduleBaseDocumentTitle.trim() ||
			activeUsableDocuments?.find(
				(document) => document.kind === "paid_medical_services_contract",
			)?.title ||
			"договор или план лечения клиники"
		);
	}

    function _minorRepresentativeFullNameValue(): string {
		return (
			minorRepresentativeFullName.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativeFullName?.trim() ||
			""
		);
	}

    function _minorRepresentativeRelationshipValue(): string {
		return (
			minorRepresentativeRelationship.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativeRelationship?.trim() ||
			""
		);
	}

    function _minorRepresentativeIdentityDocumentValue(): string {
		return (
			minorRepresentativeIdentityDocument.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativeIdentityDocument?.trim() ||
			""
		);
	}

    function _minorRepresentativePhoneValue(): string {
		return (
			minorRepresentativePhone.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativePhone?.trim() ||
			""
		);
	}

    function _minorConsentPatientFullNameValue(): string {
		return (
			minorConsentPatientFullName.trim() || documentPatient?.fullName || ""
		);
	}

    function _minorConsentPatientBirthDateValue(): string {
		return (
			minorConsentPatientBirthDate.trim() || documentPatient?.birthDate || ""
		);
	}

    function _minorConsentInterventionScopeValue(): string {
		return (
			minorConsentInterventionScope.trim() ||
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			"стоматологическое вмешательство по согласованному плану"
		);
	}

    function _minorConsentDiagnosisOrIndicationValue(): string {
		return (
			minorConsentDiagnosisOrIndication.trim() ||
			dashboard?.activeVisit?.diagnosis?.trim() ||
			dashboard?.activeVisit?.complaint?.trim() ||
			""
		);
	}

    function _warrantyServiceOrWorkNameValue(): string {
		return (
			warrantyServiceOrWorkName.trim() ||
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			dashboard?.activeVisit?.doctorSummary?.trim() ||
			""
		);
	}

    function _warrantyTeethOrAreaValue(): string {
		return (
			warrantyTeethOrArea.trim() ||
			inferredTreatmentArea ||
			"область лечения по визиту"
		);
	}

    function _warrantyLinkedActOrContractValue(): string {
		return (
			warrantyLinkedActOrContract.trim() ||
			activeUsableDocuments?.find(
				(document) =>
					document.kind === "completed_works_act" ||
					document.kind === "paid_medical_services_contract",
			)?.title ||
			"акт выполненных работ или договор клиники"
		);
	}

    function attendanceStartedAtValue(): string {
		return (
			attendanceStartedAt.trim() ||
			(activeAppointment?.startsAt
				? formatDateTime(activeAppointment.startsAt)
				: "")
		);
	}

    function attendanceEndedAtValue(): string {
		return (
			attendanceEndedAt.trim() ||
			(activeAppointment?.endsAt ? formatDateTime(activeAppointment.endsAt) : "")
		);
	}

    function attendanceSignedByValue(): string {
		return attendanceSignedByFullName.trim() || activeDoctor?.fullName || "";
	}

    function completedActDoctorFullNameValue(): string {
		return completedActDoctorFullName.trim() || activeDoctor?.fullName || "";
	}

    function completedActServicesSummaryValue(): string {
		return (
			completedActServicesSummary.trim() ||
			dashboard?.activeVisit?.doctorSummary?.trim() ||
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			""
		);
	}

    function completedActTotalRubValue(): number {
		const manual = manualRubAmount(completedActTotalRub);
		return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
	}

    function installmentSchedulePayerFullNameValue(): string {
		return (
			installmentSchedulePayerFullName.trim() || documentPatient?.fullName || ""
		);
	}

    function installmentScheduleResponsibleFullNameValue(): string {
		return (
			installmentScheduleResponsibleFullName.trim() ||
			activeDoctor?.fullName ||
			"Администратор клиники"
		);
	}

    function minorConsentDoctorFullNameValue(): string {
		return minorConsentDoctorFullName.trim() || activeDoctor?.fullName || "";
	}

    function paidContractCareReasonValue(): string {
		return (
			paidContractCareReason.trim() ||
			dashboard?.activeVisit?.complaint?.trim() ||
			"плановое стоматологическое лечение по результатам осмотра"
		);
	}

    function paidContractCustomerFullNameValue(): string {
		return paidContractCustomerFullName.trim() || documentPatient?.fullName || "";
	}

    function paidContractDoctorFullNameValue(): string {
		return paidContractDoctorFullName.trim() || activeDoctor?.fullName || "";
	}

    function paidContractServiceScopeValue(): string {
		return (
			paidContractServiceScope.trim() ||
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			dashboard?.activeVisit?.doctorSummary?.trim() ||
			""
		);
	}

    function paymentInvoiceBankDetailsValue(): string {
		return (
			paymentInvoiceBankDetails.trim() ||
			dashboard?.clinicSettings?.profile?.bankDetails?.trim() ||
			""
		);
	}

    function paymentInvoicePayerFullNameValue(): string {
		return paymentInvoicePayerFullName.trim() || documentPatient?.fullName || "";
	}

    function postVisitProcedureNameValue(): string {
		return (
			postVisitProcedureName.trim() ||
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			"Рекомендации после стоматологического приема"
		);
	}

    function postVisitToothOrAreaValue(): string {
		return (
			postVisitToothOrArea.trim() ||
			inferredTreatmentArea ||
			"область лечения по записи приема"
		);
	}

    function postVisitDoctorFullNameValue(): string {
		return postVisitDoctorFullName.trim() || activeDoctor?.fullName || "";
	}

    function treatmentAcceptanceTotalRubValue(): number {
		const manual = manualRubAmount(treatmentAcceptanceEstimatedTotalRub);
		return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
	}

    function treatmentEstimateDoctorFullNameValue(): string {
		return treatmentEstimateDoctorFullName.trim() || activeDoctor?.fullName || "";
	}

    function treatmentPlanTotalRubValue(): number {
		const manual = manualRubAmount(treatmentPlanEstimatedTotalRub);
		return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
	}

    function treatmentPlanDoctorFullNameValue(): string {
		return treatmentPlanDoctorFullName.trim() || activeDoctor?.fullName || "";
	}

    function warrantyDoctorFullNameValue(): string {
		return warrantyDoctorFullName.trim() || activeDoctor?.fullName || "";
	}

    function recordExtractComplaintAndAnamnesisValue(): string {
		return (
			recordExtractComplaintAndAnamnesis.trim() ||
			compactDocumentText(
				dashboard?.activeVisit?.complaint,
				dashboard?.activeVisit?.anamnesis,
			)
		);
	}

    function recordExtractObjectiveStatusValue(): string {
		return (
			recordExtractObjectiveStatus.trim() ||
			dashboard?.activeVisit?.objectiveStatus?.trim() ||
			""
		);
	}

    function recordExtractDiagnosisValue(): string {
		return (
			recordExtractDiagnosis.trim() ||
			dashboard?.activeVisit?.diagnosis?.trim() ||
			""
		);
	}

    function recordExtractTreatmentProvidedValue(): string {
		return (
			recordExtractTreatmentProvided.trim() ||
			compactDocumentText(
				dashboard?.activeVisit?.doctorSummary,
				dashboard?.activeVisit?.treatmentPlan,
			)
		);
	}

    function outpatient025uMedicalCardNumberValue(): string {
		const explicitNumber = outpatient025uMedicalCardNumber.trim();
		if (explicitNumber) return explicitNumber;
		const patientToken =
			documentPatient?.id.slice(0, 8).toUpperCase() ?? "PATIENT";
		return `DENTE-${new Date().getFullYear()}-${patientToken}`;
	}

    function outpatient025uSourceVisitIdsValue(): string[] {
		const sourceVisitIds = documentTextLines(recordExtractSourceVisitIds);
		if (sourceVisitIds.length) return sourceVisitIds;
		return dashboard?.activeVisit?.id ? [dashboard?.activeVisit?.id] : [];
	}

    function outpatient025uLicenseValue(): string | null {
		const value = compactDocumentText(
			clinicProfileDraft?.medicalLicenseNumber,
			clinicProfileDraft?.medicalLicenseIssuedAt,
			clinicProfileDraft?.medicalLicenseIssuer,
		);
		return value || null;
	}

    function outpatient025uDoctorValue(): {
		fullName: string;
		position: string;
		specialty: string;
	} {
		return {
			fullName:
				recordExtractDoctorFullName.trim() || activeDoctor?.fullName || "",
			position: "врач-стоматолог",
			specialty: activeDoctor?.specialties?.[0] ?? "стоматология",
		};
	}

    function outpatient025uVisitDateValue(): string {
		return (
			recordExtractPeriodEnd.trim() ||
			toDateInputValue(activeAppointment?.startsAt) ||
			new Date().toISOString().slice(0, 10)
		);
	}

    return {
        treatmentPlanClinicalReasonValue,
        treatmentPlanDiagnosisSummaryValue,
        treatmentPlanTeethOrAreaValue,
        clinicalToothRowsValue,
        _paidContractTotalRubValue,
        completedActPaidRubValue,
        _treatmentEstimatePatientOrPayerFullNameValue,
        _treatmentEstimateTreatmentBasisValue,
        _treatmentEstimateTotalRubValue,
        paymentInvoiceTotalRubValue,
        _paymentReceiptPayerFullNameValue,
        _paymentReceiptPayerBirthDateValue,
        _paymentReceiptPayerInnValue,
        _paymentReceiptPayerIdentityDocumentValue,
        _paymentReceiptPayerRelationshipValue,
        _paymentReceiptIssuedByValue,
        installmentScheduleTotalRubValue,
        installmentSchedulePrepaidRubValue,
        installmentScheduleRemainingRubValue,
        _installmentScheduleBaseDocumentTitleValue,
        _minorRepresentativeFullNameValue,
        _minorRepresentativeRelationshipValue,
        _minorRepresentativeIdentityDocumentValue,
        _minorRepresentativePhoneValue,
        _minorConsentPatientFullNameValue,
        _minorConsentPatientBirthDateValue,
        _minorConsentInterventionScopeValue,
        _minorConsentDiagnosisOrIndicationValue,
        _warrantyServiceOrWorkNameValue,
        _warrantyTeethOrAreaValue,
        _warrantyLinkedActOrContractValue,
        attendanceStartedAtValue,
        attendanceEndedAtValue,
        attendanceSignedByValue,
        completedActDoctorFullNameValue,
        completedActServicesSummaryValue,
        completedActTotalRubValue,
        installmentSchedulePayerFullNameValue,
        installmentScheduleResponsibleFullNameValue,
        minorConsentDoctorFullNameValue,
        paidContractCareReasonValue,
        paidContractCustomerFullNameValue,
        paidContractDoctorFullNameValue,
        paidContractServiceScopeValue,
        paymentInvoiceBankDetailsValue,
        paymentInvoicePayerFullNameValue,
        postVisitProcedureNameValue,
        postVisitToothOrAreaValue,
        postVisitDoctorFullNameValue,
        treatmentAcceptanceTotalRubValue,
        treatmentEstimateDoctorFullNameValue,
        treatmentPlanTotalRubValue,
        treatmentPlanDoctorFullNameValue,
        warrantyDoctorFullNameValue,
        recordExtractComplaintAndAnamnesisValue,
        recordExtractObjectiveStatusValue,
        recordExtractDiagnosisValue,
        recordExtractTreatmentProvidedValue,
        outpatient025uMedicalCardNumberValue,
        outpatient025uSourceVisitIdsValue,
        outpatient025uLicenseValue,
        outpatient025uDoctorValue,
        outpatient025uVisitDateValue,
    };
}
