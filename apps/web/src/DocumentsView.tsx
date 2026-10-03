import React, { useMemo, useState, useEffect } from "react";
import {
	type DocumentKind,
	type DocumentKindMetadata,
	type DocumentSourceStatus,
	type DocumentStatus,
	type GeneratedDocument,
	type Payment,
	documentKindMetadata as sharedDocumentKindMetadata,
	documentSourceStatusLabels as sharedDocumentSourceStatusLabels,
} from "@dental/shared";
import { FileCheck, FileText, Shield } from "lucide-react";
import {
	formatShortDate,
	money,
	normalizedDocumentIssueSignatureMode,
	normalizedDocumentKind,
	normalizedDocumentVoidReasonCode,
} from "./AppHelpers";
import {
	DocumentNavTabs,
	DOCUMENT_CATEGORY_KINDS,
	type DocumentCategoryTab,
} from "./components/documents/DocumentNavTabs";
import { type DocumentEdsFilter, type DocumentStatusFilter } from "./components/documents/DocumentRegistryFilterBar";
import {
	DEFAULT_VOID_REASON_TEXT,
	DEFAULT_VOID_STAFF_ROLE,
	DEFAULT_VOID_STAFF_NAME,
	executeDocumentVoidAutonomy,
	executeOpenLatestDocumentAutonomy,
} from "./components/documents/documentAutonomy";
import { useDocumentStore } from "./store/documentStore";
import { useAppLogicContext } from "./contexts/AppLogicContext";

// Modular Tabs and Modals
import { DocumentHeaderSection } from "./components/documents/tabs/DocumentHeaderSection";
import { DocumentFormSwitch } from "./components/documents/tabs/DocumentFormSwitch";
import { DocumentTemplatesCatalog } from "./components/documents/tabs/DocumentTemplatesCatalog";
import { DocumentIssueConfirmationModal } from "./components/documents/tabs/DocumentIssueConfirmationModal";
import { DocumentVoidConfirmationModal } from "./components/documents/tabs/DocumentVoidConfirmationModal";
import { DocumentAuditFactsModal } from "./components/documents/tabs/DocumentAuditFactsModal";
import { DocumentRegistryTab } from "./components/documents/tabs/DocumentRegistryTab";
import { DocumentModalsContainer } from "./components/documents/tabs/DocumentModalsContainer";
import "./styles/modules/documents.css";
import "./components/documents/documentNavigation.css";

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export type DocumentsViewProps = Record<string, any>;

export function DocumentsView(rawProps?: Partial<DocumentsViewProps>) {
	const logicContext = useAppLogicContext();
	const props = { ...logicContext, ...rawProps } as ReturnType<
		typeof useAppLogicContext
	> &
		DocumentsViewProps;

	const documentKindMetadata = sharedDocumentKindMetadata as Record<
		DocumentKind,
		DocumentKindMetadata
	>;
	const documentSourceStatusLabels = sharedDocumentSourceStatusLabels as Record<
		DocumentSourceStatus,
		string
	>;

	const {
		activeDoctor,
		activeDocuments,
		activePatient,
		activeUsableDocuments,
		clinicProfileDraft,
		confirmDocumentIssue,
		confirmDocumentVoid: rawConfirmDocumentVoid,
		createDocument,
		dashboard,
		documentActionLabels,
		documentIssueAttestationReady,
		documentIssueConfirmation,
		documentIssueSignatureModeLabels,
		documentLabels,
		documentSourceStatusClassNames,
		documentStatusLabels,
		documentVoidConfirmation,
		documentVoidReady,
		documentVoidReasonLabels,
		downloadIssuedDocumentHtml,
		downloadIssuedDocumentPdf,
		downloadTaxDocumentXml,
		formatDateTime,
		loadDocumentAuditFacts,
		openIssuedDocumentHtml,
		patientName,
		requestDocumentIssue,
		requestDocumentVoid,
		selectedEligibleTaxPayments,
		selectedPaymentReceiptPayments,
		structuredPayloadDocumentKinds,
		taxDocumentPayerOptions,
		updateDocumentStatus,
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

	const [activeCategoryTab, setActiveCategoryTab] =
		useState<DocumentCategoryTab>("all");
	const [registrySearchQuery, setRegistrySearchQuery] = useState("");
	const [registryStatusFilter, setRegistryStatusFilter] =
		useState<DocumentStatusFilter>("all");
	const [registryEdsFilter, setRegistryEdsFilter] =
		useState<DocumentEdsFilter>("all");
	const [registryKindFilter, setRegistryKindFilter] = useState<
		"all" | DocumentKind
	>("all");
	const [displayLimit, setDisplayLimit] = useState(40);
	const [openDocActionMenuId, setOpenDocActionMenuId] = useState<
		string | null
	>(null);

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

	const selectedDocumentCreateGuidanceId = "document-create-selected-guidance";
	const latestDocumentOpenGuidanceId = "document-open-latest-guidance";
	const documentIssueMissingGuidanceId = "document-issue-missing-guidance";
	const documentVoidMissingGuidanceId = "document-void-missing-guidance";

	// Redirect invalid hospital form 025/u to dental 043/u (Red-Team invariant)
	useEffect(() => {
		if ((selectedDocumentKind as string) === "outpatient_medical_card_025u") {
			setSelectedDocumentKind("dental_medical_card_043u");
		}
	}, [selectedDocumentKind, setSelectedDocumentKind]);

	const typedActiveDocuments = useMemo(
		() => (activeDocuments ?? []) as GeneratedDocument[],
		[activeDocuments],
	);

	const typedTaxDocumentPayerOptions = useMemo(
		() =>
			(taxDocumentPayerOptions ?? []) as Array<{
				key: string;
				inn: string;
				label: string;
				amountRub: number;
				paymentCount: number;
			}>,
		[taxDocumentPayerOptions],
	);


	const intakeKinds = DOCUMENT_CATEGORY_KINDS.intake;
	const clinicalKinds = DOCUMENT_CATEGORY_KINDS.clinical;
	const financeTaxKinds = DOCUMENT_CATEGORY_KINDS.finance_tax;
	const certificatesSanpinKinds = DOCUMENT_CATEGORY_KINDS.certificates_sanpin;

	const sanitizedDocumentFactoryGroups = useMemo(() => {
		const groups = (props.documentFactoryGroups ?? []) as Array<{
			title: string;
			kinds: DocumentKind[];
		}>;
		return groups.map((group) => ({
			...group,
			kinds: (group.kinds ?? []).filter(
				(kind) => (kind as string) !== "outpatient_medical_card_025u",
			),
		}));
	}, [props.documentFactoryGroups]);

	const isSelectedDocumentCreating =
		documentCreateSavingKind === selectedDocumentKind;

	const patientIssuedDocsCount = useMemo(
		() =>
			typedActiveDocuments.filter(
				(doc) => doc.status === "issued" && doc.patientId === activePatient?.id,
			).length,
		[typedActiveDocuments, activePatient?.id],
	);

	const patientDraftDocsCount = useMemo(
		() =>
			typedActiveDocuments.filter(
				(doc) => doc.status === "draft" && doc.patientId === activePatient?.id,
			).length,
		[typedActiveDocuments, activePatient?.id],
	);

	const handleOpenLatestDocument = () => {
		executeOpenLatestDocumentAutonomy({
			activeUsableDocuments: activeUsableDocuments as Array<{
				id: string;
				status?: string;
			}>,
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
			activeDoctor,
			documentVoidStaffFullName,
			setDocumentVoidStaffFullName,
			documentVoidStaffRole,
			setDocumentVoidStaffRole,
			setDocumentVoidArchivePreserved,
			setDocumentVoidStatusReviewed,
			documentVoidReasonText,
			setDocumentVoidReasonText,
			documentVoidReady,
			rawConfirmDocumentVoid,
			updateDocumentStatus,
			documentVoidConfirmation,
			documentVoidReasonCode,
			documentVoidCorrectionDocumentId,
			documentVoidReplacementRequired,
			documentVoidPatientOrPayerNotified,
			setDocumentVoidConfirmationId,
			setError: props.setError,
		});
	}

	const filteredActiveDocuments = useMemo(() => {
		let list = typedActiveDocuments;

		if (activeCategoryTab === "intake") {
			list = list.filter((doc) => intakeKinds.has(doc.kind));
		} else if (activeCategoryTab === "clinical") {
			list = list.filter((doc) => clinicalKinds.has(doc.kind));
		} else if (activeCategoryTab === "finance_tax") {
			list = list.filter((doc) => financeTaxKinds.has(doc.kind));
		} else if (activeCategoryTab === "certificates_sanpin") {
			list = list.filter((doc) => certificatesSanpinKinds.has(doc.kind));
		}

		if (registrySearchQuery.trim()) {
			const query = registrySearchQuery.toLowerCase().trim();
			list = list.filter(
				(doc) =>
					doc.title?.toLowerCase().includes(query) ||
					doc.kind?.toLowerCase().includes(query) ||
					(documentLabels?.[doc.kind] ?? "").toLowerCase().includes(query),
			);
		}
		if (registryStatusFilter !== "all") {
			list = list.filter((doc) => doc.status === registryStatusFilter);
		}
		if (registryEdsFilter !== "all") {
			list = list.filter((doc) => {
				const isSignedEds = Boolean(doc.doctorSignedAt || (doc as any).signedAt);
				const isSignedPaper = Boolean(doc.signatureAttestation && !isSignedEds);
				if (registryEdsFilter === "signed_eds") {
					return isSignedEds;
				}
				if (registryEdsFilter === "signed_paper") {
					return isSignedPaper;
				}
				if (registryEdsFilter === "unsigned") {
					return !isSignedEds && !isSignedPaper;
				}
				return true;
			});
		}
		if (registryKindFilter !== "all") {
			list = list.filter((doc) => doc.kind === registryKindFilter);
		}
		return list;
	}, [
		typedActiveDocuments,
		activeCategoryTab,
		intakeKinds,
		clinicalKinds,
		financeTaxKinds,
		certificatesSanpinKinds,
		registrySearchQuery,
		registryStatusFilter,
		registryEdsFilter,
		registryKindFilter,
		documentLabels,
	]);

	const availableRegistryKinds = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const doc of typedActiveDocuments) {
			counts[doc.kind] = (counts[doc.kind] ?? 0) + 1;
		}
		return (Object.keys(counts) as DocumentKind[]).map((kind) => ({
			key: kind,
			label: documentLabels?.[kind] ?? kind,
			count: counts[kind] ?? 0,
		}));
	}, [typedActiveDocuments, documentLabels]);

	const documentsSlice = useMemo(() => {
		const visible = filteredActiveDocuments.slice(0, displayLimit);
		return {
			visibleItems: visible,
			hasMore: visible.length < filteredActiveDocuments.length,
			remainingCount: Math.max(
				0,
				filteredActiveDocuments.length - visible.length,
			),
		};
	}, [filteredActiveDocuments, displayLimit]);

	const navCategoryCounts = useMemo(() => {
		return {
			all: typedActiveDocuments.length,
			intake: typedActiveDocuments.filter((d) => intakeKinds.has(d.kind)).length,
			clinical: typedActiveDocuments.filter((d) => clinicalKinds.has(d.kind)).length,
			finance_tax: typedActiveDocuments.filter((d) => financeTaxKinds.has(d.kind)).length,
			certificates_sanpin: typedActiveDocuments.filter((d) => certificatesSanpinKinds.has(d.kind)).length,
		};
	}, [typedActiveDocuments, intakeKinds, clinicalKinds, financeTaxKinds, certificatesSanpinKinds]);

	const documentIssueMissingSteps = [
		!String(documentIssueSignedAt || "").trim()
			? "укажите дату и время подписи"
			: null,
		!String(documentIssueRecipientFullName || "").trim()
			? "укажите получателя"
			: null,
		!String(documentIssueRecipientRole || "").trim()
			? "укажите статус получателя"
			: null,
	].filter(Boolean) as string[];

	const documentVoidMissingSteps = [
		!documentVoidArchivePreserved
			? "подтвердите сохранение архивной копии"
			: null,
		!documentVoidPatientOrPayerNotified
			? "подтвердите уведомление пациента/плательщика"
			: null,
		!documentVoidStatusReviewed
			? "подтвердите проверку последствий аннулирования"
			: null,
		!String(documentVoidStaffFullName || "").trim()
			? "укажите ответственного сотрудника"
			: null,
		!String(documentVoidStaffRole || "").trim()
			? "укажите должность сотрудника"
			: null,
	].filter(Boolean) as string[];

	return (
		<div className="panel documents-panel" id="documents">
			<DocumentHeaderSection
				activePatient={activePatient}
				activeDoctor={activeDoctor}
				clinicProfileDraft={clinicProfileDraft}
				typedActiveDocuments={typedActiveDocuments}
				patientIssuedDocsCount={patientIssuedDocsCount}
				patientDraftDocsCount={patientDraftDocsCount}
				activeUsableDocuments={activeUsableDocuments}
				latestDocumentOpenGuidanceId={latestDocumentOpenGuidanceId}
				handleOpenLatestDocument={handleOpenLatestDocument}
				setIsAutoclaveLogOpen={setIsAutoclaveLogOpen}
				handleDirectPrintPrimaryIntake={handleDirectPrintPrimaryIntake}
				setIsPrimaryIntakeOpen={setIsPrimaryIntakeOpen}
				setIsSurgicalPackageOpen={setIsSurgicalPackageOpen}
				setIsClinicalVisitOpen={setIsClinicalVisitOpen}
				setIsTaxAccountingOpen={setIsTaxAccountingOpen}
				setIsSanpinRegistryOpen={setIsSanpinRegistryOpen}
				setIsA4PrintPreviewOpen={setIsA4PrintPreviewOpen}
				onSelectDocumentKind={setSelectedDocumentKind}
			/>

			{/* 3. НАВИГАЦИОННЫЕ ВКЛАДКИ ПО КАТЕГОРИЯМ */}
			<DocumentNavTabs
				activeTab={activeCategoryTab}
				onSelectTab={(tab) => {
					setActiveCategoryTab(tab);
					if (tab === "intake") {
						setSelectedDocumentKind("paid_medical_services_contract");
					} else if (tab === "clinical") {
						setSelectedDocumentKind("dental_medical_card_043u");
					} else if (tab === "finance_tax") {
						setSelectedDocumentKind("tax_deduction_certificate");
					} else if (tab === "certificates_sanpin") {
						setSelectedDocumentKind("radiation_dose_sheet");
					}
				}}
				counts={navCategoryCounts}
			/>

			{activeCategoryTab === "certificates_sanpin" && (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						background: "var(--paper-strong, #f8fafc)",
						border: "1px solid var(--line, #e2e8f0)",
						borderRadius: "8px",
						padding: "10px 14px",
						gap: "12px",
						margin: "8px 0",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<Shield size={20} style={{ color: "var(--teal, #0d9488)", flexShrink: 0 }} />
						<span style={{ fontSize: "13px", color: "var(--ink, #0f172a)" }}>
							<strong>Стерилизация:</strong> Журнал контроля работы стерилизаторов и ПСО для проверок Роспотребнадзора.
						</span>
					</div>
					<button
						type="button"
						className="primary-button"
						style={{
							minHeight: "36px",
							background: "var(--teal, #0d9488)",
							whiteSpace: "nowrap",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
						}}
						onClick={() => setIsAutoclaveLogOpen(true)}
						data-testid="documents-open-autoclave-log-257-btn"
					>
						<FileCheck size={16} />
						<span>Журнал контроля стерилизации</span>
					</button>
				</div>
			)}

			{!activeUsableDocuments?.[0] ? (
				<p
					className="document-open-guidance"
					id={latestDocumentOpenGuidanceId}
					role="status"
					aria-live="polite"
				>
					Последних документов пока нет. Выберите форму ниже и создайте документ
					для пациента.
				</p>
			) : null}

			{/* 4. ФАБРИКА ДОКУМЕНТОВ И АКТИВНАЯ ФОРМА */}
			<section className="document-factory" aria-label="Быстро создать документ">
				<div className="document-factory-toolbar document-factory-selected-kind">
					<div className="document-factory-select-container">
						<label htmlFor="document-kind-selector" className="document-factory-select-label">
							Шаблон документа:
						</label>
						<select
							id="document-kind-selector"
							className="document-factory-select"
							value={selectedDocumentKind}
							onChange={(event) =>
								setSelectedDocumentKind(
									normalizedDocumentKind(event.target.value),
								)
							}
							data-testid="select-document-kind"
						>
							{(sanitizedDocumentFactoryGroups ?? []).map((group) => (
								<optgroup key={group.title} label={group.title}>
									{(group?.kinds ?? []).map((kind) => (
										<option key={kind} value={kind}>
											{documentLabels?.[kind] ?? kind}
										</option>
									))}
								</optgroup>
							))}
						</select>
					</div>

					<div className="document-factory-actions">
						<button
							className="primary-button document-factory-create-btn"
							type="button"
							disabled={Boolean(documentCreateSavingKind)}
							aria-busy={isSelectedDocumentCreating || undefined}
							aria-describedby={selectedDocumentCreateGuidanceId}
							onClick={() => void createDocument(selectedDocumentKind)}
							data-testid="btn-create-selected-document"
						>
							<FileText size={15} aria-hidden="true" />
							<span>
								{isSelectedDocumentCreating
									? "Создаю..."
									: "Создать выбранный документ"}
							</span>
						</button>
					</div>
				</div>

				<DocumentFormSwitch {...props} selectedDocumentKind={selectedDocumentKind} />

				{/* 5. КАТАЛОГ ШАБЛОНОВ ДОКУМЕНТОВ */}
				<DocumentTemplatesCatalog
					sanitizedDocumentFactoryGroups={sanitizedDocumentFactoryGroups}
					documentKindMetadata={documentKindMetadata}
					documentCreateSavingKind={documentCreateSavingKind}
					setSelectedDocumentKind={setSelectedDocumentKind}
					structuredPayloadDocumentKinds={structuredPayloadDocumentKinds}
					createDocument={createDocument}
					documentLabels={documentLabels}
					documentSourceStatusClassNames={documentSourceStatusClassNames}
					documentSourceStatusLabels={documentSourceStatusLabels}
				/>
			</section>

			{/* 6. МОДАЛКА ВЫДАЧИ ДОКУМЕНТА */}
			<DocumentIssueConfirmationModal
				documentIssueConfirmation={documentIssueConfirmation}
				documentLabels={documentLabels}
				patientName={patientName}
				patients={dashboard?.patients}
				money={money}
				documentIssueSignatureMode={documentIssueSignatureMode}
				setDocumentIssueSignatureMode={setDocumentIssueSignatureMode}
				normalizedDocumentIssueSignatureMode={normalizedDocumentIssueSignatureMode}
				documentIssueSignatureModeLabels={documentIssueSignatureModeLabels}
				documentIssueSignedAt={documentIssueSignedAt}
				setDocumentIssueSignedAt={setDocumentIssueSignedAt}
				documentIssueRecipientFullName={documentIssueRecipientFullName}
				setDocumentIssueRecipientFullName={setDocumentIssueRecipientFullName}
				documentIssueRecipientRole={documentIssueRecipientRole}
				setDocumentIssueRecipientRole={setDocumentIssueRecipientRole}
				documentIssueStaffFullName={documentIssueStaffFullName}
				setDocumentIssueStaffFullName={setDocumentIssueStaffFullName}
				documentIssueStaffRole={documentIssueStaffRole}
				setDocumentIssueStaffRole={setDocumentIssueStaffRole}
				documentIssueNote={documentIssueNote}
				setDocumentIssueNote={setDocumentIssueNote}
				activeDoctor={activeDoctor}
				documentIssueIdentityChecked={documentIssueIdentityChecked}
				setDocumentIssueIdentityChecked={setDocumentIssueIdentityChecked}
				documentIssueDocumentOpenedAndChecked={documentIssueDocumentOpenedAndChecked}
				setDocumentIssueDocumentOpenedAndChecked={setDocumentIssueDocumentOpenedAndChecked}
				documentIssueRecipientSigned={documentIssueRecipientSigned}
				setDocumentIssueRecipientSigned={setDocumentIssueRecipientSigned}
				documentIssueClinicSigned={documentIssueClinicSigned}
				setDocumentIssueClinicSigned={setDocumentIssueClinicSigned}
				documentIssueAttestationReady={documentIssueAttestationReady}
				documentIssueMissingSteps={documentIssueMissingSteps}
				documentIssueMissingGuidanceId={documentIssueMissingGuidanceId}
				documentIssueSaving={Boolean(props.documentIssueSaving)}
				setDocumentIssueConfirmationId={setDocumentIssueConfirmationId}
				confirmDocumentIssue={confirmDocumentIssue}
			/>

			{/* 7. МОДАЛКА АННУЛИРОВАНИЯ ДОКУМЕНТА */}
			<DocumentVoidConfirmationModal
				documentVoidConfirmation={documentVoidConfirmation}
				documentLabels={documentLabels}
				documentStatusLabels={documentStatusLabels}
				patientName={patientName}
				patients={dashboard?.patients}
				documentVoidReasonCode={documentVoidReasonCode}
				setDocumentVoidReasonCode={setDocumentVoidReasonCode}
				normalizedDocumentVoidReasonCode={normalizedDocumentVoidReasonCode}
				documentVoidReasonLabels={documentVoidReasonLabels}
				documentVoidStaffFullName={documentVoidStaffFullName}
				setDocumentVoidStaffFullName={setDocumentVoidStaffFullName}
				activeDoctor={activeDoctor}
				documentVoidStaffRole={documentVoidStaffRole}
				setDocumentVoidStaffRole={setDocumentVoidStaffRole}
				documentVoidCorrectionDocumentId={documentVoidCorrectionDocumentId}
				setDocumentVoidCorrectionDocumentId={setDocumentVoidCorrectionDocumentId}
				activeUsableDocuments={activeUsableDocuments as GeneratedDocument[]}
				documentVoidReasonText={documentVoidReasonText}
				setDocumentVoidReasonText={setDocumentVoidReasonText}
				documentVoidReplacementRequired={documentVoidReplacementRequired}
				setDocumentVoidReplacementRequired={setDocumentVoidReplacementRequired}
				documentVoidPatientOrPayerNotified={documentVoidPatientOrPayerNotified}
				setDocumentVoidPatientOrPayerNotified={setDocumentVoidPatientOrPayerNotified}
				documentVoidArchivePreserved={documentVoidArchivePreserved}
				setDocumentVoidArchivePreserved={setDocumentVoidArchivePreserved}
				documentVoidStatusReviewed={documentVoidStatusReviewed}
				setDocumentVoidStatusReviewed={setDocumentVoidStatusReviewed}
				documentVoidReady={documentVoidReady}
				documentVoidMissingSteps={documentVoidMissingSteps}
				documentVoidMissingGuidanceId={documentVoidMissingGuidanceId}
				documentVoidSaving={Boolean(props.documentVoidSaving)}
				setDocumentVoidConfirmationId={setDocumentVoidConfirmationId}
				confirmDocumentVoid={handleConfirmDocumentVoid}
			/>

			{/* 8. МОДАЛКА ПАСПОРТА ВЫДАЧИ И АУДИТА */}
			<DocumentAuditFactsModal
				documentAuditFacts={documentAuditFacts}
				documentLabels={documentLabels}
				documentStatusLabels={documentStatusLabels}
				formatShortDate={(d) => (d ? formatShortDate(d) : "")}
				documentSourceStatusClassNames={documentSourceStatusClassNames}
				documentSourceStatusLabels={documentSourceStatusLabels}
				documentIssueSignatureModeLabels={documentIssueSignatureModeLabels}
				documentVoidReasonLabels={documentVoidReasonLabels}
				loadDocumentAuditFacts={loadDocumentAuditFacts}
				setDocumentAuditFacts={setDocumentAuditFacts}
				openIssuedDocumentHtml={openIssuedDocumentHtml}
				downloadIssuedDocumentHtml={downloadIssuedDocumentHtml}
				downloadIssuedDocumentPdf={downloadIssuedDocumentPdf}
			/>

			{/* 9. РЕЕСТР ДОКУМЕНТОВ И СМАРТ-ФИЛЬТРЫ */}
			<DocumentRegistryTab
				activeCategoryTab={activeCategoryTab}
				registrySearchQuery={registrySearchQuery}
				setRegistrySearchQuery={setRegistrySearchQuery}
				registryStatusFilter={registryStatusFilter}
				setRegistryStatusFilter={setRegistryStatusFilter}
				registryEdsFilter={registryEdsFilter}
				setRegistryEdsFilter={setRegistryEdsFilter}
				registryKindFilter={registryKindFilter}
				setRegistryKindFilter={setRegistryKindFilter}
				typedActiveDocuments={typedActiveDocuments}
				filteredActiveDocuments={filteredActiveDocuments}
				availableRegistryKinds={availableRegistryKinds}
				setActiveCategoryTab={setActiveCategoryTab}
				documentsSlice={documentsSlice}
				setDisplayLimit={setDisplayLimit}
				documentActionLabels={documentActionLabels}
				documentLabels={documentLabels}
				documentKindMetadata={documentKindMetadata}
				documentStatusLabels={documentStatusLabels}
				documentSourceStatusClassNames={documentSourceStatusClassNames}
				documentSourceStatusLabels={documentSourceStatusLabels}
				documentAuditFactsLoadingId={documentAuditFactsLoadingId}
				documentStatusSavingId={documentStatusSavingId}
				formatShortDate={(d) => (d ? formatShortDate(d) : "")}
				money={money}
				requestDocumentIssue={requestDocumentIssue}
				downloadIssuedDocumentPdf={downloadIssuedDocumentPdf}
				openIssuedDocumentHtml={openIssuedDocumentHtml}
				openDocActionMenuId={openDocActionMenuId}
				setOpenDocActionMenuId={setOpenDocActionMenuId}
				loadDocumentAuditFacts={loadDocumentAuditFacts}
				downloadIssuedDocumentHtml={downloadIssuedDocumentHtml}
				downloadTaxDocumentXml={downloadTaxDocumentXml}
				setIsFnsNdflXmlOpen={setIsFnsNdflXmlOpen}
				setIsEgiszRemdOpen={setIsEgiszRemdOpen}
				requestDocumentVoid={requestDocumentVoid}
			/>

			{/* 10. ПАКЕТНЫЕ МОДАЛКИ (ПЕРВИЧНЫЙ, ХИРУРГИЧЕСКИЙ, ТАКС, САНПИН, СЭМД, ЭЛН) */}
			<DocumentModalsContainer
				isPrimaryIntakeOpen={isPrimaryIntakeOpen}
				setIsPrimaryIntakeOpen={setIsPrimaryIntakeOpen}
				isSurgicalPackageOpen={isSurgicalPackageOpen}
				setIsSurgicalPackageOpen={setIsSurgicalPackageOpen}
				isClinicalVisitOpen={isClinicalVisitOpen}
				setIsClinicalVisitOpen={setIsClinicalVisitOpen}
				isTaxAccountingOpen={isTaxAccountingOpen}
				setIsTaxAccountingOpen={setIsTaxAccountingOpen}
				isSanpinRegistryOpen={isSanpinRegistryOpen}
				setIsSanpinRegistryOpen={setIsSanpinRegistryOpen}
				isAutoclaveLogOpen={isAutoclaveLogOpen}
				setIsAutoclaveLogOpen={setIsAutoclaveLogOpen}
				onOpenAutoclaveLog257={() => setIsAutoclaveLogOpen(true)}
				isFnsNdflXmlOpen={isFnsNdflXmlOpen}
				setIsFnsNdflXmlOpen={setIsFnsNdflXmlOpen}
				isEgiszRemdOpen={isEgiszRemdOpen}
				setIsEgiszRemdOpen={setIsEgiszRemdOpen}
				isSickLeaveElnOpen={isSickLeaveElnOpen}
				setIsSickLeaveElnOpen={setIsSickLeaveElnOpen}
				isA4PrintPreviewOpen={isA4PrintPreviewOpen}
				setIsA4PrintPreviewOpen={setIsA4PrintPreviewOpen}
				activePatient={activePatient}
				activeDoctor={activeDoctor}
				clinicProfileDraft={clinicProfileDraft}
				typedActiveDocuments={typedActiveDocuments}
				createDocument={createDocument}
				openIssuedDocumentHtml={openIssuedDocumentHtml}
				setSelectedDocumentKind={setSelectedDocumentKind}
				taxDocumentYear={taxDocumentYear}
				setTaxDocumentYear={setTaxDocumentYear}
				typedTaxDocumentPayerOptions={typedTaxDocumentPayerOptions}
				selectedTaxDocumentPayerKey={props.selectedTaxDocumentPayerKey}
				setTaxDocumentPayerInn={setTaxDocumentPayerInn}
				egiszInitialPayload={props.egiszInitialPayload}
			/>
		</div>
	);
}

export {
	DEFAULT_VOID_REASON_TEXT,
	DEFAULT_VOID_STAFF_NAME,
	DEFAULT_VOID_STAFF_ROLE,
	executeDocumentVoidAutonomy,
	executeOpenLatestDocumentAutonomy,
} from "./components/documents/documentAutonomy";
export { DocumentsOutpatientArchive } from "./components/documents/DocumentsOutpatientArchive";
export default DocumentsView;
