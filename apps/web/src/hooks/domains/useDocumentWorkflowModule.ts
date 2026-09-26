import {
	type Appointment,
	type Dashboard,
	documentKindMetadata,
	type GeneratedDocument,
	multiplyKopecks,
	type Patient,
	type Payment,
	parseKopecks,
	percentageOfKopecks,
	type StaffMember,
	sumKopecks,
	type TreatmentPlanItem,
} from "@dental/shared";
import { useEffect, useMemo, useRef } from "react";
import {
	type ClinicProfileDraft,
	type VisitNoteForm,
} from "../../AppConstants";
import {
	saveDocumentIssueSignatureDraft,
} from "../../AppHelpers";
import { completedActContractReferenceForUi } from "../../workspaceUiLabels";
import type { useAuthLogic } from "../../hooks/domains/useAuthLogic";
import { useDocumentStore } from "../../store/documentStore";
import { compactDocumentText } from "../../utils/documentPayloadUtils";
import { useDocumentCreation } from "./documents/useDocumentCreation";
import { useDocumentDerivedValues } from "./documents/useDocumentDerivedValues";
import { useDocumentIssueActions } from "./documents/useDocumentIssueActions";
import { useDocumentTaxPayments } from "./documents/useDocumentTaxPayments";

export interface DocumentWorkflowModuleProps {
	dashboard: Dashboard | null;
	auth: ReturnType<typeof useAuthLogic>;
	activeDoctor: StaffMember | null;
	activePayments: Payment[];
	activeTreatmentPlanItems: TreatmentPlanItem[];
	documentPatient: Patient | null;
	clinicProfileDraft: ClinicProfileDraft;
	activeAppointment: Appointment | null;
	visitNoteForm: VisitNoteForm;
	clinicalAdminSecretSession: string;
	setError: (error: string | null) => void;
	loadDashboard: (options?: { adminSecret?: string }) => Promise<void>;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setCurrentView: (view: any) => void;
}

export function useDocumentWorkflowModule({
	dashboard,
	auth,
	activeDoctor,
	activePayments,
	activeTreatmentPlanItems,
	documentPatient,
	clinicProfileDraft,
	activeAppointment,
	visitNoteForm,
	clinicalAdminSecretSession,
	setError,
	loadDashboard,
	setCurrentView,
}: DocumentWorkflowModuleProps) {
	const documentState = useDocumentStore();
	const releaseSourceRequestAutofillRef = useRef<string | null>(null);

	const documentPatientMatchesActiveVisit =
		dashboard?.activeVisit?.patientId === documentPatient?.id;

	const activeDocuments = useMemo(() => {
		if (!dashboard || !documentPatient) return [];
		return (dashboard.documents || []).filter(
			(document) =>
				document.patientId === documentPatient.id &&
				(!documentPatientMatchesActiveVisit ||
					document.visitId === null ||
					document.visitId === dashboard?.activeVisit?.id),
		);
	}, [
		dashboard,
		documentPatient?.id,
		documentPatientMatchesActiveVisit,
		documentPatient,
	]);

	const activeUsableDocuments = useMemo(() => {
		return activeDocuments.filter((document) => document.status !== "voided");
	}, [activeDocuments]);

	const documentIssueConfirmation = useMemo(() => {
		if (!documentState.documentIssueConfirmationId) return null;
		return (
			activeDocuments?.find(
				(document) =>
					document.id === documentState.documentIssueConfirmationId &&
					document.status === "draft",
			) ?? null
		);
	}, [activeDocuments, documentState.documentIssueConfirmationId]);

	const documentVoidConfirmation = useMemo(() => {
		if (!documentState.documentVoidConfirmationId) return null;
		return (
			activeDocuments?.find(
				(document) =>
					document.id === documentState.documentVoidConfirmationId &&
					document.status !== "voided",
			) ?? null
		);
	}, [activeDocuments, documentState.documentVoidConfirmationId]);

	const documentIssueAttestationReady = useMemo(() => {
		return Boolean(
			documentIssueConfirmation &&
				documentState.documentIssueSignedAt.trim() &&
				documentState.documentIssueRecipientFullName.trim() &&
				documentState.documentIssueRecipientRole.trim() &&
				documentState.documentIssueStaffFullName.trim() &&
				documentState.documentIssueStaffRole.trim() &&
				documentState.documentIssueIdentityChecked &&
				documentState.documentIssueDocumentOpenedAndChecked &&
				documentState.documentIssueRecipientSigned &&
				documentState.documentIssueClinicSigned,
		);
	}, [
		documentIssueConfirmation,
		documentState.documentIssueClinicSigned,
		documentState.documentIssueDocumentOpenedAndChecked,
		documentState.documentIssueIdentityChecked,
		documentState.documentIssueRecipientFullName,
		documentState.documentIssueRecipientRole,
		documentState.documentIssueRecipientSigned,
		documentState.documentIssueSignedAt,
		documentState.documentIssueStaffFullName,
		documentState.documentIssueStaffRole,
	]);

	const documentVoidReady = useMemo(() => {
		return Boolean(
			documentVoidConfirmation &&
				documentState.documentVoidReasonText.trim().length >= 12 &&
				documentState.documentVoidStaffFullName.trim() &&
				documentState.documentVoidStaffRole.trim() &&
				documentState.documentVoidArchivePreserved &&
				documentState.documentVoidStatusReviewed,
		);
	}, [
		documentVoidConfirmation,
		documentState.documentVoidArchivePreserved,
		documentState.documentVoidReasonText,
		documentState.documentVoidStaffFullName,
		documentState.documentVoidStaffRole,
		documentState.documentVoidStatusReviewed,
	]);

	useEffect(() => {
		saveDocumentIssueSignatureDraft(
			dashboard?.clinicSettings?.profile?.organizationId ?? null,
			documentState.documentIssueSignatureMode,
			documentState.documentIssueStaffFullName,
			documentState.documentIssueStaffRole,
		);
	}, [
		dashboard?.clinicSettings?.profile?.organizationId,
		documentState.documentIssueSignatureMode,
		documentState.documentIssueStaffFullName,
		documentState.documentIssueStaffRole,
	]);

	const activeIssuedPaidContracts = useMemo(() => {
		return activeDocuments
			.filter(
				(document) =>
					document.kind === "paid_medical_services_contract" &&
					document.status === "issued" &&
					document.visitId !== null,
			)
			.sort((left, right) =>
				(right.issuedAt ?? "").localeCompare(left.issuedAt ?? ""),
			);
	}, [activeDocuments]);

	const selectedCompletedActContractDocumentId = useMemo(() => {
		if (
			activeIssuedPaidContracts.some(
				(document) =>
					document.id === documentState.completedActLinkedContractDocumentId,
			)
		) {
			return documentState.completedActLinkedContractDocumentId;
		}
		return activeIssuedPaidContracts.length === 1
			? (activeIssuedPaidContracts[0]?.id ?? "")
			: "";
	}, [
		activeIssuedPaidContracts,
		documentState.completedActLinkedContractDocumentId,
	]);

	useEffect(() => {
		if (
			documentState.completedActContractNumber.trim() ||
			!selectedCompletedActContractDocumentId
		)
			return;
		const contract = activeIssuedPaidContracts?.find(
			(document) => document.id === selectedCompletedActContractDocumentId,
		);
		if (contract)
			documentState.setCompletedActContractNumber(
				completedActContractReferenceForUi(contract),
			);
	}, [
		activeIssuedPaidContracts,
		documentState.completedActContractNumber,
		selectedCompletedActContractDocumentId,
		documentState.setCompletedActContractNumber,
	]);

	const issuedMedicalCopyRequestDocuments = useMemo(() => {
		return activeUsableDocuments
			.filter(
				(document) =>
					document.kind === "medical_record_copy_request" &&
					document.status === "issued",
			)
			.sort((left, right) =>
				(right.issuedAt ?? "").localeCompare(left.issuedAt ?? ""),
			);
	}, [activeUsableDocuments]);

	const selectedReleaseSourceRequestDocumentId = useMemo(() => {
		if (
			issuedMedicalCopyRequestDocuments.some(
				(document) =>
					document.id === documentState.releaseSourceRequestDocumentId,
			)
		) {
			return documentState.releaseSourceRequestDocumentId;
		}
		return issuedMedicalCopyRequestDocuments.length === 1
			? (issuedMedicalCopyRequestDocuments[0]?.id ?? "")
			: "";
	}, [
		issuedMedicalCopyRequestDocuments,
		documentState.releaseSourceRequestDocumentId,
	]);

	useEffect(() => {
		if (!selectedReleaseSourceRequestDocumentId) {
			releaseSourceRequestAutofillRef.current = null;
			return;
		}
		if (
			releaseSourceRequestAutofillRef.current ===
			selectedReleaseSourceRequestDocumentId
		)
			return;
		const sourceDocument = issuedMedicalCopyRequestDocuments?.find(
			(document) => document.id === selectedReleaseSourceRequestDocumentId,
		);
		const request = sourceDocument?.chainSummary?.medicalRecordCopyRequest;
		if (!request) return;

		releaseSourceRequestAutofillRef.current =
			selectedReleaseSourceRequestDocumentId;
		documentState.setReleaseSourceRequestDocumentId(
			selectedReleaseSourceRequestDocumentId,
		);
		documentState.setReleaseRecipientFullName(request.recipientFullName);
		documentState.setReleaseRecipientIdentityDocument(
			request.recipientIdentityDocument,
		);
		documentState.setReleaseRecipientAuthority(request.recipientAuthority);
		documentState.setReleaseChannel(request.requestedFormat);
		documentState.setReleaseDocumentTypes(
			request.requestedDocumentTypes.join("\n"),
		);
		documentState.setReleasePeriodStart(request.periodStart ?? "");
		documentState.setReleasePeriodEnd(request.periodEnd ?? "");
	}, [
		issuedMedicalCopyRequestDocuments,
		selectedReleaseSourceRequestDocumentId,
		documentState.setReleaseRecipientAuthority,
		documentState.setReleaseChannel,
		documentState.setReleaseRecipientFullName,
		documentState.setReleaseRecipientIdentityDocument,
		documentState.setReleaseSourceRequestDocumentId,
		documentState.setReleaseDocumentTypes,
		documentState.setReleasePeriodEnd,
		documentState.setReleasePeriodStart,
	]);

	const patientBillingSummary = useMemo<Dashboard["billingSummary"] | null>(() => {
		if (!dashboard || !documentPatient) return null;
		const activePlanItems = activeTreatmentPlanItems.filter(
			(item) => item.status !== "cancelled",
		);

		const treatmentLineTotalKopecks = (
			item: (typeof activePlanItems)[number],
		) => {
			const rawItem = item as unknown as {
				unitPriceRub?: number;
				priceRub?: number;
			};
			const unitKopecks = parseKopecks(
				rawItem.unitPriceRub ?? rawItem.priceRub ?? 0,
			);
			const quantity = Math.max(0, Math.round(Number(item.quantity) || 1));
			const subtotalKopecks = multiplyKopecks(unitKopecks, quantity);
			const discountKopecks = parseKopecks(item.discountRub ?? 0);
			return Math.max(0, subtotalKopecks - discountKopecks);
		};
		const totalPlannedKopecks = sumKopecks(
			activePlanItems.map((item) => treatmentLineTotalKopecks(item)),
		);
		const totalDiscountKopecks = sumKopecks(
			activePlanItems.map((item) => parseKopecks(item.discountRub)),
		);
		const totalPaidKopecks = sumKopecks(
			activePayments
				.filter((payment) => payment.status === "paid")
				.map((payment) => parseKopecks(payment.amountRub)),
		);
		const taxDeductionEligibleKopecks = sumKopecks(
			activePlanItems.map((item) => {
				const service = dashboard.serviceCatalog?.find(
					(candidate) => candidate.id === item.serviceId,
				);
				return service?.taxDeductible ? treatmentLineTotalKopecks(item) : 0;
			}),
		);
		const draftDocumentAmountKopecks = sumKopecks(
			activeUsableDocuments
				.filter((document) => document.status === "draft")
				.map((document) => parseKopecks(document.totalAmountRub ?? 0)),
		);
		const unpaidDocuments = activeUsableDocuments.filter(
			(document) =>
				document.status === "draft" &&
				(document.totalAmountRub ?? 0) > 0 &&
				!activePayments.some(
					(payment) =>
						payment.status === "paid" && payment.documentId === document.id,
				),
		).length;
		let insuranceCoverageKopecks = 0;
		const contractId =
			(documentPatient?.administrativeProfile as any)?.insuranceContractId;
		if (contractId) {
			const contract = dashboard?.insuranceContracts?.find(
				(c) => c.id === contractId,
			);
			if (contract?.isActive) {
				let accumulatedKopecks = 0;
				for (const item of activePlanItems) {
					const service = dashboard.serviceCatalog?.find(
						(s) => s.id === item.serviceId,
					);
					const category = service?.category || "other";
					let pct = 0;
					if (
						category === "therapy" ||
						category === "consultation" ||
						category === "periodontology"
					)
						pct = contract.coverageTherapyPct || 0;
					else if (category === "surgery")
						pct = contract.coverageSurgeryPct || 0;
					else if (category === "orthodontics" || category === "prosthetics")
						pct = contract.coverageOrthoPct || 0;
					else if (category === "hygiene")
						pct = contract.coverageHygienePct || 0;

					const lineKopecks = treatmentLineTotalKopecks(item);
					const basisPoints = Math.round(pct * 100);
					accumulatedKopecks += percentageOfKopecks(lineKopecks, basisPoints);
				}

				const annualLimitKopecks = parseKopecks(contract.annualLimitRub ?? 0);
				insuranceCoverageKopecks =
					annualLimitKopecks > 0
						? Math.min(accumulatedKopecks, annualLimitKopecks)
						: accumulatedKopecks;
			}
		}

		const totalPlannedRub = totalPlannedKopecks / 100;
		const totalDiscountRub = totalDiscountKopecks / 100;
		const totalPaidRub = totalPaidKopecks / 100;
		const insuranceCoverageRub = insuranceCoverageKopecks / 100;
		const taxDeductionEligibleRub = taxDeductionEligibleKopecks / 100;
		const draftDocumentAmountRub = draftDocumentAmountKopecks / 100;
		const totalDueKopecks = Math.max(
			0,
			totalPlannedKopecks - insuranceCoverageKopecks - totalPaidKopecks,
		);
		const totalDueRub = totalDueKopecks / 100;

		return {
			totalPlannedRub,
			totalDiscountRub,
			totalPaidRub,
			totalDueRub,
			taxDeductionEligibleRub,
			draftDocumentAmountRub,
			openTreatmentItems: activePlanItems.filter(
				(item) => item.status !== "completed",
			).length,
			unpaidDocuments,
			insuranceCoverageRub,
		};
	}, [
		activePayments,
		activeTreatmentPlanItems,
		activeUsableDocuments,
		dashboard,
		documentPatient?.id,
		documentPatient,
	]);

	const documentLocalPersistenceOrganizationId =
		dashboard?.clinicSettings?.profile?.organizationId ?? null;

	const taxPayments = useDocumentTaxPayments({
		activePayments,
		dashboard,
		documentPatient,
		documentLocalPersistenceOrganizationId,
		taxDocumentYear: documentState.taxDocumentYear,
		taxDocumentPayerInn: documentState.taxDocumentPayerInn,
		selectedDocumentKind: documentState.selectedDocumentKind,
		selectedTaxPaymentIds: documentState.selectedTaxPaymentIds,
		setSelectedTaxPaymentIds: documentState.setSelectedTaxPaymentIds,
		selectedPaymentReceiptIds: documentState.selectedPaymentReceiptIds,
		setSelectedPaymentReceiptIds: documentState.setSelectedPaymentReceiptIds,
		refundSelectedPaymentId: documentState.refundSelectedPaymentId,
		setRefundSelectedPaymentId: documentState.setRefundSelectedPaymentId,
		refundAmountRub: documentState.refundAmountRub,
		setRefundAmountRub: documentState.setRefundAmountRub,
		refundRecipientFullName: documentState.refundRecipientFullName,
		setRefundRecipientFullName: documentState.setRefundRecipientFullName,
		refundRecipientIdentityDocument:
			documentState.refundRecipientIdentityDocument,
		setRefundRecipientIdentityDocument:
			documentState.setRefundRecipientIdentityDocument,
		setRefundOriginalFiscalReceiptNumber:
			documentState.setRefundOriginalFiscalReceiptNumber,
		taxApplicationForm: documentState.taxApplicationForm,
		setTaxApplicationForm: documentState.setTaxApplicationForm,
	});

	const issueActions = useDocumentIssueActions({
		dashboard,
		auth,
		activeDoctor,
		clinicalAdminSecretSession,
		documentStatusSavingId: documentState.documentStatusSavingId,
		setDocumentStatusSavingId: documentState.setDocumentStatusSavingId,
		documentIssueConfirmation,
		documentVoidConfirmation,
		documentIssueSignedAt: documentState.documentIssueSignedAt,
		setDocumentIssueSignedAt: documentState.setDocumentIssueSignedAt,
		documentIssueRecipientFullName:
			documentState.documentIssueRecipientFullName,
		setDocumentIssueRecipientFullName:
			documentState.setDocumentIssueRecipientFullName,
		documentIssueRecipientRole: documentState.documentIssueRecipientRole,
		setDocumentIssueRecipientRole: documentState.setDocumentIssueRecipientRole,
		documentIssueStaffFullName: documentState.documentIssueStaffFullName,
		setDocumentIssueStaffFullName: documentState.setDocumentIssueStaffFullName,
		documentIssueStaffRole: documentState.documentIssueStaffRole,
		setDocumentIssueStaffRole: documentState.setDocumentIssueStaffRole,
		documentIssueIdentityChecked: documentState.documentIssueIdentityChecked,
		setDocumentIssueIdentityChecked:
			documentState.setDocumentIssueIdentityChecked,
		documentIssueDocumentOpenedAndChecked:
			documentState.documentIssueDocumentOpenedAndChecked,
		setDocumentIssueDocumentOpenedAndChecked:
			documentState.setDocumentIssueDocumentOpenedAndChecked,
		documentIssueRecipientSigned: documentState.documentIssueRecipientSigned,
		setDocumentIssueRecipientSigned:
			documentState.setDocumentIssueRecipientSigned,
		documentIssueClinicSigned: documentState.documentIssueClinicSigned,
		setDocumentIssueClinicSigned: documentState.setDocumentIssueClinicSigned,
		documentIssueNote: documentState.documentIssueNote,
		setDocumentIssueNote: documentState.setDocumentIssueNote,
		documentIssueConfirmationId: documentState.documentIssueConfirmationId,
		setDocumentIssueConfirmationId:
			documentState.setDocumentIssueConfirmationId,
		documentIssueSignatureMode: documentState.documentIssueSignatureMode,
		documentIssueAttestationReady,
		documentVoidReasonCode: documentState.documentVoidReasonCode,
		setDocumentVoidReasonCode: documentState.setDocumentVoidReasonCode,
		documentVoidReasonText: documentState.documentVoidReasonText,
		setDocumentVoidReasonText: documentState.setDocumentVoidReasonText,
		documentVoidStaffFullName: documentState.documentVoidStaffFullName,
		setDocumentVoidStaffFullName: documentState.setDocumentVoidStaffFullName,
		documentVoidStaffRole: documentState.documentVoidStaffRole,
		setDocumentVoidStaffRole: documentState.setDocumentVoidStaffRole,
		documentVoidCorrectionDocumentId:
			documentState.documentVoidCorrectionDocumentId,
		setDocumentVoidCorrectionDocumentId:
			documentState.setDocumentVoidCorrectionDocumentId,
		documentVoidReplacementRequired:
			documentState.documentVoidReplacementRequired,
		setDocumentVoidReplacementRequired:
			documentState.setDocumentVoidReplacementRequired,
		documentVoidPatientOrPayerNotified:
			documentState.documentVoidPatientOrPayerNotified,
		setDocumentVoidPatientOrPayerNotified:
			documentState.setDocumentVoidPatientOrPayerNotified,
		documentVoidArchivePreserved: documentState.documentVoidArchivePreserved,
		setDocumentVoidArchivePreserved:
			documentState.setDocumentVoidArchivePreserved,
		documentVoidStatusReviewed: documentState.documentVoidStatusReviewed,
		setDocumentVoidStatusReviewed: documentState.setDocumentVoidStatusReviewed,
		documentVoidConfirmationId: documentState.documentVoidConfirmationId,
		setDocumentVoidConfirmationId: documentState.setDocumentVoidConfirmationId,
		documentVoidReady,
		setDocumentAuditFacts: documentState.setDocumentAuditFacts,
		setDocumentAuditFactsLoadingId:
			documentState.setDocumentAuditFactsLoadingId,
		setError,
		loadDashboard,
	});

	const creation = useDocumentCreation({
		dashboard,
		auth,
		activeDoctor,
		documentPatient,
		documentPatientMatchesActiveVisit,
		documentState,
		documentCreateSavingKind: documentState.documentCreateSavingKind,
		setDocumentCreateSavingKind: documentState.setDocumentCreateSavingKind,
		setError,
		loadDashboard,
	});

	const derived = useDocumentDerivedValues({
		dashboard,
		activeDoctor,
		activePayments,
		activeTreatmentPlanItems,
		documentPatient,
		activeAppointment,
		visitNoteForm,
		clinicProfileDraft,
		documentState,
		activeUsableDocuments,
		selectedPaymentReceiptPayments: taxPayments.selectedPaymentReceiptPayments,
		setCurrentView,
		setError,
	});

	const _inn =
		documentPatient?.administrativeProfile?.taxpayerInn?.trim() || "";
	const _insuranceContractId =
		(documentPatient?.administrativeProfile as any)?.insuranceContractId || "";

	return {
		...documentState,
		applyQuickDocumentPackage: creation.applyQuickDocumentPackage,
		createDocument: creation.createDocument,
		requestDocumentIssue: issueActions.requestDocumentIssue,
		confirmDocumentIssue: issueActions.confirmDocumentIssue,
		requestDocumentVoid: issueActions.requestDocumentVoid,
		confirmDocumentVoid: issueActions.confirmDocumentVoid,
		downloadTaxDocumentXml: issueActions.downloadTaxDocumentXml,
		loadDocumentAuditFacts: issueActions.loadDocumentAuditFacts,
		downloadIssuedDocumentHtml: issueActions.downloadIssuedDocumentHtml,
		openIssuedDocumentHtml: issueActions.openIssuedDocumentHtml,
		downloadIssuedDocumentPdf: issueActions.downloadIssuedDocumentPdf,
		signDocumentUkep: issueActions.signDocumentUkep,
		documentIssueConfirmation,
		documentIssueAttestationReady,
		documentVoidConfirmation,
		documentVoidReady,
		activeDocuments,
		activeUsableDocuments,
		patientBillingSummary,
		activeIssuedPaidContracts,
		selectedCompletedActContractDocumentId,
		issuedMedicalCopyRequestDocuments,
		selectedReleaseSourceRequestDocumentId,
		documentPatientMatchesActiveVisit,
		medicalRecordExtractDraftVisitId: documentPatientMatchesActiveVisit
			? (dashboard?.activeVisit?.id ?? null)
			: null,
		updateDocumentStatus: issueActions.updateDocumentStatus,
		openCommunicationTaskDocumentWorkflow:
			derived.openCommunicationTaskDocumentWorkflow,
		dentalMedicalCard043uPayloadValue: derived.dentalMedicalCard043uPayloadValue,
		dentalMedicalCardDoctorValue: derived.dentalMedicalCardDoctorValue,
		dentalMedicalCardVisitDateValue: derived.dentalMedicalCardVisitDateValue,
		changePostVisitCareTopic: derived.changePostVisitCareTopic,
		documentKindsForCommunicationTask: derived.documentKindsForCommunicationTask,
		togglePhotoVideoMaterial: derived.togglePhotoVideoMaterial,
		taxDocumentPayerOptions: taxPayments.taxDocumentPayerOptions,
		selectedTaxDocumentPayerKey: taxPayments.selectedTaxDocumentPayerKey,
		selectedTaxDocumentPayerInn: taxPayments.selectedTaxDocumentPayerInn,
		selectedDocumentUsesTaxPaymentSelection:
			taxPayments.selectedDocumentUsesTaxPaymentSelection,
		selectedDocumentMetadata:
			taxPayments.selectedDocumentMetadata ||
			documentKindMetadata[documentState.selectedDocumentKind],
		eligibleTaxPayments: taxPayments.eligibleTaxPayments,
		selectedTaxPaymentIdSet: taxPayments.selectedTaxPaymentIdSet,
		selectedEligibleTaxPayments: taxPayments.selectedEligibleTaxPayments,
		selectedTaxPaymentTotalRub: taxPayments.selectedTaxPaymentTotalRub,
		selectedTaxPaymentIdsForCurrentDocument:
			taxPayments.selectedTaxPaymentIdsForCurrentDocument,
		selectAllEligibleTaxPaymentsForCurrentDocument:
			taxPayments.selectAllEligibleTaxPaymentsForCurrentDocument,
		eligiblePaymentReceiptPayments:
			taxPayments.eligiblePaymentReceiptPayments,
		selectedPaymentReceiptIdSet: taxPayments.selectedPaymentReceiptIdSet,
		selectedPaymentReceiptPayments:
			taxPayments.selectedPaymentReceiptPayments,
		selectedPaymentReceiptTotalRub:
			taxPayments.selectedPaymentReceiptTotalRub,
		eligibleRefundCorrectionPayments:
			taxPayments.eligibleRefundCorrectionPayments,
		selectedRefundCorrectionPayment:
			taxPayments.selectedRefundCorrectionPayment,
		selectRefundOriginalPayment: taxPayments.selectRefundOriginalPayment,
		inferredTreatmentArea: derived.inferredTreatmentArea,
		activeTreatmentPlanScenarios: derived._activeTreatmentPlanScenarios,
		activeVisitClinicalRuleEvaluations:
			derived.activeVisitClinicalRuleEvaluations,
		patientClinicalRuleEvaluations: derived.patientClinicalRuleEvaluations,
		activeVisitClinicalRuleSummary: derived._activeVisitClinicalRuleSummary,
		patientClinicalRuleSummary: derived._patientClinicalRuleSummary,
		compactDocumentText,
		treatmentAcceptancePlannedTotalRub:
			derived.treatmentAcceptancePlannedTotalRub,
		paidContractTotalRubValue: derived._paidContractTotalRubValue,
		completedActPaidRubValue: derived.completedActPaidRubValue,
		completedActFiscalReceiptLines: derived._completedActFiscalReceiptLines,
		plannedServiceLinesForFinancialPayload:
			derived.plannedServiceLinesForFinancialPayload,
		treatmentEstimatePatientOrPayerFullNameValue:
			derived._treatmentEstimatePatientOrPayerFullNameValue,
		treatmentEstimateTreatmentBasisValue:
			derived._treatmentEstimateTreatmentBasisValue,
		treatmentEstimateTotalRubValue: derived._treatmentEstimateTotalRubValue,
		paymentInvoiceTotalRubValue: derived.paymentInvoiceTotalRubValue,
		paymentReceiptPayerFullNameValue:
			derived._paymentReceiptPayerFullNameValue,
		paymentReceiptPayerBirthDateValue:
			derived._paymentReceiptPayerBirthDateValue,
		paymentReceiptPayerInnValue: derived._paymentReceiptPayerInnValue,
		paymentReceiptPayerIdentityDocumentValue:
			derived._paymentReceiptPayerIdentityDocumentValue,
		paymentReceiptPayerRelationshipValue:
			derived._paymentReceiptPayerRelationshipValue,
		paymentReceiptIssuedByValue: derived._paymentReceiptIssuedByValue,
		paymentReceiptFiscalReceiptLines:
			derived._paymentReceiptFiscalReceiptLines,
		installmentScheduleTotalRubValue:
			derived.installmentScheduleTotalRubValue,
		installmentSchedulePrepaidRubValue:
			derived.installmentSchedulePrepaidRubValue,
		installmentScheduleRemainingRubValue:
			derived.installmentScheduleRemainingRubValue,
		installmentScheduleInstallmentRows:
			derived._installmentScheduleInstallmentRows,
		installmentScheduleBaseDocumentTitleValue:
			derived._installmentScheduleBaseDocumentTitleValue,
		minorRepresentativeFullNameValue:
			derived._minorRepresentativeFullNameValue,
		minorRepresentativeRelationshipValue:
			derived._minorRepresentativeRelationshipValue,
		minorRepresentativeIdentityDocumentValue:
			derived._minorRepresentativeIdentityDocumentValue,
		minorRepresentativePhoneValue: derived._minorRepresentativePhoneValue,
		minorConsentPatientFullNameValue:
			derived._minorConsentPatientFullNameValue,
		minorConsentPatientBirthDateValue:
			derived._minorConsentPatientBirthDateValue,
		minorConsentInterventionScopeValue:
			derived._minorConsentInterventionScopeValue,
		minorConsentDiagnosisOrIndicationValue:
			derived._minorConsentDiagnosisOrIndicationValue,
		warrantyServiceOrWorkNameValue: derived._warrantyServiceOrWorkNameValue,
		warrantyTeethOrAreaValue: derived._warrantyTeethOrAreaValue,
		warrantyLinkedActOrContractValue:
			derived._warrantyLinkedActOrContractValue,
		markPostVisitManualEdited: derived._markPostVisitManualEdited,
		inn: _inn,
		insuranceContractId: _insuranceContractId,
	};
}
