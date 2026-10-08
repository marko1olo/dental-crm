import { createSetter } from "../createSetter";
import { currentLocalDateTimeInputValue } from "../../../utils/dateUtils";
import { loadUiPreferences } from "../../../utils/preferencesUtils";
import {
	DOCUMENT_PACKAGES,
	buildDocumentPackageStatePatch,
	type DocumentPackageId,
	type DocumentPackagePresetOptions,
} from "../../../utils/documentPackages";
import type { DocumentSliceState } from "../types/coreTypes";

const initialUiPreferences = loadUiPreferences();

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export const createDocumentSlice = (set: any): DocumentSliceState => ({
	documentCreateSavingKind: null,
	setDocumentCreateSavingKind: createSetter(set, "documentCreateSavingKind"),
	documentStatusSavingId: null,
	setDocumentStatusSavingId: createSetter(set, "documentStatusSavingId"),
	selectedTaxPaymentIds: [],
	setSelectedTaxPaymentIds: createSetter(set, "selectedTaxPaymentIds"),
	selectedPaymentReceiptIds: [],
	setSelectedPaymentReceiptIds: createSetter(set, "selectedPaymentReceiptIds"),
	documentIssueConfirmationId: null,
	setDocumentIssueConfirmationId: createSetter(
		set,
		"documentIssueConfirmationId",
	),
	documentIssueSignatureMode: initialUiPreferences.documentIssueSignatureMode,
	setDocumentIssueSignatureMode: createSetter(
		set,
		"documentIssueSignatureMode",
	),
	// БЫЛО: пропущены скобки — в состояние клалась сама ФУНКЦИЯ, а не строка.
	// При нажатии «Выдать документ» код делал documentIssueSignedAt.trim() и падал
	// с TypeError прямо в фазе рендера: приложение уходило в белый экран.
	// Чек-лист готовности при этом ничего не подсвечивал, потому что
	// String(функция) — непустая строка.
	documentIssueSignedAt: currentLocalDateTimeInputValue(),
	setDocumentIssueSignedAt: createSetter(set, "documentIssueSignedAt"),
	documentIssueRecipientFullName: "",
	setDocumentIssueRecipientFullName: createSetter(
		set,
		"documentIssueRecipientFullName",
	),
	documentIssueRecipientRole: "пациент/законный представитель",
	setDocumentIssueRecipientRole: createSetter(
		set,
		"documentIssueRecipientRole",
	),
	documentIssueStaffFullName:
		initialUiPreferences.documentIssueStaffFullName || "",
	setDocumentIssueStaffFullName: createSetter(
		set,
		"documentIssueStaffFullName",
	),
	documentIssueStaffRole: initialUiPreferences.documentIssueStaffRole || "",
	setDocumentIssueStaffRole: createSetter(set, "documentIssueStaffRole"),
	documentIssueNote: "",
	setDocumentIssueNote: createSetter(set, "documentIssueNote"),
	documentIssueIdentityChecked: false,
	setDocumentIssueIdentityChecked: createSetter(
		set,
		"documentIssueIdentityChecked",
	),
	documentIssueDocumentOpenedAndChecked: false,
	setDocumentIssueDocumentOpenedAndChecked: createSetter(
		set,
		"documentIssueDocumentOpenedAndChecked",
	),
	documentIssueRecipientSigned: false,
	setDocumentIssueRecipientSigned: createSetter(
		set,
		"documentIssueRecipientSigned",
	),
	documentIssueClinicSigned: false,
	setDocumentIssueClinicSigned: createSetter(set, "documentIssueClinicSigned"),
	documentVoidConfirmationId: null,
	setDocumentVoidConfirmationId: createSetter(
		set,
		"documentVoidConfirmationId",
	),
	documentVoidReasonCode: "draft_error",
	setDocumentVoidReasonCode: createSetter(set, "documentVoidReasonCode"),
	documentVoidReasonText: "",
	setDocumentVoidReasonText: createSetter(set, "documentVoidReasonText"),
	documentVoidStaffFullName:
		initialUiPreferences.documentIssueStaffFullName || "",
	setDocumentVoidStaffFullName: createSetter(set, "documentVoidStaffFullName"),
	documentVoidStaffRole: initialUiPreferences.documentIssueStaffRole || "",
	setDocumentVoidStaffRole: createSetter(set, "documentVoidStaffRole"),
	documentVoidCorrectionDocumentId: "",
	setDocumentVoidCorrectionDocumentId: createSetter(
		set,
		"documentVoidCorrectionDocumentId",
	),
	documentVoidReplacementRequired: false,
	setDocumentVoidReplacementRequired: createSetter(
		set,
		"documentVoidReplacementRequired",
	),
	documentVoidPatientOrPayerNotified: false,
	setDocumentVoidPatientOrPayerNotified: createSetter(
		set,
		"documentVoidPatientOrPayerNotified",
	),
	documentVoidArchivePreserved: false,
	setDocumentVoidArchivePreserved: createSetter(
		set,
		"documentVoidArchivePreserved",
	),
	documentVoidStatusReviewed: false,
	setDocumentVoidStatusReviewed: createSetter(
		set,
		"documentVoidStatusReviewed",
	),
	documentAuditFacts: null,
	selectedDocumentKind: "treatment_plan",
	setSelectedDocumentKind: (val) =>
		set((state: any) => ({
			selectedDocumentKind:
				typeof val === "function" ? val(state.selectedDocumentKind) : val,
		})),
	isDocumentIngesting: false,
	setIsDocumentIngesting: (val) =>
		set((state: any) => ({
			isDocumentIngesting:
				typeof val === "function" ? val(state.isDocumentIngesting) : val,
		})),
	setDocumentAuditFacts: createSetter(set, "documentAuditFacts"),
	documentAuditFactsLoadingId: null,
	setDocumentAuditFactsLoadingId: createSetter(
		set,
		"documentAuditFactsLoadingId",
	),
	documentIngestionTarget: initialUiPreferences.documentIngestionTarget,
	setDocumentIngestionTarget: createSetter(set, "documentIngestionTarget"),
	documentIngestion: null,
	setDocumentIngestion: createSetter(set, "documentIngestion"),
	activeDocumentPackage: null as DocumentPackageId | null,
	setActiveDocumentPackage: createSetter(set, "activeDocumentPackage"),
	applyDocumentPackage: (
		packageId: DocumentPackageId,
		options?: DocumentPackagePresetOptions,
	) => {
		const patch = buildDocumentPackageStatePatch(packageId, options);
		set({
			activeDocumentPackage: packageId,
			...patch,
		});
	},
	documentPackages: DOCUMENT_PACKAGES,
});
