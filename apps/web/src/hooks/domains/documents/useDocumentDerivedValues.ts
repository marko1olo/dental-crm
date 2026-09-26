import {
	type Appointment,
	type ClinicalToothRow,
	type Dashboard,
	type DentalMedicalCard043uPayload,
	type GeneratedDocument,
	type Patient,
	type Payment,
	type PhotoVideoConsentMaterial,
	type PostVisitCareTopic,
	type StaffMember,
	type TreatmentPlanItem,
} from "@dental/shared";
import { useMemo } from "react";
import {
	type ClinicProfileDraft,
	type VisitNoteForm,
} from "../../../AppConstants";
import {
	patientName,
	toDateInputValue,
} from "../../../AppHelpers";
import { createDocumentFinancialCalculations } from "./documentFinancialCalculations";
import {
	telegramCareRequestTaskCareTopics,
	telegramCareRequestWorkflowCareTopics,
	telegramDocumentRequestTaskDocumentKinds,
	telegramDocumentRequestWorkflowDocumentKinds,
} from "../../../communicationTaskData";
import { postVisitCarePresets } from "../../../postVisitCareData";

import {
	clinicalToothStatusValue,
	clinicalToothSurfacesValue,
	compactDocumentText,
	documentTextLines,
} from "../../../utils/documentPayloadUtils";
import { postVisitCareTopicOptions } from "../../../workspaceStaticOptions";
import {
	clinicalRuleSummaryForUi,
	documentLabels,
} from "../../../workspaceUiLabels";

export interface UseDocumentDerivedValuesProps {
	dashboard: Dashboard | null;
	activeDoctor: StaffMember | null;
	activePayments: Payment[];
	activeTreatmentPlanItems: TreatmentPlanItem[];
	documentPatient: Patient | null;
	activeAppointment: Appointment | null;
	visitNoteForm: VisitNoteForm;
	clinicProfileDraft: ClinicProfileDraft;
	documentState: any;
	activeUsableDocuments: GeneratedDocument[];
	selectedPaymentReceiptPayments: Payment[];
	setCurrentView: (view: any) => void;
	setError: (err: string | null) => void;
}

export function useDocumentDerivedValues({
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
	selectedPaymentReceiptPayments,
	setCurrentView,
	setError,
}: UseDocumentDerivedValuesProps) {
	const inferredTreatmentArea = useMemo(() => {
		const toothCodes = activeTreatmentPlanItems
			.filter((item) => item.status !== "cancelled")
			.map((item) => item.toothCode?.trim())
			.filter((toothCode): toothCode is string => Boolean(toothCode));
		return Array.from(new Set(toothCodes)).slice(0, 6).join(", ");
	}, [activeTreatmentPlanItems]);

	const _activeTreatmentPlanScenarios = useMemo(() => {
		if (!dashboard || !documentPatient) return [];
		return (dashboard.treatmentPlanScenarios || []).filter(
			(scenario) => scenario.patientId === documentPatient.id,
		);
	}, [dashboard, documentPatient?.id, documentPatient]);

	const activeVisitClinicalRuleEvaluations = useMemo(() => {
		if (!dashboard) return [];
		const severityRank = { blocker: 0, warning: 1, info: 2 } as const;
		return (dashboard.clinicalRuleEvaluations || [])
			.filter(
				(evaluation) =>
					evaluation.patientId === dashboard?.activeVisit?.patientId,
			)
			.sort(
				(left, right) =>
					Number(left.resolved) - Number(right.resolved) ||
					severityRank[left.severity] - severityRank[right.severity],
			);
	}, [dashboard]);

	const patientClinicalRuleEvaluations = useMemo(() => {
		if (!dashboard || !documentPatient) return [];
		const severityRank = { blocker: 0, warning: 1, info: 2 } as const;
		return (dashboard.clinicalRuleEvaluations || [])
			.filter((evaluation) => evaluation.patientId === documentPatient.id)
			.sort(
				(left, right) =>
					Number(left.resolved) - Number(right.resolved) ||
					severityRank[left.severity] - severityRank[right.severity],
			);
	}, [dashboard, documentPatient?.id, documentPatient]);

	const _activeVisitClinicalRuleSummary = useMemo(
		() =>
			clinicalRuleSummaryForUi(
				activeVisitClinicalRuleEvaluations,
				dashboard?.clinicalRuleSummary?.activeRules ?? 0,
			),
		[
			activeVisitClinicalRuleEvaluations,
			dashboard?.clinicalRuleSummary?.activeRules,
		],
	);

	const _patientClinicalRuleSummary = useMemo(
		() =>
			clinicalRuleSummaryForUi(
				patientClinicalRuleEvaluations,
				dashboard?.clinicalRuleSummary?.activeRules ?? 0,
			),
		[
			patientClinicalRuleEvaluations,
			dashboard?.clinicalRuleSummary?.activeRules,
		],
	);

	function treatmentAcceptancePlannedTotalRub(): number {
		return (
			activeTreatmentPlanItems
				.filter((item) => item.status !== "cancelled")
				.filter(
					(item) =>
						!dashboard?.activeVisit?.id ||
						item.visitId === dashboard?.activeVisit?.id,
				)
				.reduce(
					(total, item) =>
						total +
						Math.max(0, item.unitPriceRub * item.quantity - item.discountRub),
					0,
				) || 0
		);
	}

	function treatmentPlanClinicalReasonValue(): string {
		return (
			documentState.treatmentPlanClinicalReason.trim() ||
			dashboard?.activeVisit?.complaint?.trim() ||
			"плановое стоматологическое лечение по результатам осмотра"
		);
	}

	function treatmentPlanDiagnosisSummaryValue(): string {
		return (
			documentState.treatmentPlanDiagnosisSummary.trim() ||
			dashboard?.activeVisit?.diagnosis?.trim() ||
			dashboard?.activeVisit?.complaint?.trim() ||
			""
		);
	}

	function treatmentPlanTeethOrAreaValue(): string {
		return (
			documentState.treatmentPlanTeethOrArea.trim() ||
			inferredTreatmentArea ||
			""
		);
	}

	function clinicalToothRowsValue(): ClinicalToothRow[] {
		const fallbackArea =
			documentState.procedureConsentToothOrArea.trim() ||
			treatmentPlanTeethOrAreaValue() ||
			documentState.treatmentAcceptanceTeethOrArea.trim() ||
			inferredTreatmentArea ||
			"область лечения";
		const fallbackFinding =
			documentState.procedureConsentDiagnosisOrIndication.trim() ||
			treatmentPlanDiagnosisSummaryValue() ||
			documentState.treatmentAcceptanceDiagnosisSummary.trim() ||
			recordExtractDiagnosisValue() ||
			"клиническая находка требует уточнения врачом";
		const fallbackIndication =
			treatmentPlanClinicalReasonValue() ||
			recordExtractComplaintAndAnamnesisValue() ||
			"медицинское показание к лечению";
		const fallbackAction =
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			documentState.procedureConsentProcedureName.trim() ||
			documentState.treatmentAcceptanceClinicalGoal.trim() ||
			"согласованное стоматологическое лечение";

		return documentTextLines(documentState.clinicalToothRowsText).map(
			(line, index) => {
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
			},
		);
	}

	const {
		activePaidPaymentsForVisit,
		manualRubAmount,
		_paidContractTotalRubValue,
		completedActPaidRubValue,
		_completedActFiscalReceiptLines,
		plannedServiceLinesForFinancialPayload,
		_treatmentEstimatePatientOrPayerFullNameValue,
		_treatmentEstimateTreatmentBasisValue,
		paymentInvoiceTotalRubValue,
		_treatmentEstimateTotalRubValue,
		firstPaymentReceiptPayment,
		_paymentReceiptPayerFullNameValue,
		_paymentReceiptPayerBirthDateValue,
		_paymentReceiptPayerInnValue,
		_paymentReceiptPayerIdentityDocumentValue,
		_paymentReceiptPayerRelationshipValue,
		_paymentReceiptIssuedByValue,
		_paymentReceiptFiscalReceiptLines,
		installmentScheduleTotalRubValue,
		installmentSchedulePrepaidRubValue,
		installmentScheduleRemainingRubValue,
		_installmentScheduleInstallmentRows,
		_installmentScheduleBaseDocumentTitleValue,
	} = createDocumentFinancialCalculations({
		activeTreatmentPlanItems,
		dashboard,
		activePayments,
		documentState,
		documentPatient,
		activeDoctor,
		selectedPaymentReceiptPayments,
		activeUsableDocuments,
		treatmentAcceptancePlannedTotalRub,
	});

	function _minorRepresentativeFullNameValue(): string {
		return (
			documentState.minorRepresentativeFullName.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativeFullName?.trim() ||
			""
		);
	}

	function _minorRepresentativeRelationshipValue(): string {
		return (
			documentState.minorRepresentativeRelationship.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativeRelationship?.trim() ||
			""
		);
	}

	function _minorRepresentativeIdentityDocumentValue(): string {
		return (
			documentState.minorRepresentativeIdentityDocument.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativeIdentityDocument?.trim() ||
			""
		);
	}

	function _minorRepresentativePhoneValue(): string {
		return (
			documentState.minorRepresentativePhone.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativePhone?.trim() ||
			""
		);
	}

	function _minorConsentPatientFullNameValue(): string {
		return (
			documentState.minorConsentPatientFullName.trim() ||
			documentPatient?.fullName ||
			""
		);
	}

	function _minorConsentPatientBirthDateValue(): string {
		return (
			documentState.minorConsentPatientBirthDate.trim() ||
			documentPatient?.birthDate ||
			""
		);
	}

	function _minorConsentInterventionScopeValue(): string {
		return (
			documentState.minorConsentInterventionScope.trim() ||
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			"стоматологическое вмешательство по согласованному плану"
		);
	}

	function _minorConsentDiagnosisOrIndicationValue(): string {
		return (
			documentState.minorConsentDiagnosisOrIndication.trim() ||
			dashboard?.activeVisit?.diagnosis?.trim() ||
			dashboard?.activeVisit?.complaint?.trim() ||
			""
		);
	}

	function _warrantyServiceOrWorkNameValue(): string {
		return (
			documentState.warrantyServiceOrWorkName.trim() ||
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			dashboard?.activeVisit?.doctorSummary?.trim() ||
			""
		);
	}

	function _warrantyTeethOrAreaValue(): string {
		return (
			documentState.warrantyTeethOrArea.trim() ||
			inferredTreatmentArea ||
			"область лечения по визиту"
		);
	}

	function _warrantyLinkedActOrContractValue(): string {
		return (
			documentState.warrantyLinkedActOrContract.trim() ||
			activeUsableDocuments?.find(
				(document) =>
					document.kind === "completed_works_act" ||
					document.kind === "paid_medical_services_contract",
			)?.title ||
			"акт выполненных работ или договор клиники"
		);
	}

	function applyPostVisitCarePreset(
		topic: PostVisitCareTopic,
		options: { force?: boolean } = {},
	) {
		const topicLabel =
			postVisitCareTopicOptions?.find((option) => option.value === topic)
				?.label ?? "выбранной темы";
		if (documentState.postVisitManualEdited && !options.force) {
			documentState.setPostVisitPresetFeedback(
				`Тема "${topicLabel}" выбрана. Текст не перезаписан, потому что есть ручные правки. Нажмите "Подставить памятку для темы", если нужно заменить поля.`,
			);
			return;
		}
		const preset = postVisitCarePresets[topic];
		documentState.setPostVisitProcedureName(preset.procedureName);
		documentState.setPostVisitAllowedAfter(preset.allowedAfter);
		documentState.setPostVisitRestrictions(preset.temporaryRestrictions);
		documentState.setPostVisitMedicationAndRinsePlan(
			preset.medicationAndRinsePlan,
		);
		documentState.setPostVisitHygieneInstructions(preset.hygieneInstructions);
		documentState.setPostVisitNutritionInstructions(
			preset.nutritionInstructions,
		);
		documentState.setPostVisitUrgentWarningSigns(preset.urgentWarningSigns);
		documentState.setPostVisitFollowUpAt(preset.plannedFollowUpAt);
		documentState.setPostVisitTelegramSummary(preset.telegramSummary);
		documentState.setPostVisitPrintedCopyReceived(false);
		documentState.setPostVisitUrgentSignsUnderstood(false);
		documentState.setPostVisitTelegramSafe(false);
		documentState.setPostVisitManualEdited(false);
		documentState.setPostVisitPresetFeedback(
			options.force
				? `Памятка для темы "${topicLabel}" подставлена, ручные правки сброшены.`
				: "",
		);
	}

	function changePostVisitCareTopic(topic: PostVisitCareTopic) {
		documentState.setPostVisitCareTopic(topic);
		applyPostVisitCarePreset(topic);
	}

	function _markPostVisitManualEdited() {
		documentState.setPostVisitManualEdited(true);
		documentState.setPostVisitPresetFeedback("");
	}

	function recordExtractComplaintAndAnamnesisValue(): string {
		return (
			documentState.recordExtractComplaintAndAnamnesis.trim() ||
			compactDocumentText(
				dashboard?.activeVisit?.complaint,
				dashboard?.activeVisit?.anamnesis,
			)
		);
	}

	function recordExtractObjectiveStatusValue(): string {
		return (
			documentState.recordExtractObjectiveStatus.trim() ||
			dashboard?.activeVisit?.objectiveStatus?.trim() ||
			""
		);
	}

	function recordExtractDiagnosisValue(): string {
		return (
			documentState.recordExtractDiagnosis.trim() ||
			dashboard?.activeVisit?.diagnosis?.trim() ||
			""
		);
	}

	function recordExtractTreatmentProvidedValue(): string {
		return (
			documentState.recordExtractTreatmentProvided.trim() ||
			compactDocumentText(
				dashboard?.activeVisit?.doctorSummary,
				dashboard?.activeVisit?.treatmentPlan,
			)
		);
	}

	function dentalMedicalCardDoctorValue(): {
		fullName: string;
		position: string;
		specialty: string;
	} {
		return {
			fullName:
				documentState.recordExtractDoctorFullName.trim() ||
				activeDoctor?.fullName ||
				"",
			position: "врач-стоматолог",
			specialty: activeDoctor?.specialties?.[0] ?? "стоматология",
		};
	}

	function dentalMedicalCardVisitDateValue(): string {
		return (
			documentState.recordExtractPeriodEnd.trim() ||
			toDateInputValue(activeAppointment?.startsAt) ||
			new Date().toISOString().slice(0, 10)
		);
	}

	function openCommunicationTaskDocumentWorkflow(
		task: Dashboard["communicationTasks"][number],
		kind: GeneratedDocument["kind"],
	) {
		const careTopic =
			(task.workflowCode
				? telegramCareRequestWorkflowCareTopics[task.workflowCode]
				: null) ??
			telegramCareRequestTaskCareTopics[task.title] ??
			null;
		documentState.setSelectedDocumentKind(kind);
		if (kind === "post_visit_recommendations" && careTopic) {
			changePostVisitCareTopic(careTopic);
		}
		setCurrentView("documents");
		if (typeof window !== "undefined") {
			window.location.hash = "documents";
		}
		if (dashboard && task.patientId !== dashboard?.activeVisit?.patientId) {
			const taskPatientName = patientName(dashboard.patients, task.patientId);
			setError(
				`Открыта форма «${documentLabels[kind]}» для заявки пациента ${taskPatientName}. Перед выпуском документа переключите активный прием на этого пациента, чтобы не создать документ по текущему визиту.`,
			);
		}
	}

	function documentKindsForCommunicationTask(
		task: Dashboard["communicationTasks"][number],
	): readonly GeneratedDocument["kind"][] {
		const documentKinds =
			(task.workflowCode
				? telegramDocumentRequestWorkflowDocumentKinds[task.workflowCode]
				: null) ??
			telegramDocumentRequestTaskDocumentKinds[task.title] ??
			null;
		if (documentKinds) {
			return documentKinds;
		}
		const careTopic =
			(task.workflowCode
				? telegramCareRequestWorkflowCareTopics[task.workflowCode]
				: null) ??
			telegramCareRequestTaskCareTopics[task.title] ??
			null;
		if (careTopic) {
			return ["post_visit_recommendations"];
		}
		return [];
	}

	function dentalMedicalCard043uPayloadValue(): DentalMedicalCard043uPayload {
		const doctor = dentalMedicalCardDoctorValue();
		const visitDate = dentalMedicalCardVisitDateValue();
		const patientProfile = documentPatient?.administrativeProfile;
		const complaintsAndAnamnesis = recordExtractComplaintAndAnamnesisValue();
		const complaintText =
			visitNoteForm.complaint.trim() ||
			complaintsAndAnamnesis.split(/\n{2,}/)[0]?.trim() ||
			"";
		const anamnesisText =
			visitNoteForm.anamnesis.trim() || complaintsAndAnamnesis || "";
		const objectiveText =
			visitNoteForm.objectiveStatus.trim() ||
			recordExtractObjectiveStatusValue() ||
			"";
		const diagnosisText =
			visitNoteForm.diagnosis.trim() || recordExtractDiagnosisValue() || "";
		const treatmentText =
			visitNoteForm.treatmentPlan.trim() ||
			recordExtractTreatmentProvidedValue() ||
			"";
		const sexRaw = (
			(documentPatient as any)?.gender ??
			(documentPatient?.administrativeProfile as any)?.gender ??
			(patientProfile as { sex?: string } | null | undefined)?.sex ??
			""
		)
			.toString()
			.toLowerCase();
		const sex =
			sexRaw === "female" ||
			sexRaw === "f" ||
			sexRaw === "жен" ||
			sexRaw === "женский"
				? "женский"
				: sexRaw === "male" ||
						sexRaw === "m" ||
						sexRaw === "муж" ||
						sexRaw === "мужской"
					? "мужской"
					: null;
		const birthDate = toDateInputValue(documentPatient?.birthDate) || null;
		const orgFullName =
			clinicProfileDraft?.legalName?.trim() ||
			clinicProfileDraft?.clinicName?.trim() ||
			"Стоматологическая клиника";
		const identityDocument = patientProfile?.identityDocument?.trim() || null;

		return {
			formNumber: "043/у",
			organization: {
				fullName: orgFullName,
				shortName: clinicProfileDraft?.clinicName?.trim() || null,
				address: clinicProfileDraft?.address?.trim() || null,
				phone: clinicProfileDraft?.phone?.trim() || null,
				ogrn: clinicProfileDraft?.ogrn?.trim() || null,
				inn: clinicProfileDraft?.inn?.trim() || null,
				licenseNumber: clinicProfileDraft?.medicalLicenseNumber?.trim() || null,
				licenseIssueDate:
					clinicProfileDraft?.medicalLicenseIssuedAt?.trim() || null,
				licenseAuthority:
					clinicProfileDraft?.medicalLicenseIssuer?.trim() || null,
			},
			patient: {
				fullName: documentPatient?.fullName?.trim() || "—",
				birthDate,
				sex,
				phone: documentPatient?.phone?.trim() || null,
				address:
					patientProfile?.registrationAddress?.trim() ||
					patientProfile?.residentialAddress?.trim() ||
					null,
				documentSeriesNumber: identityDocument,
				snils: patientProfile?.snils?.trim() || null,
				medicalCardNumber:
					(documentPatient as { medicalCardNumber?: string; cardNumber?: string } | null | undefined)?.medicalCardNumber?.trim() ||
					(documentPatient as { medicalCardNumber?: string; cardNumber?: string } | null | undefined)?.cardNumber?.trim() ||
					`043/у-${new Date().getFullYear()}-${documentPatient?.id?.slice(0, 8).toUpperCase() ?? "PATIENT"}`,
			},
			doctor: {
				fullName: doctor.fullName || activeDoctor?.fullName || "—",
				position: doctor.position || null,
				specialty: doctor.specialty || null,
			},
			visitDate,
			visitId: null,
			diaryId: null,
			complaint: complaintText || null,
			anamnesis: anamnesisText || null,
			structuredAnamnesis: null,
			statusLocalis: null,
			objectiveStatus: objectiveText || null,
			diagnosisIcd10: null,
			diagnosisTooth: null,
			diagnosisText: diagnosisText || null,
			treatmentDescription: treatmentText || null,
			treatmentPlan: treatmentText || null,
			complications: null,
			comorbidities: null,
			instrumentTrayBarcode: null,
			clinicalToothRows: clinicalToothRowsValue(),
			recommendations: null,
			nextVisitPlan: null,
			content: null,
			lockedAt: null,
			contentHash: null,
		};
	}

	function togglePhotoVideoMaterial(material: PhotoVideoConsentMaterial) {
		documentState.setPhotoVideoMaterials((current: PhotoVideoConsentMaterial[]) =>
			current.includes(material)
				? current.filter((item) => item !== material)
				: [...current, material],
		);
	}

	return {
		inferredTreatmentArea,
		_activeTreatmentPlanScenarios,
		activeVisitClinicalRuleEvaluations,
		patientClinicalRuleEvaluations,
		_activeVisitClinicalRuleSummary,
		_patientClinicalRuleSummary,
		treatmentAcceptancePlannedTotalRub,
		treatmentPlanClinicalReasonValue,
		treatmentPlanDiagnosisSummaryValue,
		treatmentPlanTeethOrAreaValue,
		clinicalToothRowsValue,
		activePaidPaymentsForVisit,
		manualRubAmount,
		_paidContractTotalRubValue,
		completedActPaidRubValue,
		_completedActFiscalReceiptLines,
		plannedServiceLinesForFinancialPayload,
		_treatmentEstimatePatientOrPayerFullNameValue,
		_treatmentEstimateTreatmentBasisValue,
		_treatmentEstimateTotalRubValue,
		paymentInvoiceTotalRubValue,
		firstPaymentReceiptPayment,
		_paymentReceiptPayerFullNameValue,
		_paymentReceiptPayerBirthDateValue,
		_paymentReceiptPayerInnValue,
		_paymentReceiptPayerIdentityDocumentValue,
		_paymentReceiptPayerRelationshipValue,
		_paymentReceiptIssuedByValue,
		_paymentReceiptFiscalReceiptLines,
		installmentScheduleTotalRubValue,
		installmentSchedulePrepaidRubValue,
		installmentScheduleRemainingRubValue,
		_installmentScheduleInstallmentRows,
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
		applyPostVisitCarePreset,
		changePostVisitCareTopic,
		_markPostVisitManualEdited,
		recordExtractComplaintAndAnamnesisValue,
		recordExtractObjectiveStatusValue,
		recordExtractDiagnosisValue,
		recordExtractTreatmentProvidedValue,
		dentalMedicalCardDoctorValue,
		dentalMedicalCardVisitDateValue,
		openCommunicationTaskDocumentWorkflow,
		documentKindsForCommunicationTask,
		dentalMedicalCard043uPayloadValue,
		togglePhotoVideoMaterial,
	};
}
