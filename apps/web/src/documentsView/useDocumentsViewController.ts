/**
 * ═══════════════════════════════════════════════════════════════════════════
 * USE DOCUMENTS VIEW CONTROLLER (apps/web/src/documentsView/useDocumentsViewController.ts)
 * Architecture: State Orchestration & Derived Selectors for DocumentsView
 * Compliance: Mandates 8b, 8e, 8k, 8n | <= 500 lines
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useMemo, useState } from "react";
import {
	type DocumentKind,
	type DocumentKindMetadata,
	type DocumentSourceStatus,
	type GeneratedDocument,
	documentKindMetadata as sharedDocumentKindMetadata,
	documentSourceStatusLabels as sharedDocumentSourceStatusLabels,
} from "@dental/shared";
import {
	formatShortDate,
	money,
	normalizedDocumentIssueSignatureMode,
	normalizedDocumentKind,
	normalizedDocumentVoidReasonCode,
} from "../AppHelpers";
import { DOCUMENT_CATEGORY_KINDS, type DocumentCategoryTab } from "../components/documents/DocumentNavTabs";
import type { DocumentEdsFilter, DocumentStatusFilter } from "../components/documents/DocumentRegistryFilterBar";
import { executeDocumentVoidAutonomy, executeOpenLatestDocumentAutonomy } from "../components/documents/documentAutonomy";
import { DocumentTemplatesCatalog } from "../components/documents/tabs/DocumentTemplatesCatalog";
import { useAppLogicContext } from "../contexts/AppLogicContext";
import { useDocumentStore } from "../store/documentStore";
import type { DocumentsViewProps } from "./types";

export const _catalogComponentReference = DocumentTemplatesCatalog;

export function useDocumentsViewController(rawProps?: Partial<DocumentsViewProps>) {
	const logicContext = useAppLogicContext();
	const props = { ...logicContext, ...rawProps } as ReturnType<typeof useAppLogicContext> & DocumentsViewProps;

	const documentKindMetadata = sharedDocumentKindMetadata as Record<DocumentKind, DocumentKindMetadata>;
	const documentSourceStatusLabels = sharedDocumentSourceStatusLabels as Record<DocumentSourceStatus, string>;

	const {
		activeDoctor, activeDocuments, activePatient, activeUsableDocuments, clinicProfileDraft,
		confirmDocumentIssue, confirmDocumentVoid: rawConfirmDocumentVoid, createDocument, dashboard,
		documentActionLabels, documentIssueAttestationReady, documentIssueConfirmation,
		documentIssueSignatureModeLabels, documentLabels, documentSourceStatusClassNames,
		documentStatusLabels, documentVoidConfirmation, documentVoidReady, documentVoidReasonLabels,
		downloadIssuedDocumentHtml, downloadIssuedDocumentPdf, downloadTaxDocumentXml,
		loadDocumentAuditFacts, openIssuedDocumentHtml, patientName, requestDocumentIssue,
		requestDocumentVoid, selectedEligibleTaxPayments, taxDocumentPayerOptions, updateDocumentStatus,
	} = props;

	// Store Block 1: Main document store bindings
	const {
		documentAuditFacts,
		documentAuditFactsLoadingId,
		documentIssueClinicSigned,
		documentIssueDocumentOpenedAndChecked,
		documentIssueIdentityChecked,
		documentIssueNote,
		documentIssueRecipientFullName,
		documentIssueRecipientRole,
		documentIssueRecipientSigned,
		documentIssueSignatureMode,
		documentIssueSignedAt,
		documentIssueStaffFullName,
		documentIssueStaffRole,
		documentVoidArchivePreserved,
		documentVoidCorrectionDocumentId,
		documentVoidPatientOrPayerNotified,
		documentVoidReasonCode,
		documentVoidReasonText,
		documentVoidReplacementRequired,
		documentVoidStaffFullName,
		documentVoidStaffRole,
		documentVoidStatusReviewed,
		selectedDocumentKind,
		setDocumentAuditFacts,
		setDocumentIssueClinicSigned,
		setDocumentIssueConfirmationId,
		setDocumentIssueDocumentOpenedAndChecked,
		setDocumentIssueIdentityChecked,
		setDocumentIssueNote,
		setDocumentIssueRecipientFullName,
		setDocumentIssueRecipientRole,
		setDocumentIssueRecipientSigned,
		setDocumentIssueSignatureMode,
		setDocumentIssueSignedAt,
		setDocumentIssueStaffFullName,
		setDocumentIssueStaffRole,
		setDocumentVoidArchivePreserved,
		setDocumentVoidConfirmationId,
		setDocumentVoidCorrectionDocumentId,
		setDocumentVoidPatientOrPayerNotified,
		setDocumentVoidReasonCode,
		setDocumentVoidReasonText,
		setDocumentVoidReplacementRequired,
		setDocumentVoidStaffFullName,
		setDocumentVoidStaffRole,
		setDocumentVoidStatusReviewed,
		setSelectedDocumentKind,
		taxDocumentYear,
		setTaxDocumentYear,
	} = useDocumentStore();

	// Store Block 2: Secondary document store bindings
	const {
		documentCreateSavingKind,
		documentStatusSavingId,
		setTaxDocumentPayerInn,
	} = useDocumentStore();

	const [activeCategoryTab, setActiveCategoryTab] = useState<DocumentCategoryTab>("all");
	const [registrySearchQuery, setRegistrySearchQuery] = useState("");
	const [registryStatusFilter, setRegistryStatusFilter] = useState<DocumentStatusFilter>("all");
	const [registryEdsFilter, setRegistryEdsFilter] = useState<DocumentEdsFilter>("all");
	const [registryKindFilter, setRegistryKindFilter] = useState<"all" | DocumentKind>("all");
	const [displayLimit, setDisplayLimit] = useState(40);
	const [openDocActionMenuId, setOpenDocActionMenuId] = useState<string | null>(null);
	const [isEditingInFocus, setIsEditingInFocus] = useState<boolean>(false);

	// Package modal states
	const [isPrimaryIntakeOpen, setIsPrimaryIntakeOpen] = useState(false);
	const [isSurgicalPackageOpen, setIsSurgicalPackageOpen] = useState(false);
	const [isClinicalVisitOpen, setIsClinicalVisitOpen] = useState(false);
	const [isTaxAccountingOpen, setIsTaxAccountingOpen] = useState(false);
	const [isSanpinRegistryOpen, setIsSanpinRegistryOpen] = useState(false);
	const [isAutoclaveLogOpen, setIsAutoclaveLogOpen] = useState(false);
	const [isFnsNdflXmlOpen, setIsFnsNdflXmlOpen] = useState(false);
	const [isEgiszRemdOpen, setIsEgiszRemdOpen] = useState(false);
	const [isSickLeaveElnOpen, setIsSickLeaveElnOpen] = useState(false);
	const [isA4PrintPreviewOpen, setIsA4PrintPreviewOpen] = useState(false);
	const [isPatientConsentSignDrawerOpen, setIsPatientConsentSignDrawerOpen] = useState(false);

	const selectedDocumentCreateGuidanceId = "document-create-selected-guidance";
	const latestDocumentOpenGuidanceId = "document-open-latest-guidance";
	const documentIssueMissingGuidanceId = "document-issue-missing-guidance";
	const documentVoidMissingGuidanceId = "document-void-missing-guidance";

	useEffect(() => {
		if ((selectedDocumentKind as string) === "outpatient_medical_card_025u") {
			setSelectedDocumentKind("dental_medical_card_043u");
		}
	}, [selectedDocumentKind, setSelectedDocumentKind]);

	const typedActiveDocuments = useMemo(
		() =>
			((activeDocuments && activeDocuments.length > 0
				? activeDocuments
				: !activePatient
					? dashboard?.documents
					: []) ?? []) as GeneratedDocument[],
		[activeDocuments, activePatient, dashboard?.documents],
	);

	const typedTaxDocumentPayerOptions = useMemo(
		() => (taxDocumentPayerOptions ?? []) as Array<{ key: string; inn: string; label: string; amountRub: number; paymentCount: number }>,
		[taxDocumentPayerOptions],
	);

	const intakeKinds = DOCUMENT_CATEGORY_KINDS.intake;
	const clinicalKinds = DOCUMENT_CATEGORY_KINDS.clinical;
	const financeTaxKinds = DOCUMENT_CATEGORY_KINDS.finance_tax;
	const certificatesSanpinKinds = DOCUMENT_CATEGORY_KINDS.certificates_sanpin;

	const sanitizedDocumentFactoryGroups = useMemo(() => {
		const groups = (props.documentFactoryGroups ?? []) as Array<{ title: string; kinds: DocumentKind[] }>;
		return groups.map((group) => ({
			...group,
			kinds: (group.kinds ?? []).filter((kind) => (kind as string) !== "outpatient_medical_card_025u"),
		}));
	}, [props.documentFactoryGroups]);

	const isSelectedDocumentCreating = documentCreateSavingKind === selectedDocumentKind;

	const patientIssuedDocsCount = useMemo(
		() => typedActiveDocuments.filter((doc) => doc.status === "issued" && doc.patientId === activePatient?.id).length,
		[typedActiveDocuments, activePatient?.id],
	);

	const patientDraftDocsCount = useMemo(
		() => typedActiveDocuments.filter((doc) => doc.status === "draft" && doc.patientId === activePatient?.id).length,
		[typedActiveDocuments, activePatient?.id],
	);

	const handleOpenLatestDocument = () => {
		executeOpenLatestDocumentAutonomy({
			activeUsableDocuments: activeUsableDocuments as Array<{ id: string; status?: string }>,
			typedActiveDocuments,
			openIssuedDocumentHtml,
		});
	};

	const handleDirectPrintPrimaryIntake = () => {
		if (typeof props.handleDirectPrintPrimaryIntake === "function") {
			props.handleDirectPrintPrimaryIntake();
		}
	};

	async function handleConfirmDocumentVoid() {
		await executeDocumentVoidAutonomy({
			activeDoctor, documentVoidStaffFullName, setDocumentVoidStaffFullName,
			documentVoidStaffRole, setDocumentVoidStaffRole, setDocumentVoidArchivePreserved,
			setDocumentVoidStatusReviewed, documentVoidReasonText, setDocumentVoidReasonText,
			documentVoidReady, rawConfirmDocumentVoid, updateDocumentStatus, documentVoidConfirmation,
			documentVoidReasonCode, documentVoidCorrectionDocumentId, documentVoidReplacementRequired,
			documentVoidPatientOrPayerNotified, setDocumentVoidConfirmationId, setError: props.setError,
		});
	}

	const filteredActiveDocuments = useMemo(() => {
		let list = typedActiveDocuments;
		if (activeCategoryTab === "intake") list = list.filter((doc) => intakeKinds.has(doc.kind));
		else if (activeCategoryTab === "clinical") list = list.filter((doc) => clinicalKinds.has(doc.kind));
		else if (activeCategoryTab === "finance_tax") list = list.filter((doc) => financeTaxKinds.has(doc.kind));
		else if (activeCategoryTab === "certificates_sanpin") list = list.filter((doc) => certificatesSanpinKinds.has(doc.kind));

		if (registrySearchQuery.trim()) {
			const query = registrySearchQuery.toLowerCase().trim();
			list = list.filter(
				(doc) =>
					doc.title?.toLowerCase().includes(query) ||
					doc.kind?.toLowerCase().includes(query) ||
					(documentLabels?.[doc.kind] ?? "").toLowerCase().includes(query),
			);
		}
		if (registryStatusFilter !== "all") list = list.filter((doc) => doc.status === registryStatusFilter);
		if (registryEdsFilter !== "all") {
			list = list.filter((doc) => {
				// biome-ignore lint/suspicious/noExplicitAny: dynamic signedAt fallback
				const isSignedEds = Boolean(doc.doctorSignedAt || (doc as any).signedAt);
				const isSignedPaper = Boolean(doc.signatureAttestation && !isSignedEds);
				if (registryEdsFilter === "signed_eds") return isSignedEds;
				if (registryEdsFilter === "signed_paper") return isSignedPaper;
				if (registryEdsFilter === "unsigned") return !isSignedEds && !isSignedPaper;
				return true;
			});
		}
		if (registryKindFilter !== "all") list = list.filter((doc) => doc.kind === registryKindFilter);
		return list;
	}, [
		typedActiveDocuments, activeCategoryTab, intakeKinds, clinicalKinds,
		financeTaxKinds, certificatesSanpinKinds, registrySearchQuery,
		registryStatusFilter, registryEdsFilter, registryKindFilter, documentLabels,
	]);

	const availableRegistryKinds = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const doc of typedActiveDocuments) counts[doc.kind] = (counts[doc.kind] ?? 0) + 1;
		return (Object.keys(counts) as DocumentKind[]).map((kind) => ({
			key: kind, label: documentLabels?.[kind] ?? kind, count: counts[kind] ?? 0,
		}));
	}, [typedActiveDocuments, documentLabels]);

	const documentsSlice = useMemo(() => {
		const visible = filteredActiveDocuments.slice(0, displayLimit);
		return {
			visibleItems: visible,
			hasMore: visible.length < filteredActiveDocuments.length,
			remainingCount: Math.max(0, filteredActiveDocuments.length - visible.length),
		};
	}, [filteredActiveDocuments, displayLimit]);

	const navCategoryCounts = useMemo(
		() => ({
			all: typedActiveDocuments.length,
			intake: typedActiveDocuments.filter((d) => intakeKinds.has(d.kind)).length,
			clinical: typedActiveDocuments.filter((d) => clinicalKinds.has(d.kind)).length,
			finance_tax: typedActiveDocuments.filter((d) => financeTaxKinds.has(d.kind)).length,
			certificates_sanpin: typedActiveDocuments.filter((d) => certificatesSanpinKinds.has(d.kind)).length,
		}),
		[typedActiveDocuments, intakeKinds, clinicalKinds, financeTaxKinds, certificatesSanpinKinds],
	);

	const documentIssueMissingSteps = [
		!String(documentIssueSignedAt || "").trim() ? "укажите дату и время подписи" : null,
		!String(documentIssueRecipientFullName || "").trim() ? "укажите получателя" : null,
		!String(documentIssueRecipientRole || "").trim() ? "укажите статус получателя" : null,
	].filter(Boolean) as string[];

	const documentVoidMissingSteps = [
		!documentVoidArchivePreserved ? "подтвердите сохранение архивной копии" : null,
		!documentVoidPatientOrPayerNotified ? "подтвердите уведомление пациента/плательщика" : null,
		!documentVoidStatusReviewed ? "подтвердите проверку последствий аннулирования" : null,
		!String(documentVoidStaffFullName || "").trim() ? "укажите ответственного сотрудника" : null,
		!String(documentVoidStaffRole || "").trim() ? "укажите должность сотрудника" : null,
	].filter(Boolean) as string[];

	const handleSelectCategoryTab = (tab: DocumentCategoryTab) => {
		setActiveCategoryTab(tab);
		if (tab === "intake") setSelectedDocumentKind("paid_medical_services_contract");
		else if (tab === "clinical") setSelectedDocumentKind("dental_medical_card_043u");
		else if (tab === "finance_tax") setSelectedDocumentKind("tax_deduction_certificate");
		else if (tab === "certificates_sanpin") setSelectedDocumentKind("radiation_dose_sheet");
	};

	const safeFormatShortDate = (d: string | null | undefined) => (d ? formatShortDate(d) : "");

	return {
		props, activePatient, activeDoctor, clinicProfileDraft, typedActiveDocuments,
		patientIssuedDocsCount, patientDraftDocsCount, activeCategoryTab, handleSelectCategoryTab,
		navCategoryCounts, isEditingInFocus, setIsEditingInFocus, selectedDocumentKind,
		setSelectedDocumentKind, normalizedDocumentKind, sanitizedDocumentFactoryGroups,
		documentLabels, documentCreateSavingKind, isSelectedDocumentCreating,
		selectedDocumentCreateGuidanceId, createDocument, setIsAutoclaveLogOpen, safeFormatShortDate,
		mobileHubProps: {
			documents: typedActiveDocuments, activePatient, activeDoctor, documentLabels,
			documentStatusLabels, documentKindMetadata, formatShortDate: safeFormatShortDate,
			money, onRequestIssue: requestDocumentIssue, onDownloadPdf: downloadIssuedDocumentPdf,
			onOpenHtml: openIssuedDocumentHtml, onLoadAuditFacts: loadDocumentAuditFacts,
			onDirectPrintPrimaryIntake: handleDirectPrintPrimaryIntake,
			onOpenPrimaryIntakeModal: () => setIsPrimaryIntakeOpen(true),
			onOpenCreateDocumentModal: (kind: DocumentKind) => {
				setSelectedDocumentKind(kind);
				void createDocument(kind);
			},
		},
		legacyHeaderProps: {
			activePatient, activeDoctor, clinicProfileDraft, typedActiveDocuments,
			patientIssuedDocsCount, patientDraftDocsCount, activeUsableDocuments,
			latestDocumentOpenGuidanceId, handleOpenLatestDocument, setIsAutoclaveLogOpen,
			handleDirectPrintPrimaryIntake, setIsPrimaryIntakeOpen, setIsSurgicalPackageOpen,
			setIsClinicalVisitOpen, setIsTaxAccountingOpen, setIsSanpinRegistryOpen,
			setIsA4PrintPreviewOpen, setIsPatientConsentSignDrawerOpen, onSelectDocumentKind: setSelectedDocumentKind,
		},
		focusPreviewProps: {
			isEditingInFocus, onCloseFocus: () => setIsEditingInFocus(false),
			selectedDocumentKind, setSelectedDocumentKind, isCreating: isSelectedDocumentCreating,
			onCreateDocument: (kind: DocumentKind) => void createDocument(kind),
			documentLabels, sanitizedDocumentFactoryGroups, documentCreateSavingKind,
			selectedDocumentCreateGuidanceId, patient: activePatient,
			doctorName: activeDoctor?.fullName,
			clinicName: clinicProfileDraft?.clinicName || clinicProfileDraft?.legalName,
			clinicProfileDraft, formProps: props,
		},
		catalogViewProps: {
			patient: activePatient, patientName, doctorName: activeDoctor?.fullName,
			clinicName: clinicProfileDraft?.clinicName || clinicProfileDraft?.legalName,
			clinicProfileDraft, existingDocuments: typedActiveDocuments,
			eligibleTaxPayments: selectedEligibleTaxPayments,
			onCreateDocument: (kind: DocumentKind) => void createDocument(kind),
			onOpenIssuedDocumentHtml: (id: string) => void openIssuedDocumentHtml(id),
			onOpenDocument: (kind: DocumentKind) => { setSelectedDocumentKind(kind); setIsEditingInFocus(true); },
			onOpenFocusEditor: (kind: DocumentKind) => { setSelectedDocumentKind(kind); setIsEditingInFocus(true); },
			onSelectRegistryTab: () => {
				const regEl = document.getElementById("document-registry-section");
				if (regEl) regEl.scrollIntoView({ behavior: "smooth" });
			},
			onOpenPrimaryIntakePackage: () => setIsPrimaryIntakeOpen(true),
			onOpenAutoclaveLog: () => setIsAutoclaveLogOpen(true),
			className: "my-3",
		},
		recentListProps: {
			activePatient, activeDoctor, typedActiveDocuments, filteredActiveDocuments,
			activeCategoryTab, setActiveCategoryTab, registrySearchQuery, setRegistrySearchQuery,
			registryStatusFilter, setRegistryStatusFilter, registryEdsFilter, setRegistryEdsFilter,
			registryKindFilter, setRegistryKindFilter, availableRegistryKinds, documentsSlice,
			setDisplayLimit, documentActionLabels, documentLabels, documentKindMetadata,
			documentStatusLabels, documentSourceStatusClassNames, documentSourceStatusLabels,
			documentAuditFactsLoadingId, documentStatusSavingId, openDocActionMenuId,
			setOpenDocActionMenuId, requestDocumentIssue, downloadIssuedDocumentPdf,
			openIssuedDocumentHtml, loadDocumentAuditFacts, downloadIssuedDocumentHtml,
			downloadTaxDocumentXml, setIsFnsNdflXmlOpen, setIsEgiszRemdOpen,
			requestDocumentVoid, formatShortDate: safeFormatShortDate, money,
		},
		issueModalProps: {
			documentIssueConfirmation, documentLabels, patientName, patients: dashboard?.patients,
			money, documentIssueSignatureMode, setDocumentIssueSignatureMode,
			normalizedDocumentIssueSignatureMode, documentIssueSignatureModeLabels,
			documentIssueSignedAt, setDocumentIssueSignedAt, documentIssueRecipientFullName,
			setDocumentIssueRecipientFullName, documentIssueRecipientRole, setDocumentIssueRecipientRole,
			documentIssueStaffFullName, setDocumentIssueStaffFullName, documentIssueStaffRole,
			setDocumentIssueStaffRole, documentIssueNote, setDocumentIssueNote, activeDoctor,
			documentIssueIdentityChecked, setDocumentIssueIdentityChecked,
			documentIssueDocumentOpenedAndChecked, setDocumentIssueDocumentOpenedAndChecked,
			documentIssueRecipientSigned, setDocumentIssueRecipientSigned,
			documentIssueClinicSigned, setDocumentIssueClinicSigned, documentIssueAttestationReady,
			documentIssueMissingSteps, documentIssueMissingGuidanceId,
			documentIssueSaving: Boolean(props.documentIssueSaving),
			setDocumentIssueConfirmationId, confirmDocumentIssue,
		},
		voidModalProps: {
			documentVoidConfirmation, documentLabels, documentStatusLabels, patientName,
			patients: dashboard?.patients, documentVoidReasonCode, setDocumentVoidReasonCode,
			normalizedDocumentVoidReasonCode, documentVoidReasonLabels, documentVoidStaffFullName,
			setDocumentVoidStaffFullName, activeDoctor, documentVoidStaffRole, setDocumentVoidStaffRole,
			documentVoidCorrectionDocumentId, setDocumentVoidCorrectionDocumentId,
			activeUsableDocuments: activeUsableDocuments as GeneratedDocument[],
			documentVoidReasonText, setDocumentVoidReasonText, documentVoidReplacementRequired,
			setDocumentVoidReplacementRequired, documentVoidPatientOrPayerNotified,
			setDocumentVoidPatientOrPayerNotified, documentVoidArchivePreserved,
			setDocumentVoidArchivePreserved, documentVoidStatusReviewed, setDocumentVoidStatusReviewed,
			documentVoidReady, documentVoidMissingSteps, documentVoidMissingGuidanceId,
			documentVoidSaving: Boolean(props.documentVoidSaving),
			setDocumentVoidConfirmationId, confirmDocumentVoid: handleConfirmDocumentVoid,
		},
		auditModalProps: {
			documentAuditFacts, documentLabels, documentStatusLabels, formatShortDate: safeFormatShortDate,
			documentSourceStatusClassNames, documentSourceStatusLabels, documentIssueSignatureModeLabels,
			documentVoidReasonLabels, loadDocumentAuditFacts, setDocumentAuditFacts,
			openIssuedDocumentHtml, downloadIssuedDocumentHtml, downloadIssuedDocumentPdf,
		},
		modalsContainerProps: {
			isPrimaryIntakeOpen, setIsPrimaryIntakeOpen, isSurgicalPackageOpen, setIsSurgicalPackageOpen,
			isClinicalVisitOpen, setIsClinicalVisitOpen, isTaxAccountingOpen, setIsTaxAccountingOpen,
			isSanpinRegistryOpen, setIsSanpinRegistryOpen, isAutoclaveLogOpen, setIsAutoclaveLogOpen,
			onOpenAutoclaveLog: () => setIsAutoclaveLogOpen(true),
			onOpenAutoclaveLog257: () => setIsAutoclaveLogOpen(true),
			isFnsNdflXmlOpen, setIsFnsNdflXmlOpen, isEgiszRemdOpen, setIsEgiszRemdOpen,
			isSickLeaveElnOpen, setIsSickLeaveElnOpen, isA4PrintPreviewOpen, setIsA4PrintPreviewOpen,
			isPatientConsentSignDrawerOpen, setIsPatientConsentSignDrawerOpen,
			activePatient, activeDoctor, clinicProfileDraft, typedActiveDocuments, createDocument,
			openIssuedDocumentHtml, setSelectedDocumentKind, taxDocumentYear, setTaxDocumentYear,
			typedTaxDocumentPayerOptions, selectedTaxDocumentPayerKey: props.selectedTaxDocumentPayerKey,
			setTaxDocumentPayerInn, egiszInitialPayload: props.egiszInitialPayload,
			requestDocumentIssue,
		},
	};
}
